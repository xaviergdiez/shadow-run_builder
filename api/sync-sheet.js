import { readData, writeData, charKey, redis, NS } from "../lib/storage.js";
import { rowToCharacter } from "../src/logic/importSheet.js";

// The Apps Script posts one runner: { row: { Name: "...", Skills: "...", ... } }.
// One tab, one row, one character — so this endpoint never has to decide which
// of several rows it was handed.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  // Per-character sync token minted in the app (runner list → Sheet sync).
  const bearer = (req.headers["authorization"] ?? "").replace(/^Bearer /, "");
  const grant = bearer ? await redis.get(`${NS}synctoken:${bearer}`) : null;
  if (!grant?.uid || !grant?.cid) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const stateKey = charKey(grant.uid, grant.cid, "state");
  if (!stateKey) return res.status(400).json({ error: "invalid_character" });

  const row = req.body?.row;
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return res.status(400).json({ error: "invalid_body", detail: "expected { row: {...} }" });
  }

  try {
    const { state, unmapped } = rowToCharacter(row);

    // Merge over what is already stored: the sheet has no column for tier,
    // budget, or activeStep, and a sync must not reset them.
    const existing = await readData(stateKey);
    await writeData(stateKey, { ...existing, ...state });

    return res.status(200).json({
      ok: true,
      updatedAt: new Date().toISOString(),
      name: state.identity.streetName,
      unmapped,
    });
  } catch (err) {
    console.error("sync-sheet error:", err?.message ?? err);
    return res.status(500).json({ error: "sync_failed", detail: err?.message ?? String(err) });
  }
}
