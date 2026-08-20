# Shadowrun: Anarchy 2.0 character builder

A nuyen-budget character builder for *Shadowrun: Anarchy 2.0*, built on the same
stack as `dnd_multi-user`: Vite + React, hash routing, Google sign-in, Upstash
Redis behind per-character keys, deployed on Vercel.

Six creation steps draw down one budget, a sheet renders from what you spent,
and the whole thing prints to PDF for the table.

---

## Installing over the existing repo

Everything under `api/`, `lib/`, and the three files below is game-agnostic and
carries over untouched:

| Keep as-is | Why |
|---|---|
| `api/*`, `lib/*` | auth, storage, characters, Stripe, sheet sync. None of it knows what game it is storing. |
| `src/main.jsx` | hash router and auth gate |
| `src/Login.jsx` | sign-in screen |
| `src/CharacterList.jsx` | character list, sync token, delete |
| `src/hooks/*` | `usePersistedState`, `useMediaQuery` |

Replace or add these:

```
index.html                      font pairing and title
src/App.jsx                     step orchestration
src/App.css
src/Home.css                    restyled character list and login
src/styles/tokens.css           palette, type, spacing
src/styles/global.css
src/data/rules.js               costs, tiers, attributes, skills, metatypes, risk table
src/data/catalog.js             Shadow Amp and gear catalogs
src/data/character.js           seed shape and persona suggestions
src/logic/derive.js             spend, dice pools, thresholds, Essence, RR, validation
src/components/BurnBar.{jsx,css}
src/components/StepNav.{jsx,css}
src/components/SheetView.{jsx,css}
src/components/ui/Panel.{jsx,css}
src/components/ui/RatingTrack.{jsx,css}
src/components/steps/*.jsx
src/components/steps/Steps.css
```

Delete the old sheet components (`AbilitiesPanel`, `CombatPanel`,
`SpellsPanel`, `EquipmentPanel`, `FeaturesPanel`, `BackgroundPanel`, `Header`,
`SpellPicker`, `SpellRow`, `MagicItemCard`, `cards/`, `layout/`, `ui/`) and the
old `src/data/{character,spells,feats,magicItems}.js`.

Two API files reference D&D concepts and need attention if you keep them:
`api/sync-sheet.js` parses Profile / Stats / Saves / Skills / Attacks tabs, and
`api/generate-avatar.js` builds a fantasy prompt from `classLevel`. Neither is
imported by this build. Delete them or rewrite them, and note that deleting
frees two of Vercel Hobby's twelve function slots.

`package.json` and `vite.config.js` need no changes. `npm run dev` works as
before.

### State migration

There is none, and none is needed. Anarchy characters live under the same
`sheet:<cid>:` prefix but different keys (`attributes`, `skills`, `amps`, `gear`,
`keywords`, and so on), so an existing D&D character and a new runner can sit in
the same account without colliding. State is split across twelve keys rather
than one blob, so adding a field later merges over an old save instead of
overwriting it.

---

## The six steps

| Step | What it costs | Notes |
|---|---|---|
| Identity | free | Tier sets the budget: 200k / 300k / 400k / 500k. Metatype is narrative only. |
| Attributes | 10,000&yen; per point | Min 1, max 6, and yes, the mandatory 1s and Edge are charged. |
| Skills | 2,500&yen; per point | Specializations are free and add +2 dice. Knowledge skills are 1,250&yen; each. |
| Shadow Amps | varies | Cyberware, bioware, awakening, adept powers, named weapons, contacts, qualities. Costs Essence. |
| Gear | varies | Ordinary kit. Buys permission, not dice. |
| Persona | free | Keywords, Dispositions, Cues. The part the table actually remembers. |
| Sheet | — | Renders everything, validates, prints. |

---

## What is computed, and where it comes from

Verified against the preview PDF:

- **Physical wound thresholds** are `Strength + Armor`, then `+3`, then `+6`.
  Checked against Echo (STR 2 no armor gives 2/5/8; with Kevlar Vest 3 gives
  5/8/11), the ganger blocks (STR 3 + Armor 1 gives 4/7/10), and the combat
  example on p.72 (STR 4, Armor 2 gives 6/9/12).
- **Mental wound thresholds** are `Willpower`, `+3`, `+6`.
- **Dice pool** is `skill rating + linked attribute`, plus 2 for a bought
  specialization. A skill at 0 still rolls its attribute (p.64).
- **Unarmed DV equals Strength.** Echo STR 2 gives DV 2; ganger STR 3 gives DV
  3, ork 4, troll 5.
- **Armor** is the single highest worn rating, not a sum, plus grafted bonuses.
- **Essence** starts at 6 and cannot go below 0.
- **Risk Reduction** is parsed out of your amp effect text. Write it the way the
  book does, `RR 1 to Stealth (physical sneaking)`, and it lands on the sheet in
  the RR column. Multiple sources stack, capped at RR 3 (p.71).

A specialization that no amp targets and you have not bought is hidden. One that
an amp targets but you have not bought still appears, dimmed and without the +2,
because the p.243 legend notes those swap the linked attribute even when the
character lacks the specialization.

### Costs that are placeholders

The Shadow Amp base rating table (p.61) and the Mundane World gear tables
(pp. 136 to 160) are not in the preview PDF. Every catalog entry carries a
`source` field:

- `book` means the number or effect text is quoted from the PDF.
- `assumed` means it was scaled from the worked example and is a guess. These
  render an orange **ASSUMED** tag in the catalog and in your amp list.

Rating, Essence and nuyen stay editable on every amp and gear item, so
correcting one from the full book means typing over a number. Once a value is
confirmed, flip its `source` to `"book"` in `src/data/catalog.js` and the tag
disappears.

Awakened variant ratings (Magician 5, Sorcerer 2, Conjurer 3, Clairvoyant 2,
Adept 1, Mystic Adept 5) and their effect text **are** from the book, p.169.
Only their nuyen costs are assumed.

### A bug in the quickguide

`Quickguide_-_SA2_-_Character_Creator.pdf` prints **12 points / 120,000&yen;**
for the example's attributes, but its own itemized rows add to 16 points and
160,000&yen;. The skills table prints **15 / 37,500&yen;** against 16 rows worth
40,000&yen;. In both cases the SUM range stops one row short of the data. This
builder charges what the itemized rows charge, and says so in a panel on the
attributes step.

---

## Design

The palette is coded to Shadowrun's three planes so color carries information
rather than decorating:

| | |
|---|---|
| amber `#f0a82e` | mundane, meat, nuyen |
| cyan `#35d6e5` | Matrix, learned data |
| violet `#a96bff` | awakened, grafted chrome |
| steel `#8a93a6` | hardware you carry |
| blood `#ff4d5e` | glitch, wounds, overspend, and nothing else |

Ground is `#0b0e13`, desaturated blue-grey rather than black: the sky above the
port, the color of television tuned to a dead channel.

Type is Chakra Petch for display, IBM Plex Sans for body, IBM Plex Mono for
every number, because the whole app is a spending ledger.

The signature element is the **burn bar**: a credstick balance strip where
unspent nuyen renders as scanlined static and each category lights a segment.
Overspend breaches the frame with a red diagonal hatch and splits the remaining
figure into offset cyan and red. That is the one loud object; everything else
stays quiet.

Quality floor: responsive to mobile, visible keyboard focus, `prefers-reduced-motion`
respected, and a print stylesheet that strips the chrome and inverts to
black-on-white.

---

## Still to do

- Confirm the assumed amp and gear costs against pp. 58 to 61 and 136 to 160.
- Confirm the skill list. It was assembled from Echo's sheet, the NPC blocks and
  skills named in rules text, since the skills table on pp. 52 to 54 is not in
  the preview.
- Spells and spirits. Awakened characters can buy the amp, but there is no spell
  picker yet. The old `SpellPicker` and `SpellsPanel` are a reasonable starting
  shape if you want one.
- Vehicle and drone stat blocks (Pilot, Body, Armor, Handling, Speed) if riggers
  matter at your table.
