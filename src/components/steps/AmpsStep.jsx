import { AMP_CATALOG, AMP_CATEGORIES } from "../../data/catalog.js";
import { BASE_ESSENCE } from "../../data/rules.js";
import { essence, nuyen } from "../../logic/derive.js";
import "./Steps.css";

// Amps are copied out of the catalog into the character, not referenced, so
// every field stays editable once bought. That matters here more than anywhere
// else: half the nuyen figures are placeholders (see catalog.js).
let seq = 0;
const instanceId = () => `amp-${Date.now().toString(36)}-${seq++}`;

export default function AmpsStep({ character, update, spend }) {
  const ess = essence(character.amps);

  const add = (entry) =>
    update({ amps: [...character.amps, { ...entry, instanceId: instanceId() }] });

  const patch = (id, field, value) =>
    update({ amps: character.amps.map((a) => (a.instanceId === id ? { ...a, [field]: value } : a)) });

  const remove = (id) => update({ amps: character.amps.filter((a) => a.instanceId !== id) });

  return (
    <div className="step">
      <section className="panel" style={{ "--panel-accent": "var(--cat-amps)" }}>
        <header className="panel__head">
          <h2 className="panel__title">Your Shadow Amps</h2>
          <p className="panel__hint">
            Essence {ess.toFixed(1)} of {BASE_ESSENCE}. Every figure below is editable.
          </p>
          <p className="panel__total num">{nuyen(spend.amps)}</p>
        </header>

        {character.amps.length === 0 && <p className="panel__empty">Nothing grafted yet.</p>}

        {character.amps.map((amp) => (
          <div key={amp.instanceId} className="owned">
            <div className="owned__row">
              <input
                className="owned__name"
                value={amp.name}
                onChange={(e) => patch(amp.instanceId, "name", e.target.value)}
              />
              <label className="owned__num">
                <span className="label">R</span>
                <input
                  type="number"
                  className="num"
                  value={amp.rating ?? 0}
                  min={0}
                  onChange={(e) => patch(amp.instanceId, "rating", Number(e.target.value))}
                />
              </label>
              <label className="owned__num">
                <span className="label">Ess</span>
                <input
                  type="number"
                  className="num"
                  value={amp.essence ?? 0}
                  min={0}
                  step={0.5}
                  onChange={(e) => patch(amp.instanceId, "essence", Number(e.target.value))}
                />
              </label>
              <label className="owned__num owned__num--wide">
                <span className="label">¥</span>
                <input
                  type="number"
                  className="num"
                  value={amp.nuyen ?? 0}
                  min={0}
                  step={500}
                  onChange={(e) => patch(amp.instanceId, "nuyen", Number(e.target.value))}
                />
              </label>
              {amp.source && amp.source !== "book" && <span className="assumed-tag">{amp.source}</span>}
              <button type="button" className="row__remove" aria-label="Remove amp" onClick={() => remove(amp.instanceId)}>
                &times;
              </button>
            </div>
            <textarea
              className="owned__effects"
              rows={2}
              value={amp.effects ?? ""}
              placeholder="Effect text. Write RR the way the book does — 'RR 2 to Influence (impersonation)' — and the sheet picks it up."
              onChange={(e) => patch(amp.instanceId, "effects", e.target.value)}
            />
          </div>
        ))}

        <button
          type="button"
          className="ghost-button"
          onClick={() =>
            add({ name: "", category: "cyberware", rating: 1, essence: 0, nuyen: 0, effects: "", source: "custom" })
          }
        >
          + Blank amp
        </button>
      </section>

      {AMP_CATEGORIES.map((cat) => (
        <section key={cat.id} className="panel">
          <header className="panel__head">
            <h2 className="panel__title">{cat.name}</h2>
            <p className="panel__hint">{cat.hint}</p>
          </header>
          <div className="catalog">
            {AMP_CATALOG.filter((a) => a.category === cat.id).map((entry) => (
              <button key={entry.id} type="button" className="card" onClick={() => add(entry)}>
                <div className="card__head">
                  <span className="card__name">{entry.name}</span>
                  <span className="card__price num">{nuyen(entry.nuyen)}</span>
                </div>
                <div className="card__meta num">
                  {entry.rating > 0 && <span>R{entry.rating}</span>}
                  {entry.essence > 0 && <span>{entry.essence} ess</span>}
                  {entry.source !== "book" && <span className="assumed-tag">{entry.source}</span>}
                </div>
                <p className="card__effects">{entry.effects}</p>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
