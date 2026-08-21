// Blank-character seeds. Everything here is persisted per character from the
// moment the builder opens, so these are only starting values — nothing is
// re-applied later.

import { ATTRIBUTES, ATTRIBUTE_MIN, SKILLS, TIERS } from "./rules.js";

export const defaultTier = TIERS.find((t) => t.id === "runner");

export const identitySeed = {
  streetName: "",
  realName: "",
  metatype: "human",
  concept: "",
  lifestyle: "low",
  background: "",
  // Both come straight from the Google Sheet when a runner is synced:
  // avatarPrompt feeds the image generator verbatim, persona is the roleplay
  // brief and never leaves the sheet.
  avatarPrompt: "",
  persona: "",
};

// Every attribute starts at the mandatory 1 and is charged for from the first
// point (see attributeSpend), so a blank runner already has spend on the bar.
export const attributesSeed = Object.fromEntries(
  ATTRIBUTES.map((a) => [a.key, ATTRIBUTE_MIN])
);

export const skillsSeed = Object.fromEntries(SKILLS.map((s) => [s.key, 0]));

export const specializationsSeed = Object.fromEntries(SKILLS.map((s) => [s.key, []]));

// Persona prompts. Anarchy runs on these three lists more than on the stat
// block, and a blank page is the thing players actually stall on.
export const KEYWORD_SUGGESTIONS = [
  "Street Samurai",
  "Decker",
  "Face",
  "Rigger",
  "Mage",
  "Adept",
  "Ork",
  "Ex-Knight Errant",
  "Gang Ties",
  "Corporate Deserter",
  "Sixth World Veteran",
  "SINless",
  "Combat Trained",
  "Wired",
  "Awakened",
  "Smuggler",
  "Fixer's Favourite",
  "Owes a Dragon",
];

export const DISPOSITION_SUGGESTIONS = [
  "Never leaves a runner behind",
  "Takes the shot before the talking stops",
  "Will not kill children or dogs",
  "Greedy, and honest about it",
  "Talks first, always",
  "Hates corps on principle",
  "Keeps every promise, charges for each",
  "Cannot resist a locked door",
  "Loyal to the crew, nobody else",
  "Afraid of spirits and says so",
];

export const CUE_SUGGESTIONS = [
  '"That is not what we agreed on, chummer."',
  '"Nuyen up front, or I walk."',
  '"I have got a guy for that."',
  '"Drek. Drek drek drek."',
  '"Give me thirty seconds and a clear line."',
  '"You are going to want to stand back."',
  '"Nothing personal. It is just business."',
  '"I have seen worse. Last Tuesday."',
];
