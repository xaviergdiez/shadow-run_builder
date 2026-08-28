import sharp from "sharp";
import { writeAvatar, charKey } from "../lib/storage.js";
import { requireUser } from "../lib/auth.js";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// The sheet's Description column is already a hand-written image prompt, so it
// is sent as-is and only framed. Runners built in the app have no such column,
// and get a prompt assembled from what the builder does know.
function buildPrompt(identity, keywords) {
  const framing =
    "Portrait orientation, face and upper body prominent in the top half. " +
    "Shadowrun 2080s cyberpunk, rain-slick neon sprawl, cinematic lighting, photorealistic digital art.";

  if (identity.avatarPrompt?.trim()) {
    return `${identity.avatarPrompt.trim()} ${framing}`;
  }

  const who = [identity.metatype, identity.concept].filter(Boolean).join(", ");
  const tags = (keywords ?? []).filter(Boolean).slice(0, 6).join(", ");
  return [
    `Full body character portrait of ${identity.streetName || "a shadowrunner"}`,
    who && `, ${who}`,
    tags && `. ${tags}.`,
    ` ${framing}`,
  ]
    .filter(Boolean)
    .join("");
}

async function callGeminiImage(prompt, apiKey) {
  const url = `${GEMINI_BASE}/gemini-3.1-flash-image:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini Image API ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const imgPart = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!imgPart) throw new Error("No image data in Gemini response");

  return Buffer.from(imgPart.inlineData.data, "base64");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const uid = await requireUser(req, res);
  if (!uid) return;

  const cid = req.body?.c;
  const key = charKey(uid, cid, "avatar");
  if (!key) return res.status(400).json({ error: "invalid_character" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });

  const identity = req.body?.identity ?? {};

  try {
    // ponytail: no credit metering. The D&D build gated this behind Stripe
    // credits; this build has no Stripe, and the endpoint is already behind
    // sign-in. Re-add a per-uid counter if the Gemini bill ever shows up.
    const raw = await callGeminiImage(buildPrompt(identity, req.body?.keywords), apiKey);

    // Load-bearing, and not for the reason it looks: Gemini already returns a
    // 768-wide portrait JPEG, so the resize is a no-op. It is the re-encode
    // that matters — measured 911KB in, 213KB out, which is 1187KB vs 277KB
    // base64 against Upstash's 1MB request cap. Without it, every save fails.
    const jpeg = await sharp(raw).resize({ width: 768 }).jpeg({ quality: 82 }).toBuffer();
    await writeAvatar(key, "image/jpeg", jpeg);

    // Version is returned rather than generated client-side so the URL only
    // changes when an image actually landed.
    return res.status(200).json({ ok: true, v: Date.now() });
  } catch (err) {
    console.error("generate-avatar error:", err);
    return res.status(500).json({ error: err.message });
  }
}
