import {
  CUE_SUGGESTIONS,
  DISPOSITION_SUGGESTIONS,
  KEYWORD_SUGGESTIONS,
} from "../../data/character.js";
import "./Steps.css";

// Free, and the part the table actually reads. Three identical lists, so one
// component drives all of them.
const LISTS = [
  {
    key: "keywords",
    title: "Keywords",
    hint: "Short tags. Who you are at a glance, and what you can plausibly claim.",
    suggestions: KEYWORD_SUGGESTIONS,
    placeholder: "Street Samurai",
  },
  {
    key: "dispositions",
    title: "Dispositions",
    hint: "How you behave when it costs you something.",
    suggestions: DISPOSITION_SUGGESTIONS,
    placeholder: "Never leaves a runner behind",
  },
  {
    key: "cues",
    title: "Cues",
    hint: "Lines you say out loud when it is your turn. Write at least two.",
    suggestions: CUE_SUGGESTIONS,
    placeholder: '"That is not what we agreed on, chummer."',
  },
];

export default function PersonaStep({ character, update }) {
  return (
    <div className="step">
      {LISTS.map((list) => {
        const values = character[list.key];
        const setAt = (i, value) => {
          const next = [...values];
          next[i] = value;
          update({ [list.key]: next });
        };

        return (
          <section key={list.key} className="panel" style={{ "--panel-accent": "var(--cat-knowledge)" }}>
            <header className="panel__head">
              <h2 className="panel__title">{list.title}</h2>
              <p className="panel__hint">{list.hint}</p>
            </header>

            <ul className="rows">
              {values.map((value, i) => (
                <li key={i} className="row">
                  <input value={value} placeholder={list.placeholder} onChange={(e) => setAt(i, e.target.value)} />
                  <button
                    type="button"
                    className="row__remove"
                    aria-label={`Remove ${list.title}`}
                    onClick={() => update({ [list.key]: values.filter((_, j) => j !== i) })}
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>

            <button type="button" className="ghost-button" onClick={() => update({ [list.key]: [...values, ""] })}>
              + Add
            </button>

            <div className="chips">
              {list.suggestions
                .filter((s) => !values.includes(s))
                .map((s) => (
                  <button key={s} type="button" className="chip" onClick={() => update({ [list.key]: [...values, s] })}>
                    {s}
                  </button>
                ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
