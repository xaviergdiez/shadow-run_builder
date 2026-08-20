import crypto from "node:crypto";
import { charKey, deleteData, redis } from "../lib/storage.js";
import { requireUser, getUser, saveUser, randomToken } from "../lib/auth.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const uid = await requireUser(req, res);
  if (!uid) return;

  const user = (await getUser(uid)) ?? { chars: [] };
  user.chars ??= [];

  if (req.method === "GET") {
    return res.status(200).json({ chars: user.chars });
  }

  // POST ?c=<cid>&sync=1 → mint (or return) a sheet-sync token for that character
  if (req.method === "POST" && req.query.sync) {
    const entry = user.chars.find((ch) => ch.id === req.query.c);
    if (!entry) return res.status(404).json({ error: "unknown_character" });
    if (!entry.syncToken) {
      entry.syncToken = randomToken();
      await redis.set(`synctoken:${entry.syncToken}`, { uid, cid: entry.id });
      await saveUser(uid, user);
    }
    return res.status(200).json({ token: entry.syncToken });
  }

  if (req.method === "POST") {
    const name = String(req.body?.name ?? "").trim().slice(0, 60);
    if (!name) return res.status(400).json({ error: "name_required" });
    const id = crypto.randomUUID();
    user.chars.push({ id, name });
    await saveUser(uid, user);
    // No char keys written — a blank character is just an absent state key;
    // the client seeds defaults on first load.
    return res.status(200).json({ id, name });
  }

  if (req.method === "DELETE") {
    const cid = req.query.c;
    const entry = user.chars.find((ch) => ch.id === cid);
    if (!entry) return res.status(404).json({ error: "unknown_character" });
    user.chars = user.chars.filter((ch) => ch.id !== cid);
    await saveUser(uid, user);
    const keys = ["state", "config", "spelldb", "avatar"].map((p) => charKey(uid, cid, p));
    if (entry.syncToken) await redis.del(`synctoken:${entry.syncToken}`);
    await deleteData(...keys);
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).end();
}
