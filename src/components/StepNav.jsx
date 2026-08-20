import { nuyen } from "../logic/derive.js";
import "./StepNav.css";

// Each tab carries the nuyen it is responsible for, so you can see where the
// budget went without leaving the step you are on.
export default function StepNav({ steps, active, onChange, spend }) {
  return (
    <nav className="stepnav no-print" aria-label="Creation steps">
      {steps.map((step, i) => {
        const amount = step.spendKeys?.reduce((sum, key) => sum + (spend[key] ?? 0), 0);
        return (
          <button
            key={step.id}
            type="button"
            className={`stepnav__tab ${active === step.id ? "stepnav__tab--active" : ""}`}
            style={{ "--tab-accent": `var(${step.accent})` }}
            aria-current={active === step.id ? "step" : undefined}
            onClick={() => onChange(step.id)}
          >
            <span className="stepnav__index num">{String(i + 1).padStart(2, "0")}</span>
            <span className="stepnav__label">{step.label}</span>
            {amount > 0 && <span className="stepnav__spend num">{nuyen(amount)}</span>}
          </button>
        );
      })}
    </nav>
  );
}
