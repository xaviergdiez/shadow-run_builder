/**
 * Shadowrun: Anarchy 2.0 — Sheet → builder sync
 *
 * SHEET STRUCTURE
 *   One tab per runner. Row 1 = headers, row 2 = that runner. Extra rows are
 *   ignored, so you can keep notes below the character.
 *
 *   Name, Metatype, Concept, Strength, Agility, Logic, Willpower, Charisma,
 *   Edge, Skills, Knowledge_Skills, Shadow_Amps, Weapons, Armor, Gear,
 *   Keywords, Dispositions, Cues, Description, Persona
 *
 *   Skills            Electronics:5 (Cracking +2); Influence:1
 *   Knowledge_Skills  semicolon separated
 *   Shadow_Amps       Name (0.5 Essence) (Rating 2) [effect text]; ...
 *   Weapons/Armor     Light Pistol (DV 4); Lined Coat (Armor 2)
 *   Cues              pipe separated, because cues contain commas
 *   Description       the avatar image prompt, used verbatim
 *   Persona           the roleplay brief, sheet only
 *
 * SETUP (one-time)
 *   1. Extensions → Apps Script → paste this file → Save.
 *   2. Reload the spreadsheet. A "Shadowrun" menu appears.
 *   3. Shadowrun → Set webhook URL, and enter  [your app URL]/api/sync-sheet
 *   4. Open a runner's tab, then Shadowrun → Set sync token for this tab, and
 *      paste the token from the app (runner list → Sheet sync).
 *      Each tab needs its own token: a token addresses one character.
 *   5. Shadowrun → Sync this tab.
 *   6. Optional: Shadowrun → Install auto-sync trigger.
 */

var WEBHOOK_PROP = "WEBHOOK_URL";

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Shadowrun")
    .addItem("Sync this tab", "syncActiveTab")
    .addItem("Sync every tab with a token", "syncAllTabs")
    .addSeparator()
    .addItem("Set sync token for this tab", "setTokenForActiveTab")
    .addItem("Set webhook URL", "setWebhookUrl")
    .addSeparator()
    .addItem("Install auto-sync trigger", "createTrigger")
    .addToUi();
}

// A token addresses one character, so it is stored per tab rather than once
// for the whole workbook.
function tokenPropName(tabName) {
  return "TOKEN_" + tabName;
}

function setTokenForActiveTab() {
  var ui = SpreadsheetApp.getUi();
  var tab = SpreadsheetApp.getActiveSheet().getName();
  var res = ui.prompt(
    "Sync token for \"" + tab + "\"",
    "Paste the token from the app: runner list → Sheet sync.",
    ui.ButtonSet.OK_CANCEL
  );
  if (res.getSelectedButton() !== ui.Button.OK) return;

  var token = res.getResponseText().trim();
  if (!token) return;
  PropertiesService.getScriptProperties().setProperty(tokenPropName(tab), token);
  ui.alert("Token saved for \"" + tab + "\".");
}

function setWebhookUrl() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();
  var res = ui.prompt(
    "Webhook URL",
    "Your app URL plus /api/sync-sheet",
    ui.ButtonSet.OK_CANCEL
  );
  if (res.getSelectedButton() !== ui.Button.OK) return;

  var url = res.getResponseText().trim();
  if (!url) return;
  props.setProperty(WEBHOOK_PROP, url);
  ui.alert("Webhook URL saved.");
}

// ── Sync ─────────────────────────────────────────────────────────────────────

function syncActiveTab() {
  var result = pushTab(SpreadsheetApp.getActiveSheet());
  SpreadsheetApp.getUi().alert(describe(result));
}

function syncAllTabs() {
  var props = PropertiesService.getScriptProperties();
  var lines = [];

  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function (sheet) {
    // No token means the tab is not a runner (notes, tables, scratch), so it
    // is skipped silently rather than reported as a failure.
    if (!props.getProperty(tokenPropName(sheet.getName()))) return;
    lines.push(describe(pushTab(sheet)));
  });

  SpreadsheetApp.getUi().alert(lines.length ? lines.join("\n\n") : "No tab has a sync token yet.");
}

function pushTab(sheet) {
  var tab = sheet.getName();
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty(tokenPropName(tab));
  var webhookUrl = props.getProperty(WEBHOOK_PROP);

  if (!webhookUrl) return { tab: tab, error: "No webhook URL set (Shadowrun → Set webhook URL)." };
  if (!token) return { tab: tab, error: "No sync token for this tab (Shadowrun → Set sync token for this tab)." };

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return { tab: tab, error: "No data row — row 1 is headers, row 2 is the runner." };

  var headers = data[0].map(function (h) { return String(h).trim(); });
  var row = {};
  var empty = true;
  headers.forEach(function (h, j) {
    if (!h) return;
    var cell = data[1][j];
    row[h] = cell === null || cell === undefined ? "" : String(cell);
    if (row[h] !== "") empty = false;
  });
  if (empty) return { tab: tab, error: "Row 2 is empty." };

  var response = UrlFetchApp.fetch(webhookUrl, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ row: row }),
    headers: { Authorization: "Bearer " + token },
    muteHttpExceptions: true,
  });

  var code = response.getResponseCode();
  var text = response.getContentText();
  if (code !== 200) return { tab: tab, error: "HTTP " + code + " — " + text };

  var body = JSON.parse(text);
  Logger.log("Synced " + tab + ": " + text);
  return { tab: tab, name: body.name, unmapped: body.unmapped || [] };
}

// Anything the builder could not place is shown rather than logged. A skill
// filed under the wrong parent silently vanishing is exactly the failure this
// sync would otherwise hide.
function describe(result) {
  if (result.error) return "✖ " + result.tab + ": " + result.error;

  var head = "✔ " + result.tab + " → " + (result.name || "(unnamed)");
  if (!result.unmapped.length) return head;

  var lines = result.unmapped.map(function (u) {
    return "   • " + u.column + ": \"" + u.value + "\" — " + u.reason;
  });
  return head + "\n" + result.unmapped.length + " entry(s) not imported:\n" + lines.join("\n");
}

/** Installs an onChange trigger that pushes every tokened tab. */
function createTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "onSheetChange") ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger("onSheetChange")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onChange()
    .create();

  SpreadsheetApp.getUi().alert("Auto-sync installed. Every edit pushes each tab that has a token.");
}

// Trigger entry point: no UI, because a trigger has no user to alert.
function onSheetChange() {
  var props = PropertiesService.getScriptProperties();
  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function (sheet) {
    if (!props.getProperty(tokenPropName(sheet.getName()))) return;
    Logger.log(describe(pushTab(sheet)));
  });
}
