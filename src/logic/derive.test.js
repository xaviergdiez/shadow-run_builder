// node src/logic/derive.test.js
import assert from "node:assert/strict";
import { riskReductions, armorRating } from "./derive.js";

const amp = (name, effects, extra = {}) => ({ name, effects, ...extra });

// ── The three parse failures the catalog audit turned up ─────────────────────
{
  // A trailing clause after the specialization used to swallow the whole match,
  // so this book-printed RR never reached the sheet.
  assert.deepEqual(riskReductions([amp("Fly-Spy", "RR 1 to Perception (physical) on overwatch. Passes for traffic.")]), [
    { rr: 1, skill: "Perception", specialization: "physical", from: "Fly-Spy" },
  ]);

  assert.deepEqual(riskReductions([amp("Manabolt", "Manabolt, plus RR 1 to Sorcery (combat spells) when casting it.")]), [
    { rr: 1, skill: "Sorcery", specialization: "combat spells", from: "Manabolt" },
  ]);

  // "up to RR 3 (p.71)" is prose about stacking, not a second grant. It used to
  // produce a phantom entry with an empty skill name.
  const focus = riskReductions([amp("Summoning Focus", "RR 1 to Conjuring tests. Stacks with a mentor spirit up to RR 3 (p.71).")]);
  assert.equal(focus.length, 1);
  assert.equal(focus[0].skill, "Conjuring");
  assert.equal(focus[0].specialization, null);
}

// ── Vague targets yield nothing rather than junk ─────────────────────────────
{
  assert.deepEqual(riskReductions([amp("Mentor Spirit", "RR 2 on one narrow magical domain the spirit governs.")]), []);
  assert.deepEqual(riskReductions([amp("Nothing", "A cool jacket. No mechanical effect.")]), []);
}

// ── Longest skill name wins, so "Close Combat" is not read as something shorter
{
  const r = riskReductions([amp("Cyberarm", "RR 1 to Close Combat tests.")]);
  assert.equal(r[0].skill, "Close Combat");
}

// ── A parenthetical only counts when it follows the skill immediately ────────
{
  const r = riskReductions([amp("X", "RR 1 to Stealth when hiding (at night).")]);
  assert.equal(r[0].skill, "Stealth");
  assert.equal(r[0].specialization, null, "an unrelated aside is not a specialization");
}

// ── Stacking merges and caps at 3 (p.71) ────────────────────────────────────
{
  const stacked = riskReductions([
    amp("A", "RR 2 to Conjuring tests."),
    amp("B", "RR 2 to Conjuring tests."),
  ]);
  assert.equal(stacked.length, 1);
  assert.equal(stacked[0].rr, 3, "capped, not 4");
  assert.equal(stacked[0].from, "A, B");

  // Same skill, different specialization: two separate rows.
  assert.equal(
    riskReductions([
      amp("A", "RR 1 to Influence (impersonation)."),
      amp("B", "RR 1 to Influence (negotiation)."),
    ]).length,
    2
  );
}

// ── Multiple grants in one amp ───────────────────────────────────────────────
{
  const both = riskReductions([amp("HK P60", "Dismountable: RR 1 to Stealth (physical sneaking). Smartgun: RR 1 to Ranged Weapons (pistols).")]);
  assert.equal(both.length, 2);
  assert.deepEqual(both.map((r) => r.skill).sort(), ["Ranged Weapons", "Stealth"]);
}

// ── Armour: highest worn, plus amp bonuses ──────────────────────────────────
{
  assert.equal(armorRating([{ armor: 3 }, { armor: 2 }], []), 3, "highest worn, not a sum");
  assert.equal(armorRating([{ armor: 3 }], [{ armorBonus: 1 }]), 4, "amps stack on top");
  assert.equal(armorRating([], [{ armorBonus: 1 }, { armorBonus: 1 }]), 2);
  assert.equal(armorRating([], []), 0, "no gear is 0, not -Infinity");
}

console.log("derive: all assertions passed");
