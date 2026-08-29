import {
  ATTRIBUTES,
  BASE_ESSENCE,
  BASE_WOUND_BOXES,
  COSTS,
  CREATION_RR_MAX,
  FREE_SUSTAINED,
  SKILLS,
  SKILL_MAX,
  ATTRIBUTE_MAX,
} from "../data/rules.js";

export const nuyen = (n) => `${Math.round(n).toLocaleString("en-US")}\u00A5`;

const sum = (arr) => arr.reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------
// Spending
// ---------------------------------------------------------------------------

// Every attribute point costs, including the mandatory 1 in each and including
// Edge. The quickguide's worked example prints a lower total than its own
// itemized rows because its SUM range stops one row short in both the
// attribute and skill tables. We charge what the itemized rows charge.
export function attributeSpend(attributes) {
  return sum(ATTRIBUTES.map((a) => attributes[a.key] ?? 1)) * COSTS.attributePoint;
}

export function skillSpend(skillRatings) {
  return sum(Object.values(skillRatings).map((r) => r || 0)) * COSTS.skillPoint;
}

export function knowledgeSpend(knowledge) {
  return knowledge.filter((k) => k.trim()).length * COSTS.knowledgeSkill;
}

export function ampSpend(amps) {
  return sum(amps.map((a) => Number(a.nuyen) || 0));
}

export function gearSpend(gear) {
  return sum(gear.map((g) => (Number(g.nuyen) || 0) * (Number(g.qty) || 1)));
}

export function spendBreakdown(character) {
  const attributes = attributeSpend(character.attributes);
  const skills = skillSpend(character.skills);
  const knowledge = knowledgeSpend(character.knowledge);
  const amps = ampSpend(character.amps);
  const gear = gearSpend(character.gear);
  const total = attributes + skills + knowledge + amps + gear;
  return {
    attributes,
    skills,
    knowledge,
    amps,
    gear,
    total,
    remaining: character.budget - total,
    overspent: total > character.budget,
  };
}

// ---------------------------------------------------------------------------
// Derived character stats
// ---------------------------------------------------------------------------

export function essence(amps) {
  const spent = sum(amps.map((a) => Number(a.essence) || 0));
  return Math.round((BASE_ESSENCE - spent) * 10) / 10;
}

// p.103 and pp.244-253: physical thresholds are (Strength + Armor), then +3,
// then +6. Verified against Echo (STR 2, no armor: 2/5/8; with Kevlar Vest 3:
// 5/8/11) and the ganger blocks (STR 3 + Armor 1: 4/7/10).
export function physicalThresholds(strength, armor = 0) {
  const base = (strength || 0) + (armor || 0);
  return [base, base + 3, base + 6];
}

// Mental thresholds are Willpower, +3, +6. Echo WIL 3: 3/6/9.
export function mentalThresholds(willpower) {
  const base = willpower || 0;
  return [base, base + 3, base + 6];
}

// Highest armor rating worn, not a sum. Armor amps stack on top of it.
export function armorRating(gear, amps) {
  const wornArmor = Math.max(0, ...gear.filter((g) => g.armor).map((g) => Number(g.armor) || 0));
  const ampArmor = sum(amps.map((a) => Number(a.armorBonus) || 0));
  return wornArmor + ampArmor;
}

// Dice pool = skill rating + linked attribute, plus 2 for a valid
// specialization. A skill with no rank counts as 0 but still rolls the
// attribute (p.64). `owned` is false for a specialization the character has
// not bought: the p.243 legend notes those still swap the linked attribute
// (composure rolls Willpower, ranged defense rolls Agility) but grant no +2.
export function dicePool(character, skillKey, specName = null, owned = true) {
  const skill = SKILLS.find((s) => s.key === skillKey);
  if (!skill) return 0;
  const spec = specName ? skill.specializations.find((sp) => sp.name === specName) : null;
  const attrKey = spec?.attr ?? skill.attr;
  const rating = character.skills[skillKey] || 0;
  const attr = character.attributes[attrKey] || 0;
  return rating + attr + (spec && owned ? 2 : 0);
}

// Unarmed damage equals Strength. Verified against Echo (STR 2, DV 2) and the
// ganger blocks (STR 3 human DV 3, ork 4, troll 5).
export const unarmedDV = (strength) => strength || 0;

// Risk Reduction granted by amps, parsed from their effect text.
//
// Driven by the skill list rather than by sentence shape. The previous pattern
// required the clause to end in "tests", a full stop or a comma right after the
// target, so "RR 1 to Perception (physical) on overwatch" parsed to nothing and
// the Fly-Spy's book-printed RR never reached the sheet. It also invented
// entries with empty skill names out of prose like "stacks up to RR 3 (p.71)".
//
// Now: find "RR <n>", then look for a skill rules.js actually knows in the
// clause that follows. No known skill, no entry — which is the correct reading
// of vague text like the Mentor Spirit's "one narrow magical domain".
const RR_PATTERN = /RR\s*(\d)\b([^.;]*)/gi;

// Longest first so "Close Combat" is never shadowed by a shorter name that
// happens to be a substring of it.
const SKILLS_BY_LENGTH = [...SKILLS].sort((a, b) => b.name.length - a.name.length);

function targetOf(clause) {
  for (const skill of SKILLS_BY_LENGTH) {
    const at = clause.toLowerCase().indexOf(skill.name.toLowerCase());
    if (at === -1) continue;
    // A parenthetical immediately after the skill name is its specialization;
    // one further along belongs to some other part of the sentence.
    const after = clause.slice(at + skill.name.length);
    const spec = after.match(/^\s*\(([^)]+)\)/)?.[1]?.trim() ?? null;
    return { kind: "skill", skill: skill.name, specialization: spec };
  }
  // The book also sells RR against a whole attribute ("Risk management
  // (attribute)", 50,000\u00A5) — "RR 1 Agility", "RR 1 Logic". Those apply to
  // every Test using that attribute, so they are not a skill row.
  for (const attr of ATTRIBUTES) {
    if (new RegExp(`\\b${attr.name}\\b`, "i").test(clause)) {
      return { kind: "attribute", skill: attr.name, specialization: null };
    }
  }
  return null;
}

export function riskReductions(amps) {
  const found = [];
  for (const amp of amps) {
    const text = amp.effects ?? "";
    RR_PATTERN.lastIndex = 0;
    let match;
    while ((match = RR_PATTERN.exec(text)) !== null) {
      const target = targetOf(match[2]);
      if (!target) continue;
      found.push({ rr: Number(match[1]), ...target, from: amp.name });
    }
  }
  // Merge duplicates on the same target, summing but capping at RR 3 (p.71).
  const merged = new Map();
  for (const entry of found) {
    const key = `${entry.skill.toLowerCase()}|${entry.specialization?.toLowerCase() ?? ""}`;
    const existing = merged.get(key);
    if (existing) {
      existing.rr = Math.min(3, existing.rr + entry.rr);
      existing.from = `${existing.from}, ${entry.from}`;
    } else {
      merged.set(key, { ...entry });
    }
  }
  return [...merged.values()].sort((a, b) => b.rr - a.rr || a.skill.localeCompare(b.skill));
}

// Condition monitor size: the base, plus every "+1 Light Wound box" an amp
// grants. Bone lacing, Platelet factories, Toughness and the Phoenix mentor
// all buy boxes, so the tracker has to grow with them rather than assume three.
const BOX_PATTERNS = {
  light: /\+\s*(\d*)\s*Light Wound box/gi,
  serious: /\+\s*(\d*)\s*Serious Wound box/gi,
};

export function woundBoxes(amps) {
  const boxes = { ...BASE_WOUND_BOXES };
  for (const amp of amps ?? []) {
    for (const [level, pattern] of Object.entries(BOX_PATTERNS)) {
      pattern.lastIndex = 0;
      let m;
      while ((m = pattern.exec(amp.effects ?? "")) !== null) {
        boxes[level] += Number(m[1] || 1);
      }
    }
  }
  return boxes;
}

// Spells that stay up. One is free; every one after that costs a Disadvantage
// on everything you do, so the count is worth surfacing rather than leaving
// players to tally it mid-fight.
export const sustainedSpells = (amps) => amps.filter((a) => a.sustained);

// ---------------------------------------------------------------------------
// Validation. These are advisory, not blocking. Anarchy expects rulings, not
// rules, so the builder warns and lets you keep going.
// ---------------------------------------------------------------------------

export function validate(character) {
  const issues = [];
  const spend = spendBreakdown(character);
  const ess = essence(character.amps);

  if (spend.overspent) {
    issues.push({
      level: "error",
      text: `Over budget by ${nuyen(-spend.remaining)}. Cut chrome or drop an attribute point.`,
    });
  }

  if (ess < 0) {
    issues.push({ level: "error", text: `Essence is ${ess}. It cannot go below 0 (quickguide step 4).` });
  } else if (ess <= 1 && ess >= 0) {
    issues.push({
      level: "warn",
      text: `Essence ${ess}. Healing spells cancel hits against you and spirits notice the hollow.`,
    });
  }

  for (const attr of ATTRIBUTES) {
    const value = character.attributes[attr.key];
    if (value > ATTRIBUTE_MAX) {
      issues.push({ level: "error", text: `${attr.name} is above the maximum of ${ATTRIBUTE_MAX}.` });
    }
  }

  for (const [key, rating] of Object.entries(character.skills)) {
    if (rating > SKILL_MAX) {
      const name = SKILLS.find((s) => s.key === key)?.name ?? key;
      issues.push({ level: "error", text: `${name} is above the skill maximum of ${SKILL_MAX}.` });
    }
  }

  const hasAwakened = character.amps.some((a) => a.category === "awakened");
  const magicRanks = (character.skills.sorcery || 0) + (character.skills.conjuring || 0);
  if (magicRanks > 0 && !hasAwakened) {
    issues.push({
      level: "warn",
      text: "Sorcery and Conjuring cannot be rolled without an Awakened amp, whatever the dice pool (p.64).",
    });
  }

  const spells = character.amps.filter((a) => a.category === "spell");
  if (spells.length > 0 && !hasAwakened) {
    issues.push({
      level: "warn",
      text: "Spells are cast with Sorcery, which needs an Awakened amp to roll at all (p.64).",
    });
  }

  const overCap = riskReductions(character.amps).filter((r) => r.rr > CREATION_RR_MAX);
  if (overCap.length > 0) {
    issues.push({
      level: "warn",
      text: `RR ${overCap[0].rr} on ${overCap[0].skill}${
        overCap[0].specialization ? ` (${overCap[0].specialization})` : ""
      }. Character creation caps Risk Reduction at ${CREATION_RR_MAX}; RR 3 is reachable only in play (p.3).`,
    });
  }

  const sustained = sustainedSpells(character.amps);
  if (sustained.length > FREE_SUSTAINED) {
    issues.push({
      level: "warn",
      text: `${sustained.length} sustained spells (${sustained
        .map((s) => s.name)
        .join(", ")}). One is free; holding more is a Disadvantage on every test unless an amp or focus carries it.`,
    });
  }

  const hasDeck = character.amps.some((a) => /cyberdeck/i.test(a.name));
  if ((character.skills.cracking || 0) > 0 && !hasDeck) {
    issues.push({
      level: "warn",
      text: "Cracking needs a cyberdeck. Without one the Test cannot be rolled (p.64).",
    });
  }

  const hasAdeptPower = character.amps.some((a) => a.category === "adeptPower");
  const hasAdept = character.amps.some((a) => /adept/i.test(a.name) && a.category === "awakened");
  if (hasAdeptPower && !hasAdept) {
    issues.push({ level: "warn", text: "Adept Powers need an Adept or Mystic Adept awakening." });
  }

  if (character.keywords.filter(Boolean).length === 0) {
    issues.push({ level: "warn", text: "No Keywords yet. They are free and they are how the table reads you." });
  }
  if (character.cues.filter(Boolean).length < 2) {
    issues.push({ level: "warn", text: "Write at least two Cues. They are the lines you say when it is your turn." });
  }

  return issues;
}

export const isComplete = (character) => validate(character).every((i) => i.level !== "error");
