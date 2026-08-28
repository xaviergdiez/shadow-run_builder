// Google Sheet → character state.
//
// The sheet format is one tab per runner, a header row, and a single data row.
// Columns:
//   Name, Metatype, Concept, Strength, Agility, Logic, Willpower, Charisma,
//   Edge, Skills, Knowledge_Skills, Shadow_Amps, Weapons, Armor, Gear,
//   Keywords, Dispositions, Cues, Description, Persona
//
// The keys this returns are exactly the keys usePersistedState reads, so a sync
// writes straight into the state blob with no intermediate config shape.
//
// Nothing here throws on bad input. A sheet is a human artifact: a runner with
// one unparseable skill should still import, with the miss reported rather than
// swallowed. Everything unmatched comes back in `unmapped` for the caller to
// show — silently dropping a row is the one behaviour worse than failing.

import { ATTRIBUTES, ATTRIBUTE_MAX, ATTRIBUTE_MIN, METATYPES, SKILLS, SKILL_MAX } from "../data/rules.js";
import { AMP_CATALOG, GEAR_CATALOG, LIFESTYLES } from "../data/catalog.js";

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const splitList = (v, sep = ";") =>
  String(v ?? "")
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const SKILL_BY_NAME = new Map(SKILLS.map((s) => [norm(s.name), s]));
const AMP_BY_NAME = new Map(AMP_CATALOG.map((a) => [norm(a.name), a]));
const GEAR_BY_NAME = new Map(GEAR_CATALOG.map((g) => [norm(g.name), g]));

// ---------------------------------------------------------------------------
// Column parsers
// ---------------------------------------------------------------------------

// "Electronics:5 (Cracking +2); Athletics:2 (Ranged Defense +2); Influence:1"
// The +2 in the sheet is the specialization bonus the book already grants, so
// it is read as a marker and discarded — dicePool applies the bonus itself.
function parseSkills(raw, unmapped) {
  const skills = {};
  const specializations = {};

  for (const entry of splitList(raw)) {
    const match = entry.match(/^(.+?)\s*:\s*(\d+)\s*(?:\((.*)\))?\s*$/);
    if (!match) {
      unmapped.push({ column: "Skills", value: entry, reason: "not in 'Skill:rating (spec +2)' form" });
      continue;
    }

    const [, name, rating, specText] = match;
    const skill = SKILL_BY_NAME.get(norm(name));
    if (!skill) {
      unmapped.push({ column: "Skills", value: name.trim(), reason: "no such skill in rules.js" });
      continue;
    }

    skills[skill.key] = clamp(Number(rating), 0, SKILL_MAX);

    if (!specText) continue;
    // "Impersonation/Con +2" names one specialization two ways; either spelling
    // may be the one rules.js knows, so both are candidates and matches win.
    const candidates = specText.replace(/\+\d+/g, "").split("/").map((s) => s.trim()).filter(Boolean);
    const matched = candidates
      .map((c) => skill.specializations.find((sp) => norm(sp.name) === norm(c))?.name)
      .filter(Boolean);

    if (matched.length > 0) {
      specializations[skill.key] = [...new Set([...(specializations[skill.key] ?? []), ...matched])];
    } else {
      // Kept out of the character on purpose: SheetView prints a "+2" beside
      // every owned specialization, and dicePool only grants it for one
      // rules.js knows. Importing an unknown name would print a bonus the
      // dice pool beside it does not include.
      unmapped.push({
        column: "Skills",
        value: `${skill.name} (${candidates.join("/")})`,
        reason: "specialization not listed for that skill",
      });
    }
  }

  return { skills, specializations };
}

// "Custom Cyberdeck (Fuchigami Cyber-Ex) [RR 1 Electronics (Cracking)]"
// "Datajack (0.5 Essence)"  ·  "Awakened: Sorcerer (Rating 2)"
function parseAmps(raw) {
  return splitList(raw).map((entry, i) => {
    const effects = entry.match(/\[([^\]]*)\]/)?.[1]?.trim() ?? "";
    let rest = entry.replace(/\[[^\]]*\]/g, "");

    const essence = Number(rest.match(/\(\s*([\d.]+)\s*Essence\s*\)/i)?.[1] ?? 0);
    const rating = Number(rest.match(/\(\s*Rating\s*([\d.]+)\s*\)/i)?.[1] ?? 0);
    // Only the two structured parentheticals are consumed. Anything else in
    // brackets is part of the name — "(Fuchigami Cyber-Ex)" is a make, not data.
    rest = rest.replace(/\(\s*[\d.]+\s*Essence\s*\)/gi, "").replace(/\(\s*Rating\s*[\d.]+\s*\)/gi, "");

    const name = rest.trim().replace(/[;,]$/, "");
    const known = AMP_BY_NAME.get(norm(name));

    return {
      instanceId: `amp-sync-${i}`,
      name,
      category: known?.category ?? inferCategory(name),
      rating: rating || known?.rating || 0,
      essence: essence || known?.essence || 0,
      // The sheet carries no prices. Catalog matches bring one, everything else
      // lands at 0 for the player to fill in — a guessed price would quietly
      // move the budget bar.
      nuyen: known?.nuyen ?? 0,
      effects: effects || known?.effects || "",
      source: known?.source ?? "sheet",
    };
  });
}

// Category drives two validation rules (Awakened gates Sorcery and Conjuring,
// Adept gates Adept Powers), so it is worth inferring rather than defaulting.
function inferCategory(name) {
  if (/^awakened/i.test(name)) return "awakened";
  if (/^adept power/i.test(name)) return "adeptPower";
  // Spells are their own category now that the catalog carries them. They used
  // to be filed as "awakened", which wrongly satisfied the gate that says
  // Sorcery needs an Awakening — a sheet with only spells looked legal.
  if (/^spell:/i.test(name)) return "spell";
  if (/focus$/i.test(name)) return "equipment";
  return "custom";
}

// "Light Pistol (DV 4)" · "Lined Coat (Armor 2)" · "Fake SIN (Rating 3)"
function parseGearEntry(entry, idPrefix, i) {
  const paren = entry.match(/\(([^)]*)\)\s*$/)?.[1]?.trim() ?? "";
  const name = entry.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const known = GEAR_BY_NAME.get(norm(name));
  const armor = Number(paren.match(/Armor\s*(\d+)/i)?.[1] ?? 0) || known?.armor;

  return {
    instanceId: `${idPrefix}-sync-${i}`,
    id: known?.id ?? null,
    name,
    qty: 1,
    nuyen: known?.nuyen ?? 0,
    // SheetView sorts weapons out of equipment by looking for a DV in the note,
    // so the parenthetical has to survive into it verbatim.
    note: paren || known?.note || "",
    ...(armor ? { armor } : {}),
    source: known?.source ?? "sheet",
  };
}

// ---------------------------------------------------------------------------
// Row → state
// ---------------------------------------------------------------------------

export function rowToCharacter(row) {
  const get = (col) => String(row[col] ?? "").trim();
  const unmapped = [];

  const metatype = METATYPES.find((m) => norm(m.name) === norm(get("Metatype")));
  if (get("Metatype") && !metatype) {
    unmapped.push({ column: "Metatype", value: get("Metatype"), reason: "no such metatype" });
  }

  const attributes = Object.fromEntries(
    ATTRIBUTES.map((a) => {
      const raw = Number(row[a.name] ?? row[a.abbr]);
      return [a.key, Number.isFinite(raw) && raw > 0 ? clamp(raw, ATTRIBUTE_MIN, ATTRIBUTE_MAX) : ATTRIBUTE_MIN];
    })
  );

  const { skills, specializations } = parseSkills(get("Skills"), unmapped);

  const gear = [
    ...splitList(get("Weapons")),
    ...splitList(get("Armor")),
    ...splitList(get("Gear")),
  ].map((entry, i) => parseGearEntry(entry, "gear", i));

  return {
    unmapped,
    state: {
      identity: {
        streetName: get("Name"),
        realName: "",
        metatype: metatype?.id ?? "human",
        concept: get("Concept"),
        lifestyle: LIFESTYLES[2].id,
        background: "",
        // Written by hand in the sheet as an image prompt, and used verbatim by
        // generate-avatar. Persona is the roleplay brief, sheet-only.
        avatarPrompt: get("Description"),
        persona: get("Persona"),
      },
      attributes,
      // Skills and specializations replace wholesale rather than merge: a rank
      // deleted in the sheet has to disappear here too, or a re-sync can only
      // ever add.
      skills: { ...Object.fromEntries(SKILLS.map((s) => [s.key, 0])), ...skills },
      specializations: { ...Object.fromEntries(SKILLS.map((s) => [s.key, []])), ...specializations },
      knowledge: splitList(get("Knowledge_Skills")),
      amps: parseAmps(get("Shadow_Amps")),
      gear,
      keywords: splitList(get("Keywords")),
      dispositions: splitList(get("Dispositions")),
      cues: splitList(get("Cues"), "|"),
    },
  };
}

// ---------------------------------------------------------------------------
// Fetching a sheet straight from the browser
// ---------------------------------------------------------------------------

// Google's gviz endpoint echoes an Access-Control-Allow-Origin header for the
// requesting origin, so a "anyone with the link" sheet can be read client-side
// with no backend, no OAuth and no Apps Script. That is the whole reason this
// path exists alongside api/sync-sheet.js.
export function sheetCsvUrl(input, tab) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  // Accept a full edit URL or a bare spreadsheet id.
  const id = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] ?? (/^[a-zA-Z0-9-_]{20,}$/.test(raw) ? raw : null);
  if (!id) return null;

  const base = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`;
  if (tab?.trim()) return `${base}&sheet=${encodeURIComponent(tab.trim())}`;
  // A URL copied while a tab is open carries that tab's gid; without either we
  // get the first tab, which is the right default for a one-runner sheet.
  const gid = raw.match(/[#&?]gid=(\d+)/)?.[1];
  return gid ? `${base}&gid=${gid}` : base;
}

// Minimal RFC-4180: quoted fields, escaped quotes, commas and newlines inside
// quotes. Cues and Description both contain commas, so splitting on "," loses
// half the character.
export function parseCsv(text) {
  const rows = [[]];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ",") { rows[rows.length - 1].push(cell); cell = ""; }
    else if (c === "\n") { rows[rows.length - 1].push(cell); cell = ""; rows.push([]); }
    else if (c !== "\r") cell += c;
  }
  rows[rows.length - 1].push(cell);

  if (rows.length > 1 && rows[rows.length - 1].every((c) => c === "")) rows.pop();
  return rows;
}

// Row 1 is headers, row 2 is the runner. Blank header columns are dropped —
// Sheets pads exports with trailing empty columns.
export function csvToRow(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return null;
  const headers = rows[0].map((h) => h.trim());
  const row = {};
  headers.forEach((h, i) => {
    if (h) row[h] = rows[1][i] ?? "";
  });
  return Object.keys(row).length ? row : null;
}

// One call for the UI: URL in, character out.
export async function fetchSheetCharacter(input, tab) {
  const url = sheetCsvUrl(input, tab);
  if (!url) throw new Error("That does not look like a Google Sheets link.");

  let res;
  try {
    res = await fetch(url);
  } catch {
    // A private sheet fails as a CORS/network error rather than a clean status.
    throw new Error("Could not reach the sheet. It has to be shared as \u201Canyone with the link can view\u201D.");
  }
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "No such sheet or tab. Check the tab name."
        : `The sheet returned HTTP ${res.status}.`
    );
  }

  const text = await res.text();
  // Google answers with an HTML sign-in page rather than a 4xx when a sheet is
  // not link-shared, so a status check alone is not enough.
  if (/^\s*</.test(text)) {
    throw new Error("The sheet is not public. Share it as \u201Canyone with the link can view\u201D.");
  }

  const row = csvToRow(text);
  if (!row) throw new Error("That tab has no data row. Row 1 is headers, row 2 is the runner.");
  return rowToCharacter(row);
}

// Google answers a nonexistent `sheet=` name with the FIRST tab and status "ok"
// — there is no error to catch. So a typo'd tab silently imports the wrong
// runner. Tabs here are named after their character, so a name that disagrees
// with the runner that came back is worth flagging. Soft on purpose: a sheet
// whose tabs are not named after runners would trip it harmlessly.
export function tabLooksWrong(tab, streetName) {
  if (!tab?.trim() || !streetName) return false;
  return norm(tab) !== norm(streetName);
}
