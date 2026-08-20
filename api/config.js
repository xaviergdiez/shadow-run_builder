import { readData, charKey } from "../lib/storage.js";
import { requireUser } from "../lib/auth.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  const uid = await requireUser(req, res);
  if (!uid) return;
  const configKey = charKey(uid, req.query.c, "config");
  if (!configKey) return res.status(400).json({ error: "invalid_character" });

  const [config, spelldb] = await Promise.all([
    readData(configKey),
    readData(charKey(uid, req.query.c, "spelldb")),
  ]);
  const out = Array.isArray(spelldb) && spelldb.length ? { ...config, spellDatabase: spelldb } : config;
  return res.status(200).json(out);
}
