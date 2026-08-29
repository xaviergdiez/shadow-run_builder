// node src/logic/derive.test.js
import assert from "node:assert/strict";
import { riskReductions, armorRating, woundBoxes } from "./derive.js";

const amp = (name, effects, extra = {}) => ({ name, effects, ...extra });

// ── The three parse failures the catalog audit turned up ─────────────────────
{
  // A trailing clause after the specialization used to swallow the whole match,
  // so this book-printed RR never reached the sheet.
  assert.deepEqual(riskReductions([amp("Fly-Spy", "RR 1 to Perception (physical) on overwatch. Passes for traffic.")]), [
    { rr: 1, kind: "skill", skill: "Perception", specialization: "physical", from: "Fly-Spy" },
  ]);

  assert.deepEqual(riskReductions([amp("Manabolt", "Manabolt, plus RR 1 to Sorcery (combat spells) when casting it.")]), [
    { rr: 1, kind: "skill", skill: "Sorcery", specialization: "combat spells", from: "Manabolt" },
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
  assert.equal(armorRating([{ armor: 5 }], [{ armorBonus: 3 }]), 5, "armour caps at 5");
}

// ── Attribute RR ─────────────────────────────────────────────────────────────
// The book sells RR against a whole attribute (50,000\u00A5), not just a skill.
{
  const r = riskReductions([amp("Muscle toner", "RR 1 Agility")]);
  assert.equal(r.length, 1);
  assert.equal(r[0].kind, "attribute");
  assert.equal(r[0].skill, "Agility");
  assert.equal(r[0].specialization, null);

  // A skill named in the clause still wins over an attribute.
  const s = riskReductions([amp("X", "RR 1 Athletics (parkour)")]);
  assert.equal(s[0].kind, "skill");
  assert.equal(s[0].skill, "Athletics");
  assert.equal(s[0].specialization, "parkour", "a book specialization rules.js now knows");
}

// ── Condition monitor ───────────────────────────────────────────────────────
// 2 Light + 1 Severe, per the SRA2 reference implementation. Incapacitation is
// what happens when the Severe boxes overflow, so it is not a box itself.
{
  assert.deepEqual(woundBoxes([]), { light: 2, severe: 1 });
  assert.deepEqual(woundBoxes(undefined), { light: 2, severe: 1 }, "no amps is not an error");

  assert.deepEqual(woundBoxes([amp("Toughness", "+1 Light Wound box.")]), { light: 3, severe: 1 });
  // The catalog says "Serious", the reference says "Severe" — both are the
  // same box and both must count.
  assert.deepEqual(woundBoxes([amp("Bone lacing", "+1 Serious Wound box. Unarmed DV +1.")]), { light: 2, severe: 2 });
  assert.deepEqual(woundBoxes([amp("Ref", "+1 Severe Wound box.")]), { light: 2, severe: 2 });

  assert.deepEqual(
    woundBoxes([amp("A", "+1 Light Wound box."), amp("B", "Unarmed DV +1. +1 Light Wound box."), amp("C", "+1 Serious Wound box.")]),
    { light: 4, severe: 2 },
    "boxes stack across amps, prose order irrelevant"
  );

  assert.deepEqual(
    woundBoxes([amp("Nope", "Inflicts a Light Wound after using the asset.")]),
    { light: 2, severe: 1 },
    "taking a wound is not gaining a box"
  );
}

console.log("derive: all assertions passed");
