import { ATTRIBUTES, ATTRIBUTE_MAX, ATTRIBUTE_MIN, COSTS } from "../../data/rules.js";
import { nuyen } from "../../logic/derive.js";
import "./Steps.css";

// Every point costs, including the mandatory first one in each attribute. The
// track shows what you are paying for, not what is "free".
export default function AttributesStep({ character, update, spend }) {
  const set = (key, value) =>
    update({
      attributes: {
        ...character.attributes,
        [key]: Math.max(ATTRIBUTE_MIN, Math.min(ATTRIBUTE_MAX, value)),
      },
    });

  return (
    <div className="step">
      <section className="panel" style={{ "--panel-accent": "var(--cat-attributes)" }}>
        <header className="panel__head">
          <h2 className="panel__title">Attributes</h2>
          <p className="panel__hint">
            {nuyen(COSTS.attributePoint)} per point, first point included. Max {ATTRIBUTE_MAX}.
          </p>
          <p className="panel__total num">{nuyen(spend.attributes)}</p>
        </header>

        <div className="attrs">
          {ATTRIBUTES.map((attr) => {
            const value = character.attributes[attr.key];
            return (
              <div key={attr.key} className="attr">
                <div className="attr__head">
                  <span className="attr__abbr">{attr.abbr}</span>
                  <span className="attr__name">{attr.name}</span>
                  <span className="attr__cost num">{nuyen(value * COSTS.attributePoint)}</span>
                </div>
                <div className="track">
                  {Array.from({ length: ATTRIBUTE_MAX }, (_, i) => i + 1).map((pip) => (
                    <button
                      key={pip}
                      type="button"
                      className={`track__pip ${pip <= value ? "track__pip--on" : ""}`}
                      aria-label={`${attr.name} ${pip}`}
                      // Clicking the pip you are already on steps back down, so
                      // the track works both ways without a second control.
                      onClick={() => set(attr.key, pip === value ? pip - 1 : pip)}
                    >
                      <span className="num">{pip}</span>
                    </button>
                  ))}
                </div>
                <p className="attr__note">{attr.note}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
