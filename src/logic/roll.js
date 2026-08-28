// Rolling a Test.
//
// Two things here are inputs rather than constants, because the book makes them
// so: the hit threshold is set per roll by the GM's difficulty call, and Risk
// Reduction subtracts from the 1s you rolled ("remaining 1s", p.70) rather than
// being baked into the pool.
//
// Nothing here decides whether risk dice contribute hits — the pool and risk
// halves are counted separately and both are returned, so the table can read
// whichever total its reading of p.70 calls for. Combining them here would bury
// a rules judgement inside arithmetic.

import { RISK_TABLE, GLITCH_LEGEND } from "../data/rules.js";

export { GLITCH_LEGEND };

export const RISK_LEVELS = [
  { id: "none", name: "No risk" },
  { id: "low", name: "Low" },
  { id: "normal", name: "Normal" },
  { id: "high", name: "High" },
  { id: "extreme", name: "Extreme" },
];

// "6+ dice" and "10+ dice" are open-ended in the book; the number is the floor
// the GM starts from. N/A means the combination is not offered at all.
export function riskDiceFor(rr, level) {
  if (level === "none") return { dice: 0, openEnded: false, available: true };
  const row = RISK_TABLE.find((r) => r.rr === Math.max(0, Math.min(3, rr)));
  const cell = row?.[level];
  if (!cell || cell === "N/A") return { dice: 0, openEnded: false, available: false };
  return {
    dice: parseInt(cell, 10) || 0,
    openEnded: cell.includes("+"),
    available: true,
  };
}

export const GLITCHES = [
  { at: 0, id: "none", name: "No effect" },
  { at: 1, id: "minor", name: "Minor glitch" },
  { at: 2, id: "critical", name: "Critical glitch" },
  { at: 3, id: "disaster", name: "Disaster" },
];

export const glitchFor = (remainingOnes) =>
  GLITCHES[Math.min(Math.max(0, remainingOnes), 3)];

const d6 = (rng) => Math.floor(rng() * 6) + 1;

export function rollDice(count, rng = Math.random) {
  return Array.from({ length: Math.max(0, count) }, () => d6(rng));
}

// `rng` is injectable so the test can assert on a known sequence rather than
// on a distribution.
export function resolveRoll({ pool = 0, target = 5, riskDice = 0, rr = 0 }, rng = Math.random) {
  const poolRolls = rollDice(pool, rng);
  const riskRolls = rollDice(riskDice, rng);

  const hit = (d) => d >= target;
  const poolHits = poolRolls.filter(hit).length;
  const riskHits = riskRolls.filter(hit).length;

  // 1s are read off the risk dice only. The pool is not where glitches come
  // from — that is the whole point of accepting risk.
  const ones = riskRolls.filter((d) => d === 1).length;
  const remainingOnes = Math.max(0, ones - Math.max(0, rr));

  return {
    poolRolls,
    riskRolls,
    target,
    poolHits,
    riskHits,
    hits: poolHits + riskHits,
    ones,
    rr,
    remainingOnes,
    glitch: glitchFor(remainingOnes),
  };
}
