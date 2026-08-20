import { METATYPES, TIERS } from "../../data/rules.js";
import { LIFESTYLES } from "../../data/catalog.js";
import { nuyen } from "../../logic/derive.js";
import "./Steps.css";

// Step 1. The tier sets the whole budget, so changing it retunes every later
// step. Everything else here is flavour that the sheet prints.
export default function IdentityStep({ character, update, spend }) {
  const { identity, tier } = character;
  const metatype = METATYPES.find((m) => m.id === identity.metatype);

  const setField = (key, value) => update({ identity: { ...identity, [key]: value } });

  const setTier = (next) => {
    // Budget follows the tier, but stays its own field so a table can house-rule
    // a number the book never printed.
    update({ tier: next.id, budget: next.nuyen });
  };

  return (
    <div className="step">
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
    </div>
  );
}
