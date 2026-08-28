import { useRef, useState } from "react";
import { METATYPES, TIERS } from "../../data/rules.js";
import { LIFESTYLES } from "../../data/catalog.js";
import { nuyen } from "../../logic/derive.js";
import { fileToJpegBase64 } from "../../utils/image.js";
import SheetImport from "../SheetImport.jsx";
import "./Steps.css";

// Step 1. The tier sets the whole budget, so changing it retunes every later
// step. Everything else here is flavour that the sheet prints.
export default function IdentityStep({ character, update, spend }) {
  const { identity, tier } = character;
  const metatype = METATYPES.find((m) => m.id === identity.metatype);
  const [portrait, setPortrait] = useState({ busy: false, error: null });
  const fileInput = useRef(null);

  const setField = (key, value) => update({ identity: { ...identity, [key]: value } });

  const generatePortrait = async () => {
    setPortrait({ busy: true, error: null });
    try {
      const res = await fetch("/api/generate-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ c: character.charId, identity, keywords: character.keywords }),
      });
      // A 404 here means `vite dev` with no functions behind it, not a broken
      // request. Saying "HTTP 404" sends you looking for a bug that isn't one.
      if (res.status === 404) {
        throw new Error("No /api here. Portraits need `vercel dev` (or a deploy) — see README.");
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      update({ avatarV: body.v });
      setPortrait({ busy: false, error: null });
    } catch (err) {
      setPortrait({ busy: false, error: err.message });
    }
  };

  // Upload lands on the same storage key as generation, so the two are
  // alternatives rather than separate slots — whichever ran last is what the
  // sheet shows.
  const uploadPortrait = async (file) => {
    if (!file) return;
    setPortrait({ busy: true, error: null });
    try {
      const b64 = await fileToJpegBase64(file);
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ c: character.charId, mimeType: "image/jpeg", b64 }),
      });
      if (res.status === 404) throw new Error("No /api here. Portraits need `vercel dev` (or a deploy) — see README.");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          body.error === "image_too_large"
            ? "That image is too large — try a smaller one."
            : body.error ?? `HTTP ${res.status}`
        );
      }
      update({ avatarV: body.v });
      setPortrait({ busy: false, error: null });
    } catch (err) {
      setPortrait({ busy: false, error: err.message });
    }
  };

  const setTier = (next) => {
    // Budget follows the tier, but stays its own field so a table can house-rule
    // a number the book never printed.
    update({ tier: next.id, budget: next.nuyen });
  };

  return (
    <div className="step">
      <SheetImport character={character} update={update} />

      <section className="panel" style={{ "--panel-accent": "var(--cat-attributes)" }}>
        <header className="panel__head">
          <h2 className="panel__title">Tier</h2>
          <p className="panel__hint">Sets the budget every other step draws down.</p>
        </header>
        <div className="tiers">
          {TIERS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tier ${tier === t.id ? "tier--active" : ""}`}
              onClick={() => setTier(t)}
            >
              <span className="tier__name">{t.name}</span>
              <span className="tier__nuyen num">{nuyen(t.nuyen)}</span>
              <span className="tier__blurb">{t.blurb}</span>
            </button>
          ))}
        </div>
        <label className="field field--inline">
          <span className="label">Budget override</span>
          <input
            type="number"
            className="num field__number"
            value={character.budget}
            min={0}
            step={10_000}
            onChange={(e) => update({ budget: Number(e.target.value) })}
          />
          {spend.overspent && <span className="field__warn">Already over by {nuyen(-spend.remaining)}</span>}
        </label>
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Identity</h2>
          <p className="panel__hint">The street name is the only one that matters.</p>
        </header>
        <div className="field-grid">
          <label className="field">
            <span className="label">Street name</span>
            <input value={identity.streetName} onChange={(e) => setField("streetName", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Real name</span>
            <input value={identity.realName} onChange={(e) => setField("realName", e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Concept</span>
            <input
              value={identity.concept}
              placeholder="Ex-corp decker with a debt"
              onChange={(e) => setField("concept", e.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">Lifestyle</span>
            <select value={identity.lifestyle} onChange={(e) => setField("lifestyle", e.target.value)}>
              {LIFESTYLES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.note}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Metatype</h2>
          <p className="panel__hint">
            Anarchy handles metatype narratively. Nothing here touches your attributes.
          </p>
        </header>
        <div className="metatypes">
          {METATYPES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`metatype ${identity.metatype === m.id ? "metatype--active" : ""}`}
              onClick={() => setField("metatype", m.id)}
            >
              <span className="metatype__name">{m.name}</span>
              <span className="metatype__edge num">Edge {m.edgeHint}</span>
            </button>
          ))}
        </div>
        {metatype && (
          <ul className="bullets">
            {metatype.effects.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Portrait</h2>
          <p className="panel__hint">
            The prompt is the sheet's Description column, sent to the image model as written.
          </p>
        </header>
        <div className="portrait">
          <div className="portrait__frame">
            {character.avatarV > 0 ? (
              <img
                className="portrait__img"
                src={`/api/avatar?c=${character.charId}&v=${character.avatarV}`}
                alt={`Portrait of ${identity.streetName || "this runner"}`}
              />
            ) : (
              <span className="portrait__placeholder label">No image</span>
            )}
          </div>
          <div className="portrait__side">
            <textarea
              rows={6}
              value={identity.avatarPrompt}
              placeholder="Describe the shot: who they are, what they wear, where they are standing, how it is lit."
              onChange={(e) => setField("avatarPrompt", e.target.value)}
            />
            <div className="portrait__actions">
              <button
                type="button"
                className="ghost-button"
                disabled={portrait.busy}
                onClick={generatePortrait}
              >
                {portrait.busy ? "Working…" : character.avatarV > 0 ? "Regenerate" : "Generate portrait"}
              </button>
              <button
                type="button"
                className="ghost-button"
                disabled={portrait.busy}
                onClick={() => fileInput.current?.click()}
              >
                Upload instead
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => {
                  uploadPortrait(e.target.files?.[0]);
                  e.target.value = ""; // so picking the same file twice still fires
                }}
              />
              {portrait.error && <span className="field__warn">{portrait.error}</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Background</h2>
          <p className="panel__hint">Prints at the bottom of the sheet.</p>
        </header>
        <textarea
          rows={5}
          value={identity.background}
          placeholder="Who you were before the shadows, and what it cost to leave."
          onChange={(e) => setField("background", e.target.value)}
        />
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Persona</h2>
          <p className="panel__hint">
            How to play them, in their own register. Synced from the sheet, never printed.
          </p>
        </header>
        <textarea
          rows={4}
          value={identity.persona}
          placeholder="Act as… speaks in street slang, treats every locked door as an unsecured node."
          onChange={(e) => setField("persona", e.target.value)}
        />
      </section>
    </div>
  );
}
