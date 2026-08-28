import { useState } from "react";
import { fetchSheetCharacter, tabLooksWrong } from "../logic/importSheet.js";
import { nuyen, spendBreakdown } from "../logic/derive.js";

// Pulls a runner straight from a Google Sheet in the browser. Google's gviz
// endpoint sends CORS headers for the requesting origin, so a link-shared sheet
// needs no backend, no OAuth and no Apps Script — which is the point: this works
// in plain `vite dev`, where /api does not exist at all.
//
// Fetch and apply are deliberately two steps. An import replaces skills, amps
// and gear wholesale, and a mistyped tab name silently returns the first tab,
// so you see who arrived before anything is overwritten.
export default function SheetImport({ character, update }) {
  const source = character.sheetSource ?? { url: "", tab: "" };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const setSource = (patch) => update({ sheetSource: { ...source, ...patch } });

  const load = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await fetchSheetCharacter(source.url, source.tab));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    // Tier and budget are not in the sheet and are not in `state`, so they
    // survive untouched. So does the portrait.
    update(result.state);
    setResult(null);
  };

  const preview = result && spendBreakdown({ ...result.state, budget: character.budget });
  const mismatch = result && tabLooksWrong(source.tab, result.state.identity.streetName);

  return (
    <section className="panel" style={{ "--panel-accent": "var(--cat-skills)" }}>
      <header className="panel__head">
        <h2 className="panel__title">Import from sheet</h2>
        <p className="panel__hint">
          Paste the Google Sheet link. It has to be shared as “anyone with the link can view”.
          One tab per runner, headers in row 1.
        </p>
      </header>

      <div className="import__row">
        <label className="field import__url">
          <span className="label">Sheet link</span>
          <input
            value={source.url}
            placeholder="https://docs.google.com/spreadsheets/d/…"
            onChange={(e) => setSource({ url: e.target.value })}
          />
        </label>
        <label className="field import__tab">
          <span className="label">Tab</span>
          <input
            value={source.tab}
            placeholder="first tab"
            onChange={(e) => setSource({ tab: e.target.value })}
          />
        </label>
        <button type="button" className="ghost-button" disabled={busy || !source.url.trim()} onClick={load}>
          {busy ? "Reading…" : "Read sheet"}
        </button>
      </div>

      {error && <p className="import__error">{error}</p>}

      {result && (
        <div className="import__review">
          <div className="import__who">
            <p className="label">Found</p>
            <p className="import__name">{result.state.identity.streetName || "(unnamed)"}</p>
            <p className="import__meta">
              {[result.state.identity.metatype, result.state.identity.concept].filter(Boolean).join(" · ")}
            </p>
          </div>

          <ul className="import__counts num">
            <li>{Object.values(result.state.skills).filter((r) => r > 0).length} skills</li>
            <li>{result.state.amps.length} amps</li>
            <li>{result.state.gear.length} gear</li>
            <li>{result.state.cues.length} cues</li>
            <li>{nuyen(preview.total)}</li>
          </ul>

          {mismatch && (
            <p className="import__warn">
              Tab “{source.tab}” returned a runner called “{result.state.identity.streetName}”. Google
              falls back to the first tab when a tab name does not match, so check this is who you meant.
            </p>
          )}

          {result.unmapped.length > 0 && (
            <div className="import__unmapped">
              <p className="label">{result.unmapped.length} not imported</p>
              <ul>
                {result.unmapped.map((u, i) => (
                  <li key={i}>
                    <strong>{u.column}</strong> “{u.value}” — {u.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="import__actions">
            <button type="button" className="ghost-button import__apply" onClick={apply}>
              Replace this runner
            </button>
            <button type="button" className="ghost-button" onClick={() => setResult(null)}>
              Cancel
            </button>
            <span className="import__note">
              Overwrites attributes, skills, amps, gear and persona. Tier, budget and portrait stay.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
