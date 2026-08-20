import { nuyen } from "../logic/derive.js";
import "./BurnBar.css";

const SEGMENTS = [
  { key: "attributes", label: "Attributes", varName: "--cat-attributes" },
  { key: "skills", label: "Skills", varName: "--cat-skills" },
  { key: "knowledge", label: "Knowledge", varName: "--cat-knowledge" },
  { key: "amps", label: "Shadow Amps", varName: "--cat-amps" },
  { key: "gear", label: "Gear", varName: "--cat-gear" },
];

// The one loud object in the app. It reads as a credstick balance strip:
// scanlined void for what is unspent, a lit segment for every category you
// have committed nuyen to. Overspend pushes past the frame and goes blood red.
export default function BurnBar({ spend, budget, essence }) {
  const pct = (n) => `${Math.max(0, Math.min(100, (n / budget) * 100))}%`;
  const committedPct = Math.min(100, (spend.total / budget) * 100);

  return (
    <section className="burn" aria-label="Nuyen budget">
      <div className={`burn__track ${spend.overspent ? "burn__track--over" : ""}`}>
        <div className="burn__fill">
          {SEGMENTS.map((seg) => {
            const value = spend[seg.key];
            if (value <= 0) return null;
            return (
              <div
                key={seg.key}
                className="burn__seg"
                style={{ width: pct(value), background: `var(${seg.varName})` }}
                title={`${seg.label}: ${nuyen(value)}`}
              />
            );
          })}
        </div>
        {spend.overspent && <div className="burn__breach" aria-hidden="true" />}
        <div className="burn__ticks" aria-hidden="true" />
      </div>

      <div className="burn__readout">
        <div className="burn__figures">
          <div className="burn__figure">
            <p className="label">Committed</p>
            <p className="burn__value num">{nuyen(spend.total)}</p>
          </div>
          <div className={`burn__figure ${spend.overspent ? "burn__figure--over" : ""}`}>
            <p className="label">{spend.overspent ? "Over budget" : "Remaining"}</p>
            <p className={`burn__value num ${spend.overspent ? "burn__value--glitch" : "burn__value--good"}`}>
              {nuyen(Math.abs(spend.remaining))}
            </p>
          </div>
          <div className="burn__figure">
            <p className="label">Essence</p>
            <p className={`burn__value num ${essence <= 1 ? "burn__value--low" : ""}`}>{essence.toFixed(1)}</p>
          </div>
          <div className="burn__figure burn__figure--pct">
            <p className="label">Burned</p>
            <p className="burn__value num">{Math.round(committedPct)}%</p>
          </div>
        </div>

        <ul className="burn__legend">
          {SEGMENTS.map((seg) => (
            <li key={seg.key} className="burn__legend-item">
              <span className="burn__dot" style={{ background: `var(${seg.varName})` }} aria-hidden="true" />
              <span className="label burn__legend-label">{seg.label}</span>
              <span className="num burn__legend-value">{nuyen(spend[seg.key])}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
