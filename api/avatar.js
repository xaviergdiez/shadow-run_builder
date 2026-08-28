import { readAvatar, writeAvatar, charKey } from "../lib/storage.js";
import { requireUser } from "../lib/auth.js";

// Upstash caps a request at 1MB; the client downscales before sending, so this
// only guards against a hand-rolled request.
const MAX_B64 = 900_000;

export default async function handler(req, res) {
  const uid = await requireUser(req, res);
  if (!uid) return;
  const cid = req.method === "POST" ? req.body?.c : req.query.c;
  const key = charKey(uid, cid, "avatar");
  if (!key) return res.status(400).json({ error: "invalid_character" });

  // Upload your own portrait instead of generating one. Same storage key, so
  // whichever ran last is the one the sheet shows.
  if (req.method === "POST") {
    const { mimeType, b64 } = req.body ?? {};
    if (typeof b64 !== "string" || !b64) {
      return res.status(400).json({ error: "missing_image" });
    }
    if (!/^image\/(jpeg|png|webp)$/.test(mimeType ?? "")) {
      return res.status(400).json({ error: "unsupported_type" });
    }
    if (b64.length > MAX_B64) {
      return res.status(413).json({ error: "image_too_large" });
    }
    try {
      await writeAvatar(key, mimeType, Buffer.from(b64, "base64"));
    } catch (err) {
      console.error("[avatar] upload failed:", err?.message);
      return res.status(500).json({ error: "save_failed" });
    }
    // Same { v } contract as generate-avatar: the client stores one number and
    // builds the URL from it, whichever way the image got here.
    return res.status(200).json({ ok: true, v: Date.now() });
  }

  if (req.method === "GET") {
    try {
      const avatar = await readAvatar(key);
      if (!avatar) return res.status(404).end();
      res.setHeader("Content-Type", avatar.contentType);
      res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
      return res.send(avatar.buffer);
    } catch {
      return res.status(404).end();
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).end();
}
