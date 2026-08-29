// Shadowrun: Anarchy 2.0 rules data.
//
// SOURCING NOTE, read before editing:
// Everything marked `source: "book"` is taken directly from the Anarchy 2.0
// preview PDF (pp. 50-85, 169, 243-244) or from the Echo pregen sheet (p. 103).
// Everything marked `source: "assumed"` is a placeholder inferred from those
// pages because the relevant table was not in the preview. Replace assumed
// values from the full book, then flip the flag. The UI surfaces the flag so
// nobody mistakes a guess for a rule.

export const COSTS = {
  attributePoint: 10_000,
  skillPoint: 2_500,
  knowledgeSkill: 1_250,
};

// Quickguide p.1. The tier sets the whole budget, so it is the first choice
// a player makes and the only thing that gates everything downstream.
export const TIERS = [
  { id: "street", name: "Street-level", nuyen: 200_000, blurb: "Scraping by. Improvised chrome, borrowed guns." },
  { id: "ganger", name: "Ganger", nuyen: 300_000, blurb: "Backed by a crew, known on four blocks." },
  { id: "runner", name: "'Runner", nuyen: 400_000, blurb: "Professional deniable asset. The default." },
  { id: "elite", name: "Elite", nuyen: 500_000, blurb: "Mr. Johnson asks for you by street name." },
];

export const ATTRIBUTE_MIN = 1;
export const ATTRIBUTE_MAX = 6;
export const SKILL_MAX = 6;
export const BASE_ESSENCE = 6;

export const ATTRIBUTES = [
  { key: "strength", abbr: "STR", name: "Strength", note: "Sets your physical wound thresholds." },
  { key: "agility", abbr: "AGI", name: "Agility", note: "Shooting, sneaking, blades, driving." },
  { key: "logic", abbr: "LOG", name: "Logic", note: "Perception, Cracking, Electronics." },
  { key: "willpower", abbr: "WIL", name: "Willpower", note: "Sets your mental wound thresholds. Drives magic." },
  { key: "charisma", abbr: "CHA", name: "Charisma", note: "Influence and Network. The Face stat." },
  { key: "edge", abbr: "EDG", name: "Edge", note: "Spend for extra actions. Refills between runs." },
];

// Skill list assembled from the Echo pregen sheet, the NPC blocks (pp. 244-253)
// and skills named in the rules text (Cracking, Sorcery, Conjuring, Piloting,
// Engineering, Biotech). Attribute pairings follow the pregen sheet.
export const SKILLS = [
  {
    key: "athletics",
    name: "Athletics",
    attr: "strength",
    plane: "physical",
    specializations: [
      { name: "ranged defense", attr: "agility" },
      { name: "climbing" },
      { name: "running" },{ name: "parkour" }, { name: "swimming" }, { name: "jumping" }],
  },
  {
    key: "biotech",
    name: "Biotech",
    attr: "logic",
    plane: "physical",
    specializations: [{ name: "first aid" }, { name: "cybertechnology" }],
  },
  {
    key: "closeCombat",
    name: "Close Combat",
    attr: "agility",
    plane: "physical",
    specializations: [{ name: "blades" }, { name: "clubs" }, { name: "unarmed" }, { name: "firearms" }, { name: "astral combat" }],
  },
  {
    key: "conjuring",
    name: "Conjuring",
    attr: "willpower",
    plane: "astral",
    requiresAwakened: true,
    specializations: [{ name: "summoning" }, { name: "banishing" }, { name: "spirits of air" }, { name: "spirits of water" }, { name: "spirits of earth" }, { name: "spirits of fire" }, { name: "spirits of beast" }, { name: "spirits of plant" }, { name: "spirits of kin" }, { name: "compiling" }, { name: "decompiling" }],
  },
  {
    key: "cracking",
    name: "Cracking",
    attr: "logic",
    plane: "matrix",
    requiresDeck: true,
    specializations: [{ name: "matrix sneaking" }, { name: "cybercombat" }, { name: "matrix search" }, { name: "backdoor" }, { name: "brute force" }],
  },
  {
    key: "electronics",
    name: "Electronics",
    attr: "logic",
    plane: "matrix",
    specializations: [{ name: "hardware" }, { name: "software" }, { name: "matrix search" }, { name: "personal electronics" }],
  },
  {
    key: "engineering",
    name: "Engineering",
    attr: "logic",
    plane: "physical",
    specializations: [{ name: "remotely controlled weapons" }, { name: "demolitions" }, { name: "mechanics" }, { name: "electronic warfare" }, { name: "b&r" }],
  },
  {
    key: "influence",
    name: "Influence",
    attr: "charisma",
    plane: "physical",
    specializations: [
      { name: "impersonation" },
      { name: "etiquette" },
      { name: "intimidation" },
      { name: "negotiation" },{ name: "bluff" }, { name: "seduction" }, { name: "psychology" }, { name: "animals" }],
  },
  {
    key: "network",
    name: "Network",
    attr: "charisma",
    plane: "physical",
    specializations: [{ name: "government" }, { name: "street" }, { name: "corporate" }, { name: "criminal" }, { name: "magic" }, { name: "matrix" }, { name: "engineering" }, { name: "media" }, { name: "medical" }, { name: "academic" }],
  },
  {
    key: "perception",
    name: "Perception",
    attr: "logic",
    plane: "physical",
    specializations: [{ name: "physical" }, { name: "social" }, { name: "matrix" }],
  },
  {
    key: "piloting",
    name: "Piloting",
    attr: "agility",
    plane: "physical",
    specializations: [{ name: "bike" }, { name: "ground craft" }, { name: "aircraft" }, { name: "drones" }, { name: "cars" }, { name: "risky maneuver" }],
  },
  {
    key: "rangedWeapons",
    name: "Ranged Weapons",
    attr: "agility",
    plane: "physical",
    specializations: [
      { name: "pistols" },
      { name: "submachine guns" },
      { name: "longarms" },
      { name: "thrown" },
      { name: "mounted weapons" },{ name: "rifles" }, { name: "smg" }, { name: "heavy weapons" }, { name: "throwing weapons" }, { name: "grenade launcher" }],
  },
  {
    key: "sorcery",
    name: "Sorcery",
    attr: "willpower",
    plane: "astral",
    requiresAwakened: true,
    specializations: [
      { name: "combat spells" },
      { name: "detection spells" },
      { name: "health spells" },
      { name: "illusion spells" },
      { name: "manipulation spells" },
      { name: "counterspelling" },{ name: "enchanting" }],
  },
  {
    key: "stealth",
    name: "Stealth",
    attr: "agility",
    plane: "physical",
    specializations: [{ name: "physical sneaking" }, { name: "disguise" }, { name: "palming" }, { name: "lockpicking" }, { name: "matrix sneaking" }],
  },
  {
    key: "survival",
    name: "Survival",
    attr: "logic",
    plane: "physical",
    specializations: [{ name: "composure", attr: "willpower" }, { name: "navigation" }, { name: "tracking" }, { name: "first aid" }, { name: "wilderness" }],
  },
];

// Anarchy handles metatype through narrative effects rather than a stat block,
// so nothing here is auto-applied to your attributes. The notes are the
// effects the book actually states, plus the Edge guidance from p.243.
export const METATYPES = [
  {
    id: "human",
    name: "Human",
    edgeHint: 4,
    effects: ["No sensory advantage.", "Highest Edge of any metatype (p.243 guidance: 4)."],
  },
  {
    id: "elf",
    name: "Elf",
    edgeHint: 3,
    effects: ["Low-light vision.", "Reads as attractive; Influence rarely suffers for looks."],
  },
  {
    id: "dwarf",
    name: "Dwarf",
    edgeHint: 3,
    effects: ["Thermographic vision.", "Resilient: NPC blocks show dwarfs one step higher on mental thresholds."],
  },
  {
    id: "ork",
    name: "Ork",
    edgeHint: 3,
    effects: [
      "Low-light vision: cancels the Disadvantage for fighting at night (p.59).",
      "NPC blocks run orks one point of Strength above human baseline.",
      "Faces open prejudice in corporate spaces.",
    ],
  },
  {
    id: "troll",
    name: "Troll",
    edgeHint: 3,
    effects: [
      "Thermographic vision, dermal armor, reach.",
      "NPC blocks run trolls two points of Strength above human baseline.",
      "Does not fit through doors, vehicles, or polite society.",
    ],
  },
];

// p.70. The whole risk economy in one grid. Reproduced on the sheet because
// players read it every single roll.
export const RISK_TABLE = [
  { rr: 0, low: "1 die", normal: "2 dice", high: "4 dice", extreme: "6+ dice" },
  { rr: 1, low: "3 dice", normal: "5 dice", high: "7 dice", extreme: "10+ dice" },
  { rr: 2, low: "5 dice", normal: "8 dice", high: "11 dice", extreme: "13+ dice" },
  { rr: 3, low: "8 dice", normal: "12 dice", high: "15 dice", extreme: "N/A" },
];

export const GLITCH_LEGEND =
  "Remaining 1s: 0 = no effect · 1 = minor glitch · 2 = critical glitch · 3+ = disaster";

// Drain is not a separate resist roll in Anarchy 2.0 — it is what the 1s on
// your risk dice mean when the test was Sorcery or Conjuring. Same glitch
// ladder as GLITCH_LEGEND, different consequences.
export const DRAIN = {
  minor: "Disadvantage on all actions until the end of your next narration.",
  critical: "Mana strain: take 1 Light Physical/Mental wound box immediately.",
  disaster: "Mana overload: Incapacitated immediately.",
};

// RR stacks, but no Test can ever apply more than 3 — and character creation
// caps it at 2. Buying past that is legal to write down and useless to roll.
export const CREATION_RR_MAX = 2;

// The condition monitor. One box at each level is the baseline this app
// assumes — the amp list sells "+1 Light Wound box" and "+1 Serious Wound box"
// as upgrades, which only makes sense against a base, but the preview PDF does
// not print the base itself. Amps that grant extra boxes are parsed on top.
export const BASE_WOUND_BOXES = { light: 1, serious: 1, incap: 1 };

// You sustain one spell for free. The second one costs you everything else.
export const FREE_SUSTAINED = 1;

export const DIFFICULTY_TABLE = [
  { difficulty: "Easy", threshold: "2" },
  { difficulty: "Average", threshold: "3" },
  { difficulty: "Difficult", threshold: "4 or 5" },
  { difficulty: "Hard", threshold: "6 or 7" },
  { difficulty: "Extreme", threshold: "8+" },
];

// p.169. Awakened characters buy one of these as a Shadow Amp variant. Ratings
// are from the book; nuyen costs were not in the preview and are marked below
// in the amp catalog.
export const AWAKENED_TYPES = [
  { id: "magician", name: '"Full" Magician', rating: 5, effects: "Astral perception and projection (+2), Sorcery (+1), Conjuring (+2)" },
  { id: "sorcerer", name: "Sorcerer (Spellcasting Aspected)", rating: 2, effects: "Astral perception (+1), Sorcery (+1)" },
  { id: "conjurer", name: "Conjurer (Conjuring Aspected)", rating: 3, effects: "Astral perception (+1), Conjuring (+2)" },
  { id: "clairvoyant", name: "Clairvoyant (Astral Aspected)", rating: 2, effects: "Astral perception and projection (+2)" },
  { id: "adept", name: "Adept", rating: 1, effects: "Adept (+1)" },
  { id: "mysticAdept", name: "Mystic Adept", rating: 5, effects: "Astral perception (+1), Sorcery (+1), Conjuring (+2), Adept (+1)" },
];

export const SUGGESTED_SPEND = {
  attributes: [120_000, 150_000],
  skills: [75_000, 75_000],
  knowledge: [2_500, 5_000],
  amps: [30_000, 60_000],
  gear: [10_000, 25_000],
};

export const KNOWLEDGE_SUGGESTIONS = [
  "Seattle Street Gangs",
  "Corporate Politics",
  "Matrix Hosts",
  "Magical Theory",
  "Black Market Contacts",
  "Small Unit Tactics",
  "Sixth World Slang",
  "Bar Culture",
  "Sprawl Geography",
  "Aztechnology Operations",
  "Yakuza Etiquette",
  "Trid Celebrities",
  "Chemistry and Botany",
  "Ork Underground",
];
