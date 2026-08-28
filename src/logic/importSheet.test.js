// node src/logic/importSheet.test.js
//
// Both fixtures are the real rows from the Shadowrun_Character_Sheets workbook,
// pasted verbatim. If the sheet format changes, change these first.

import assert from "node:assert/strict";
import { rowToCharacter } from "./importSheet.js";
import { dicePool, essence, spendBreakdown } from "./derive.js";

const COUNT_ZERO = {
  Name: "Count Zero",
  Metatype: "Human",
  Concept: "Matrix Specialist / Street Decker",
  Strength: "2",
  Agility: "3",
  Logic: "5",
  Willpower: "4",
  Charisma: "2",
  Edge: "4",
  Skills:
    "Electronics:5 (Cracking +2); Stealth:3 (Matrix Sneaking +2); Perception:3 (Matrix +2); Ranged Weapons:3 (Pistols +2); Athletics:2 (Ranged Defense +2); Influence:1",
  Knowledge_Skills: "Matrix Architecture; Cyberdeck Hardware; Seattle Data Havens",
  Shadow_Amps:
    "Custom Cyberdeck (Fuchigami Cyber-Ex) [RR 1 Electronics (Cracking)]; Datajack (0.5 Essence); Exploit & Attack Programs [RR 1 Cybercombat]; Sleaze Utilities [RR 1 Stealth (Matrix Sneaking)]",
  Weapons: "Light Pistol (DV 4)",
  Armor: "Lined Coat (Armor 2)",
  Gear: "Cyberdeck; Commlink; Fake SIN (Rating 3); Infiltration Kit",
  Keywords: "Decker; Hacker; Street Tech; Neo-Anarchist",
  Dispositions: "Ambitious; Overconfident; Reckless",
  Cues: "Access granted, omae. | Who needs doors when you've got root access? | The Matrix never lies.",
  Description: "A 22-year-old human male hacker sitting on a rain-slicked fire escape...",
  Persona: "Act as Count Zero, a cocky 22-year-old street decker from the sprawl.",
};

const FOX = {
  Name: "Fox",
  Metatype: "Elf",
  Concept: "Illusionist Sorcerer & Face",
  Strength: "2",
  Agility: "3",
  Logic: "3",
  Willpower: "4",
  Charisma: "5",
  Edge: "3",
  Skills:
    "Influence:5 (Impersonation/Con +2); Sorcery:5 (Illusion Spells +2); Perception:3 (Social +2); Stealth:3 (Physical Sneaking +2); Ranged Weapons:2 (Pistols +2); Athletics:2",
  Knowledge_Skills: "High Society Etiquette; Magical Theory; Underworld Scams",
  Shadow_Amps:
    "Awakened: Sorcerer (Rating 2); Spell: Invisibility [RR 1 Stealth]; Spell: Phantasm/Influence [RR 1 Influence (Impersonation)]; Glamour Focus [RR 1 Influence]",
  Weapons: "Hold-out Light Pistol (DV 4)",
  Armor: "Well-Stocked Closet / Fine Suit (Armor 1)",
  Gear: "Nanopaste Makeup Kit; Commlink; Fake SIN (Rating 3)",
  Keywords: "Sorcerer; Face; Con Artist; High-Society",
  Dispositions: "Charming; Manipulative; Calm Under Pressure",
  Cues: "Believe half of what you see. | Magic is just stagecraft with teeth.",
  Description: "A tall, slender male Elf with sharp, elegant facial features...",
  Persona: "Act as Fox, an aristocratic Elf illusion sorcerer and master con artist.",
};

// ── Count Zero ───────────────────────────────────────────────────────────────
{
  const { state, unmapped } = rowToCharacter(COUNT_ZERO);

  assert.equal(state.identity.streetName, "Count Zero");
  assert.equal(state.identity.metatype, "human");
  assert.equal(state.identity.avatarPrompt.startsWith("A 22-year-old"), true);
  assert.equal(state.identity.persona.startsWith("Act as Count Zero"), true);

  assert.deepEqual(state.attributes, {
    strength: 2, agility: 3, logic: 5, willpower: 4, charisma: 2, edge: 4,
  });

  assert.equal(state.skills.electronics, 5);
  assert.equal(state.skills.influence, 1);
  assert.equal(state.skills.piloting, 0, "unlisted skills reset to 0");

  // Electronics 5 + Logic 5. "Cracking" is its own skill in rules.js, not an
  // Electronics specialization, so it must not silently become one.
  assert.equal(dicePool(state, "electronics"), 10);
  assert.deepEqual(state.specializations.electronics, []);
  assert.equal(
    unmapped.some((u) => u.value.includes("Cracking")),
    true,
    "an unmatched specialization has to be reported, not dropped"
  );

  // Same mismatch again: the sheet files "Matrix Sneaking" under Stealth,
  // rules.js lists it under Cracking. Reported, not guessed at.
  assert.deepEqual(state.specializations.stealth, []);

  // These two do line up, and carry the +2.
  assert.deepEqual(state.specializations.rangedWeapons, ["pistols"]);
  assert.equal(dicePool(state, "rangedWeapons", "pistols"), 3 + 3 + 2);
  assert.deepEqual(state.specializations.athletics, ["ranged defense"]);

  assert.equal(unmapped.length, 3, "Cracking, Matrix Sneaking, Matrix — all under the wrong skill");

  assert.deepEqual(state.knowledge, [
    "Matrix Architecture", "Cyberdeck Hardware", "Seattle Data Havens",
  ]);

  const deck = state.amps[0];
  assert.equal(deck.name, "Custom Cyberdeck (Fuchigami Cyber-Ex)", "a make is part of the name");
  assert.equal(deck.effects, "RR 1 Electronics (Cracking)");
  const datajack = state.amps[1];
  assert.equal(datajack.name, "Datajack");
  assert.equal(datajack.essence, 0.5);
  assert.equal(essence(state.amps), 5.5);

  // Weapons, armor and gear land in one list; SheetView splits them by note.
  const pistol = state.gear.find((g) => g.name === "Light Pistol");
  assert.equal(pistol.note, "DV 4");
  assert.equal(pistol.nuyen, 500, "a catalog match brings its price");
  const coat = state.gear.find((g) => g.name === "Lined Coat");
  assert.equal(coat.armor, 2);
  assert.equal(state.gear.find((g) => g.name === "Infiltration Kit").nuyen, 1500);

  assert.deepEqual(state.cues, [
    "Access granted, omae.",
    "Who needs doors when you've got root access?",
    "The Matrix never lies.",
  ]);

  // 20 attribute points, 17 skill ranks, 3 knowledge skills, priced gear only.
  const spend = spendBreakdown({ ...state, budget: 400_000 });
  assert.equal(spend.attributes, 200_000);
  assert.equal(spend.skills, 42_500);
  assert.equal(spend.knowledge, 3_750);
}

// ── Fox ──────────────────────────────────────────────────────────────────────
{
  const { state } = rowToCharacter(FOX);

  assert.equal(state.identity.metatype, "elf");

  // "Impersonation/Con" names one specialization two ways; the half rules.js
  // knows wins and the other is not invented as a second spec.
  assert.deepEqual(state.specializations.influence, ["impersonation"]);
  assert.equal(dicePool(state, "influence", "impersonation"), 5 + 5 + 2);

  assert.deepEqual(state.specializations.sorcery, ["illusion spells"]);

  // Sorcery is gated on an Awakened amp, so the category has to be inferred
  // from the name or the sheet imports a runner who cannot cast.
  const awakened = state.amps[0];
  assert.equal(awakened.name, "Awakened: Sorcerer");
  assert.equal(awakened.rating, 2);
  assert.equal(awakened.category, "awakened");
  assert.equal(state.amps.filter((a) => a.category === "awakened").length, 1, "only the Awakening itself");

  // Spells are their own category. Filing them as "awakened" would satisfy the
  // gate that says Sorcery needs an Awakening, so a sheet carrying only spells
  // would import as legal when it is not.
  assert.equal(state.amps.filter((a) => a.category === "spell").length, 2);

  // A catalog name match brings the price the sheet has no column for.
  const invis = state.amps.find((a) => a.name === "Spell: Invisibility");
  assert.equal(invis.category, "spell");
  assert.equal(invis.nuyen, 5_000, "priced from the catalog");
  // "Spell: Phantasm/Influence" names two catalog spells at once and matches
  // neither, so it stays at 0 for the player to price.
  assert.equal(state.amps.find((a) => a.name === "Spell: Phantasm/Influence").nuyen, 0);
  assert.equal(state.amps.find((a) => a.name === "Glamour Focus").category, "equipment");

  assert.equal(state.gear.find((g) => g.name === "Well-Stocked Closet / Fine Suit").armor, 1);
  assert.equal(state.cues.length, 2);
}

// ── Degenerate input ─────────────────────────────────────────────────────────
{
  const { state, unmapped } = rowToCharacter({});
  assert.equal(state.identity.streetName, "");
  assert.equal(state.attributes.strength, 1, "a blank row still yields a legal runner");
  assert.deepEqual(state.amps, []);
  assert.deepEqual(unmapped, []);

  const junk = rowToCharacter({ Skills: "Hacking:9; garbage; Influence:2", Metatype: "Dragon" });
  assert.equal(junk.state.skills.influence, 2, "one bad entry does not abort the row");
  assert.equal(junk.state.identity.metatype, "human");
  assert.equal(junk.unmapped.length, 3);
}

console.log("importSheet: all assertions passed");
