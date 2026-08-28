# Shadowrun: Anarchy 2.0 character builder

A nuyen-budget character builder for *Shadowrun: Anarchy 2.0*, built on the same
stack as `dnd_multi-user`: Vite + React, hash routing, Google sign-in, Upstash
Redis behind per-character keys, deployed on Vercel.

Six creation steps draw down one budget, a sheet renders from what you spent,
and the whole thing prints to PDF for the table.

---

## Running it

```
npm install
npm run dev          # http://localhost:5173
```

`npm run dev` is standalone. There is no `/api` behind Vite, so sign-in is
stubbed, runners live in `localStorage`, and a banner on the runner list says
so. Everything in the six steps and the sheet works.

For the real stack — Google sign-in, Upstash-backed characters, sheet sync,
portrait generation — run `vercel link`, then `vercel dev` (port 3000).

Sign-in needs **both** of these on the OAuth client, or Google answers
`Error 400: redirect_uri_mismatch`. The app derives the URI from the request
host, so localhost and the deployed domain are two different entries:

```
http://localhost:3000/api/auth/callback
https://<your-domain>/api/auth/callback
```

Borrowing another project's OAuth client works, but it will only have that
project's URIs registered.

**`.env.local` alone is not enough for `vercel dev`.** It injects the linked
project's environment variables into functions, so a value that exists only in
`.env.local` reaches the Vite side and nothing else — the function sees
`undefined`. Anything `api/` reads has to be on the project:

```
printf '%s' "$VALUE" | vercel env add GEMINI_API_KEY development
vercel env pull .env.local
```

The Upstash pair arrives on its own once a Redis store is connected to the
project (`vercel integration-resource connect <store> <project>`).

```
node src/logic/importSheet.test.js    # the sheet parser, asserts only
```

### Layout

| | |
|---|---|
| `api/`, `lib/` | auth, storage, characters, sheet sync, avatars. Game-agnostic apart from `sync-sheet.js`. |
| `src/data/` | `rules.js` costs and tables, `catalog.js` amps and gear, `character.js` seeds |
| `src/logic/` | `derive.js` spend and dice pools, `importSheet.js` sheet parser |
| `src/components/steps/` | the six creation steps |

State is split across thirteen `sheet:<cid>:` keys rather than one blob, so
adding a field later merges over an old save instead of overwriting it.

Every key this app writes is prefixed `sr:` (`NS` in `lib/storage.js`), so one
Upstash database can serve this build and the D&D ones. That prefix is not
cosmetic: character *state* was always namespaced per cid, but the character
*list* is not — `lib/auth.js` keeps one flat `chars` array at `user:<uid>`,
keyed on the Google account alone. Unprefixed, both apps share one list, in
both apps. The D&D builds keep their unprefixed keys; there is nothing to
migrate.

---

## Sheet sync

One Google Sheet tab per runner. Row 1 is headers, row 2 is the character:

```
Name, Metatype, Concept, Strength, Agility, Logic, Willpower, Charisma, Edge,
Skills, Knowledge_Skills, Shadow_Amps, Weapons, Armor, Gear, Keywords,
Dispositions, Cues, Description, Persona
```

| Column | Format |
|---|---|
| `Skills` | `Electronics:5 (Cracking +2); Influence:1` — semicolon separated |
| `Shadow_Amps` | `Name (0.5 Essence) (Rating 2) [effect text]; ...` |
| `Weapons` / `Armor` / `Gear` | `Light Pistol (DV 4); Lined Coat (Armor 2)` |
| `Cues` | pipe separated, because cues contain commas |
| `Description` | the portrait prompt, sent to the image model verbatim |
| `Persona` | the roleplay brief. Stored, never printed. |

Paste `apps-script.js` into Extensions &rarr; Apps Script, reload, then use the
**Shadowrun** menu: set the webhook URL once, then a sync token per tab (each
token addresses one character — mint them in the app, runner list &rarr; Sheet
sync).

A sync **replaces** skills, specializations, amps and gear, and leaves tier,
budget and step alone — the sheet has no column for those.

### What does not import silently

The sheet's skill model is not `rules.js`'s. `Electronics:5 (Cracking +2)` files
Cracking as an Electronics specialization; `rules.js` has Cracking as a
top-level skill with its own specializations. Anything that cannot be placed
comes back in the sync response and the Apps Script shows it:

```
✔ Count_Zero → Count Zero
3 entry(s) not imported:
   • Skills: "Electronics (Cracking)" — specialization not listed for that skill
```

Unmatched specializations are dropped rather than imported, because `SheetView`
prints a `+2` beside every owned specialization and `dicePool` only grants it
for one `rules.js` knows — importing the name would print a bonus the dice pool
beside it does not include. Fix the sheet, or add the specialization to
`rules.js`.

Amp and gear prices are **not** in the sheet. Catalog name matches bring a
price; everything else lands at 0 for you to fill in, because a guessed price
would quietly move the budget bar.

---

## Portraits

`Description` is used as the image prompt as written, with framing appended.
Runners built in the app instead of synced get a prompt assembled from metatype,
concept and keywords. Generation is Gemini; the image lands in the sheet header
and prints with it.

Or skip generation: **Upload instead** on the Portrait panel takes a JPEG, PNG
or WebP, downscales it in the browser (`src/utils/image.js`) and `POST`s it to
the same storage key. Generated or uploaded, whichever ran last is what the
sheet shows.

Unmetered on purpose: the D&D build gated this behind Stripe credits, this one
has no Stripe and the endpoint is already behind sign-in.

Measured against `gemini-3.1-flash-image`: it returns a 768&times;1376 JPEG at
about 910KB, which is ~1.19MB base64 — over Upstash's 1MB request cap. The
`sharp` step is what makes the save work, and not by resizing (the image is
already 768 wide) but by re-encoding: ~213KB, ~277KB base64. Do not remove it.

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

- Reconcile the sheet's skill model with `rules.js`. Count Zero and Fox between
  them have three specializations filed under the wrong parent skill (Cracking
  and Matrix Sneaking under Electronics/Stealth, Matrix under Perception).
  Either move them in the sheet or widen the specialization lists.
- Confirm the assumed amp and gear costs against pp. 58 to 61 and 136 to 160.
- Confirm the skill list. It was assembled from Echo's sheet, the NPC blocks and
  skills named in rules text, since the skills table on pp. 52 to 54 is not in
  the preview.
- Spells and spirits. Awakened characters can buy the amp, but there is no spell
  picker yet. The old `SpellPicker` and `SpellsPanel` are a reasonable starting
  shape if you want one.
- Vehicle and drone stat blocks (Pilot, Body, Armor, Handling, Speed) if riggers
  matter at your table.
