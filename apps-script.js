/**
 * Valten D&D Sheet → Webapp Sync
 *
 * SETUP (one-time):
 * 1. In your Google Sheet: Extensions → Apps Script → paste this file.
 * 2. In Apps Script: Project Settings → Script Properties → add:
 *      SYNC_SECRET  →  [your sync token — generate it in the app, Character list → Sheet sync]
 *      WEBHOOK_URL  →  [your app URL]/api/sync-sheet
 * 3. Run `createTrigger()` once (select it in the dropdown → Run) to set up
 *    the automatic onChange trigger.
 * 4. Run `syncToApp()` manually once to do an initial push.
 *
 * SHEET TAB STRUCTURE  (create these tabs with these exact names / columns):
 *
 * ┌─────────────┬──────────────────────────────────────────────────────────────┐
 * │ Tab name    │ Columns (row 1 = headers, data from row 2 on)                │
 * ├─────────────┼──────────────────────────────────────────────────────────────┤
 * │ Profile     │ key  │ value                                                 │
 * │             │ (keys: characterName, nickname, race, gender, background,    │
 * │             │  age, height, weight, eyes, skin, hair, description)        │
 * │             │ description is used as the avatar generation prompt base.   │
 * ├─────────────┼──────────────────────────────────────────────────────────────┤
 * │ Stats       │ key  │ value                                                 │
 * │             │ (keys: str, dex, con, int, wis, cha, proficiency, hpMax,    │
 * │             │  ac, speed, initiative, hitDiceCount, hitDiceDie, classLevel)│
 * ├─────────────┼──────────────────────────────────────────────────────────────┤
 * │ Saves       │ ability  │ proficient (TRUE/FALSE)                           │
 * │             │ (rows: str, dex, con, int, wis, cha)                        │
 * ├─────────────┼──────────────────────────────────────────────────────────────┤
 * │ Skills      │ skill  │ proficient (TRUE/FALSE)                             │
 * ├─────────────┼──────────────────────────────────────────────────────────────┤
 * │ Attacks     │ name  │ atkBonus  │ damage                                   │
 * ├─────────────┼──────────────────────────────────────────────────────────────┤
 * │ Equipment   │ name  │ quantity  │ equipped (TRUE/FALSE)                    │
 * ├─────────────┼──────────────────────────────────────────────────────────────┤
 * │ Currency    │ coin  │ amount                                               │
 * │             │ (rows: cp, ep, pp, gp, sp)                                  │
 * ├─────────────┼──────────────────────────────────────────────────────────────┤
 * │ Features    │ name  │ category  │ description                              │
 * ├─────────────┼──────────────────────────────────────────────────────────────┤
 * │ Spellcasting│ class │ label │ class_name │ ability │ save_dc │             │
 * │             │ attack_bonus │ cantrips (comma-sep) │ always_prepared        │
 * │             │ (rows: one per spellcasting class, e.g. cleric / warlock)   │
 * ├─────────────┼──────────────────────────────────────────────────────────────┤
 * │ Spell Slots │ class  │ level  │ total                                      │
 * ├─────────────┼──────────────────────────────────────────────────────────────┤
 * │ Custom      │ spell_name │ class │ level │ range │ components │ duration │  │
 * │ Spells      │ concentration │ casting_time │ ritual │ description │        │
 * │             │ material │ school │ classes (comma-sep class keys)           │
 * │             │ NOTE: level = "Cantrip", "1"–"9", or "Item" (skip magic     │
 * │             │ items). `class` = primary class; `classes` links to         │
 * │             │ knownByLevel. syncFromApp() rewrites this tab.              │
 * ├─────────────┼──────────────────────────────────────────────────────────────┤
 * │ SpellData   │ spell_name │ level │ range │ components │ duration │         │
 * │             │ concentration │ casting_time │ ritual │ description │        │
 * │             │ material │ school │ classes                                  │
 * │             │ Spell database for the in-app picker.                        │
 * │             │ level = "Cantrip" or "1"–"9" (numeric 0 also accepted).    │
 * └─────────────┴──────────────────────────────────────────────────────────────┘
 */

var TABS = [
  "Profile",
  "Stats",
  "Saves",
  "Skills",
  "Attacks",
  "Equipment",
  "Currency",
  "Features",
  "Spellcasting",
  "Spell Slots",
  "Custom Spells",
  "SpellData",
];

// Keys used in the payload match what /api/sync-sheet expects.
var TAB_KEYS = {
  "Profile": "profile",
  "Stats": "stats",
  "Saves": "saves",
  "Skills": "skills",
  "Attacks": "attacks",
  "Equipment": "equipment",
  "Currency": "currency",
  "Features": "features",
  "Spellcasting": "spellcasting",
  "Spell Slots": "spellSlots",
  "Custom Spells": "spells",
  "SpellData": "spellData",
};

function syncToApp() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty("SYNC_SECRET");
  var webhookUrl = props.getProperty("WEBHOOK_URL");

  if (!secret || !webhookUrl) {
    throw new Error("Script Properties missing: set SYNC_SECRET and WEBHOOK_URL");
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var payload = {};

  TABS.forEach(function (tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) return; // tab doesn't exist yet — skip gracefully

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return; // header only — skip

    var headers = data[0].map(function (h) { return String(h).trim(); });
    var rows = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // Skip rows where every cell is empty.
      if (row.every(function (cell) { return cell === "" || cell === null; })) continue;
      var obj = {};
      headers.forEach(function (h, j) {
        obj[h] = row[j];
      });
      rows.push(obj);
    }

    payload[TAB_KEYS[tabName]] = rows;
  });

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    headers: { Authorization: "Bearer " + secret },
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(webhookUrl, options);
  var code = response.getResponseCode();

  if (code !== 200) {
    throw new Error("Sync failed: HTTP " + code + " — " + response.getContentText());
  }

  Logger.log("Sync OK: " + response.getContentText());
}

/**
 * Reads custom spells from the app and writes them into the Custom Spells tab.
 * Run this before syncToApp() to keep the sheet in sync with in-app additions.
 */
function syncFromApp() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty("SYNC_SECRET");
  var webhookUrl = props.getProperty("WEBHOOK_URL");
  var baseUrl = webhookUrl.replace("/api/sync-sheet", "");

  var response = UrlFetchApp.fetch(baseUrl + "/api/export-spells", {
    method: "get",
    headers: { Authorization: "Bearer " + secret },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    throw new Error("Export failed: HTTP " + response.getResponseCode() + " — " + response.getContentText());
  }

  var rows = JSON.parse(response.getContentText()).rows;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Custom Spells");
  if (!sheet) sheet = ss.insertSheet("Custom Spells");

  // Safety guard: if the API returned 0 rows but the sheet already has spell
  // data, abort rather than clearing. A legitimate 0-row result is only
  // expected when the sheet is also empty (or the user has no custom spells).
  if (rows.length === 0) {
    var existingRows = sheet.getLastRow();
    if (existingRows > 1) {
      Logger.log("ABORTED: API returned 0 rows but sheet has " + (existingRows - 1) + " existing spells. Not clearing.");
      return;
    }
  }

  sheet.clearContents();

  var headers = ["spell_name", "class", "level", "range", "components", "duration",
                 "concentration", "casting_time", "ritual", "description", "material",
                 "school", "classes"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (rows.length > 0) {
    var values = rows.map(function (r) {
      return [
        r.spell_name    || "",
        r["class"]      || "",   // primary class (first entry from classes)
        r.level         || "",
        r.range         || "",
        r.components    || "",
        r.duration      || "",
        "",                      // concentration — not tracked separately
        r.casting_time  || "",
        "",                      // ritual — not tracked separately
        r.description   || "",
        "",                      // material — not tracked separately
        r.school        || "",
        r.classes       || "",
      ];
    });
    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }

  Logger.log("Wrote " + rows.length + " spells from app to Custom Spells tab.");
}

/** Run once to install a trigger that calls syncToApp() on any sheet change. */
function createTrigger() {
  // Remove existing triggers for this function to avoid duplicates.
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "syncToApp") ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger("syncToApp")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onChange()
    .create();

  Logger.log("Trigger created.");
}
