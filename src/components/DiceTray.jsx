import { useState } from "react";
import { DIFFICULTY_TABLE, DRAIN } from "../data/rules.js";
import { GLITCH_LEGEND, RISK_LEVELS, resolveRoll, riskDiceFor } from "../logic/roll.js";
import "./DiceTray.css";

// Everything is prefilled from the sheet and everything stays editable — the
// same bargain the amp and gear catalogs make. The GM sets the hit threshold
// per roll, so it is a control here rather than a constant in rules.js.
export default function DiceTray({ open, onClose }) {
  // Every hook runs before any early return — `open` toggling must not change
  // how many hooks React sees.
  const [target, setTarget] = useState(5);
  const [level, setLevel] = useState("none");
  const [pool, setPool] = useState(0);
  const [rr, setRr] = useState(0);
  // 0 means "use the p.70 grid"; any other value is a deliberate override.
  const [riskDice, setRiskDice] = useState(0);
  const [log, setLog] = useState([]);
  const [lastKey, setLastKey] = useState(null);

  // Clicking a different skill reloads pool and RR from that row, but leaves
  // the GM's threshold and the risk level where they were — those hold across
  // a scene, the pool does not.
  const key = open ? `${open.label}:${open.pool}:${open.rr}` : null;
  if (key !== lastKey) {
    setLastKey(key);
    setPool(open?.pool ?? 0);
    setRr(open?.rr ?? 0);
    setRiskDice(0);
  }

  if (!open) return null;

  const risk = riskDiceFor(rr, level);
  const dice = level === "none" ? 0 : riskDice || risk.dice;

  const roll = () => {
    const result = resolveRoll({ pool, target, riskDice: dice, rr });
    // Drain is not a separate roll — it is what the glitch means when the
    // test was Sorcery or Conjuring.
    const magical = open.skillKey === "sorcery" || open.skillKey === "conjuring";
    setLog(
      [
        {
          ...result,
          label: open.label,
          level,
          drain: magical ? DRAIN[result.glitch.id] ?? null : null,
          id: `${Date.now()}-${log.length}`,
        },
        ...log,
      ].slice(0, 6)
    );
  };

  return (
    <section className="tray no-print" style={{ "--panel-accent": "var(--cat-skills)" }}>
      <header className="tray__head">
        <div>
          <p className="label">Rolling</p>
          <h2 className="tray__title">{open.label}</h2>
        </div>
        <button type="button" className="row__remove" aria-label="Close dice tray" onClick={onClose}>
          &times;
        </button>
      </header>

      <div className="tray__controls">
        <label className="field">
          <span className="label">Pool</span>
          <input type="number" className="num" min={0} value={pool} onChange={(e) => setPool(Number(e.target.value))} />
        </label>

        <label className="field">
          <span className="label">Hits on</span>
          <select value={target} onChange={(e) => setTarget(Number(e.target.value))}>
            <option value={4}>4+</option>
            <option value={5}>5+</option>
            <option value={6}>6 only</option>
          </select>
        </label>

        <label className="field">
          <span className="label">Risk</span>
          <select
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setRiskDice(0); // fall back to the table for the new level
            }}
          >
            {RISK_LEVELS.map((l) => (
              <option key={l.id} value={l.id} disabled={!riskDiceFor(rr, l.id).available}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="label">Risk dice</span>
          <input
            type="number"
            className="num"
            min={0}
            value={dice}
            onChange={(e) => setRiskDice(Number(e.target.value))}
            disabled={level === "none"}
          />
        </label>

        <label className="field">
          <span className="label">RR</span>
          <input type="number" className="num" min={0} value={rr} onChange={(e) => setRr(Number(e.target.value))} />
        </label>

        <button type="button" className="ghost-button tray__roll" onClick={roll}>
          Roll
        </button>
      </div>

      {risk.openEnded && level !== "none" && (
        <p className="tray__note">
          The book prints “{dice}+ dice” here — that is a floor, so raise it if the GM says so.
        </p>
      )}

      {log.length === 0 ? (
        <p className="tray__hint">
          Thresholds: {DIFFICULTY_TABLE.map((d) => `${d.difficulty} ${d.threshold}`).join(" · ")}
        </p>
      ) : (
        <ul className="tray__log">
          {log.map((r) => (
            <li key={r.id} className={`roll roll--${r.glitch.id}`}>
              <div className="roll__head">
                <span className="roll__label">{r.label}</span>
                <span className="roll__hits num">
                  {r.hits} <span className="roll__hits-word">{r.hits === 1 ? "hit" : "hits"}</span>
                </span>
              </div>

              <div className="roll__dice">
                {r.poolRolls.map((d, i) => (
                  <span key={`p${i}`} className={`die ${d >= r.target ? "die--hit" : ""}`}>
                    {d}
                  </span>
                ))}
                {r.riskRolls.length > 0 && <span className="roll__sep" aria-hidden="true" />}
                {r.riskRolls.map((d, i) => (
                  <span
                    key={`r${i}`}
                    className={`die die--risk ${d >= r.target ? "die--hit" : ""} ${d === 1 ? "die--one" : ""}`}
                  >
                    {d}
                  </span>
                ))}
              </div>

              <p className="roll__detail">
                {r.poolHits} from the pool
                {r.riskRolls.length > 0 && `, ${r.riskHits} from risk`}
                {r.riskRolls.length > 0 &&
                  ` · ${r.ones} ${r.ones === 1 ? "one" : "ones"}${r.rr > 0 ? ` less RR ${r.rr}` : ""} = ${r.remainingOnes}`}
                {r.glitch.id !== "none" && ` · ${r.glitch.name}`}
              </p>

              {r.drain && <p className="roll__drain">Drain — {r.drain}</p>}
            </li>
          ))}
        </ul>
      )}

      <p className="tray__legend">{GLITCH_LEGEND}</p>
    </section>
  );
}
