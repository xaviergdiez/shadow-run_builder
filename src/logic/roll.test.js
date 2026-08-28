// node src/logic/roll.test.js
import assert from "node:assert/strict";
import { resolveRoll, riskDiceFor, glitchFor, rollDice } from "./roll.js";

// A scripted rng: returns faces in order, so assertions are on exact dice.
const scripted = (faces) => {
  let i = 0;
  return () => (faces[i++] - 1) / 6 + 0.001;
};

// ── Hit threshold is per roll ────────────────────────────────────────────────
{
  const faces = [6, 5, 4, 3, 2, 1];
  assert.equal(resolveRoll({ pool: 6, target: 5 }, scripted(faces)).hits, 2, "5+ counts 6,5");
  assert.equal(resolveRoll({ pool: 6, target: 4 }, scripted(faces)).hits, 3, "4+ counts 6,5,4");
  assert.equal(resolveRoll({ pool: 6, target: 6 }, scripted(faces)).hits, 1, "6 only counts 6");
}

// ── RR subtracts from the 1s, and drives the glitch ──────────────────────────
{
  // 4 pool dice then 4 risk dice: three 1s among the risk dice.
  const faces = [6, 6, 2, 2, 1, 1, 1, 5];
  const base = { pool: 4, target: 5, riskDice: 4 };

  const r0 = resolveRoll({ ...base, rr: 0 }, scripted(faces));
  assert.equal(r0.poolHits, 2);
  assert.equal(r0.riskHits, 1, "the 5 among the risk dice is still a hit");
  assert.equal(r0.hits, 3);
  assert.equal(r0.ones, 3);
  assert.equal(r0.remainingOnes, 3);
  assert.equal(r0.glitch.id, "disaster");

  assert.equal(resolveRoll({ ...base, rr: 1 }, scripted(faces)).glitch.id, "critical");
  assert.equal(resolveRoll({ ...base, rr: 2 }, scripted(faces)).glitch.id, "minor");
  assert.equal(resolveRoll({ ...base, rr: 3 }, scripted(faces)).glitch.id, "none");
  assert.equal(resolveRoll({ ...base, rr: 9 }, scripted(faces)).remainingOnes, 0, "RR never goes negative");
}

// ── 1s in the pool never glitch ──────────────────────────────────────────────
{
  const r = resolveRoll({ pool: 4, target: 5, riskDice: 0 }, scripted([1, 1, 1, 1]));
  assert.equal(r.ones, 0, "glitches come from risk dice only");
  assert.equal(r.glitch.id, "none");
}

// ── The p.70 grid ────────────────────────────────────────────────────────────
{
  assert.deepEqual(riskDiceFor(0, "low"), { dice: 1, openEnded: false, available: true });
  assert.deepEqual(riskDiceFor(3, "high"), { dice: 15, openEnded: false, available: true });
  assert.equal(riskDiceFor(0, "extreme").dice, 6);
  assert.equal(riskDiceFor(0, "extreme").openEnded, true, "'6+ dice' is a floor");
  assert.equal(riskDiceFor(3, "extreme").available, false, "RR 3 / Extreme is N/A");
  assert.equal(riskDiceFor(0, "none").dice, 0);
  assert.equal(riskDiceFor(99, "low").dice, 8, "RR clamps to the table's last row");
}

// ── Dice are in range ────────────────────────────────────────────────────────
{
  const rolls = rollDice(2000);
  assert.equal(rolls.length, 2000);
  assert.ok(rolls.every((d) => Number.isInteger(d) && d >= 1 && d <= 6), "every die is 1-6");
  assert.equal(new Set(rolls).size, 6, "all six faces appear");
  assert.deepEqual(rollDice(-3), [], "a negative count is not an error");
}

assert.equal(glitchFor(0).id, "none");
assert.equal(glitchFor(7).id, "disaster");

console.log("roll: all assertions passed");
