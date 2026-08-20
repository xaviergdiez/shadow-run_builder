import { GEAR_CATALOG } from "../../data/catalog.js";
import { armorRating, nuyen, physicalThresholds } from "../../logic/derive.js";
import "./Steps.css";

let seq = 0;
const instanceId = () => `gear-${Date.now().toString(36)}-${seq++}`;

// Gear buys narrative permission, not dice. The one number that feeds the sheet
// is armor, so it gets its own readout here rather than hiding until step 7.
export default function GearStep({ character, update, spend }) {
  const armor = armorRating(character.gear, character.amps);
  const thresholds = physicalThresholds(character.attributes.strength, armor);

  const add = (entry) => {
    const existing = character.gear.find((g) => g.id === entry.id);
    if (existing) {
      update({
        gear: character.gear.map((g) =>
          g.instanceId === existing.instanceId ? { ...g, qty: (g.qty ?? 1) + 1 } : g
        ),
      });
      return;
    }
    update({ gear: [...character.gear, { ...entry, qty: 1, instanceId: instanceId() }] });
  };

  const patch = (id, field, value) =>
    update({ gear: character.gear.map((g) => (g.instanceId === id ? { ...g, [field]: value } : g)) });

  const remove = (id) => update({ gear: character.gear.filter((g) => g.instanceId !== id) });

  return (
    <div className="step">
      <section className="panel" style={{ "--panel-accent": "var(--cat-gear)" }}>
        <header className="panel__head">
          <h2 className="panel__title">Carried</h2>
          <p className="panel__hint">
            Armor {armor} · wound thresholds {thresholds.join(" / ")}
          </p>
          <p className="panel__total num">{nuyen(spend.gear)}</p>
        </header>

        {character.gear.length === 0 && <p className="panel__empty">Empty pockets.</p>}

        {character.gear.map((item) => (
          <div key={item.instanceId} className="owned">
            <div className="owned__row">
              <input
                className="owned__name"
                value={item.name}
                onChange={(e) => patch(item.instanceId, "name", e.target.value)}
              />
              <label className="owned__num">
                <span className="label">×</span>
                <input
                  type="number"
                  className="num"
                  value={item.qty ?? 1}
                  min={1}
                  onChange={(e) => patch(item.instanceId, "qty", Number(e.target.value))}
                />
              </label>
              <label className="owned__num owned__num--wide">
                <span className="label">¥</span>
                <input
                  type="number"
                  className="num"
                  value={item.nuyen ?? 0}
                  min={0}
                  step={100}
                  onChange={(e) => patch(item.instanceId, "nuyen", Number(e.target.value))}
                />
              </label>
              {item.source === "assumed" && <span className="assumed-tag">assumed</span>}
              <button type="button" className="row__remove" aria-label="Remove gear" onClick={() => remove(item.instanceId)}>
                &times;
              </button>
            </div>
            <input
              className="owned__effects"
              value={item.note ?? ""}
              placeholder="Note. Anything with a 'DV 4' in it lands in the weapons table on the sheet."
              onChange={(e) => patch(item.instanceId, "note", e.target.value)}
            />
          </div>
        ))}

        <button
          type="button"
          className="ghost-button"
          onClick={() => add({ id: null, name: "", nuyen: 0, note: "", source: "custom" })}
        >
          + Blank item
        </button>
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Mundane world</h2>
          <p className="panel__hint">Click again to buy a second one.</p>
        </header>
        <div className="catalog">
          {GEAR_CATALOG.map((entry) => (
            <button key={entry.id} type="button" className="card card--sm" onClick={() => add(entry)}>
              <div className="card__head">
                <span className="card__name">{entry.name}</span>
                <span className="card__price num">{nuyen(entry.nuyen)}</span>
              </div>
              <p className="card__effects">
                {entry.note}
                {entry.source === "assumed" && <span className="assumed-tag">assumed</span>}
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
