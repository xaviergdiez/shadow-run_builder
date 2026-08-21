import { readAvatar, charKey } from "../lib/storage.js";
import { requireUser } from "../lib/auth.js";

export default async function handler(req, res) {
  const uid = await requireUser(req, res);
  if (!uid) return;
  const key = charKey(uid, req.query.c, "avatar");
  if (!key) return res.status(400).json({ error: "invalid_character" });

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
