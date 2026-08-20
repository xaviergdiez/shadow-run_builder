import { readData, writeData, charKey } from "../lib/storage.js";
import { requireUser } from "../lib/auth.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const uid = await requireUser(req, res);
  if (!uid) return;
  const key = charKey(uid, req.query.c, "state");
  if (!key) return res.status(400).json({ error: "invalid_character" });

  if (req.method === "GET") {
    const state = await readData(key);
    return res.status(200).json(state);
  }

  if (req.method === "PUT") {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ error: "invalid_body" });
    }
    try {
      await writeData(key, body);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[state] write failed:", err?.message);
      return res.status(500).json({ error: "save_failed" });
    }
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).end();
}
