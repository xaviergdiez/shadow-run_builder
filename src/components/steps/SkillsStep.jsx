import { COSTS, KNOWLEDGE_SUGGESTIONS, SKILLS, SKILL_MAX } from "../../data/rules.js";
import { dicePool, nuyen } from "../../logic/derive.js";
import "./Steps.css";

const PLANES = [
  { id: "physical", name: "Physical" },
  { id: "matrix", name: "Matrix" },
  { id: "astral", name: "Astral" },
];

// Specializations are free in the builder: the +2 comes from owning them, and
// the book prices them inside the skill point, not on top of it.
export default function SkillsStep({ character, update, spend }) {
  const setRating = (key, value) =>
    update({ skills: { ...character.skills, [key]: Math.max(0, Math.min(SKILL_MAX, value)) } });

  const toggleSpec = (key, name) => {
    const current = character.specializations[key] ?? [];
    const next = current.includes(name) ? current.filter((s) => s !== name) : [...current, name];
    update({ specializations: { ...character.specializations, [key]: next } });
  };

  const setKnowledge = (i, value) => {
    const next = [...character.knowledge];
    next[i] = value;
    update({ knowledge: next });
  };

  return (
    <div className="step">
      {PLANES.map((plane) => (
        <section key={plane.id} className="panel" style={{ "--panel-accent": "var(--cat-skills)" }}>
          <header className="panel__head">
            <h2 className="panel__title">{plane.name} skills</h2>
            <p className="panel__hint">
              {nuyen(COSTS.skillPoint)} per rank. Dice pool = rank + attribute, +2 for a specialization.
            </p>
          </header>

          {SKILLS.filter((s) => s.plane === plane.id).map((skill) => {
            const rating = character.skills[skill.key] || 0;
            const owned = character.specializations[skill.key] ?? [];
            return (
              <div key={skill.key} className={`skill ${rating > 0 ? "skill--bought" : ""}`}>
                <div className="skill__row">
                  <span className="skill__name">{skill.name}</span>
                  <div className="track track--sm">
                    {Array.from({ length: SKILL_MAX }, (_, i) => i + 1).map((pip) => (
                      <button
                        key={pip}
                        type="button"
                        className={`track__pip ${pip <= rating ? "track__pip--on track__pip--cyan" : ""}`}
                        aria-label={`${skill.name} rank ${pip}`}
                        onClick={() => setRating(skill.key, pip === rating ? pip - 1 : pip)}
                      >
                        <span className="num">{pip}</span>
                      </button>
                    ))}
                  </div>
                  <span className="skill__pool num" title="Dice pool">
                    {dicePool(character, skill.key)}
                  </span>
                  <span className="skill__cost num">{rating > 0 ? nuyen(rating * COSTS.skillPoint) : ""}</span>
                </div>

                <div className="specs">
                  {skill.specializations.map((spec) => (
                    <button
                      key={spec.name}
                      type="button"
                      className={`spec ${owned.includes(spec.name) ? "spec--on" : ""}`}
                      onClick={() => toggleSpec(skill.key, spec.name)}
                    >
                      {spec.name}
                      <span className="num spec__pool">{dicePool(character, skill.key, spec.name, owned.includes(spec.name))}</span>
                    </button>
                  ))}
                </div>

                {skill.requiresAwakened && <p className="skill__gate">Unrollable without an Awakened amp.</p>}
                {skill.requiresDeck && <p className="skill__gate">Unrollable without a cyberdeck.</p>}
              </div>
            );
          })}
        </section>
      ))}

      <section className="panel" style={{ "--panel-accent": "var(--cat-knowledge)" }}>
        <header className="panel__head">
          <h2 className="panel__title">Knowledge skills</h2>
          <p className="panel__hint">{nuyen(COSTS.knowledgeSkill)} each. No rating, you either know it or you do not.</p>
          <p className="panel__total num">{nuyen(spend.knowledge)}</p>
        </header>

        <ul className="rows">
          {character.knowledge.map((k, i) => (
            <li key={i} className="row">
              <input value={k} onChange={(e) => setKnowledge(i, e.target.value)} />
              <button
                type="button"
                className="row__remove"
                aria-label="Remove knowledge skill"
                onClick={() => update({ knowledge: character.knowledge.filter((_, j) => j !== i) })}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="ghost-button"
          onClick={() => update({ knowledge: [...character.knowledge, ""] })}
        >
          + Knowledge skill
        </button>

        <div className="chips">
          {KNOWLEDGE_SUGGESTIONS.filter((s) => !character.knowledge.includes(s)).map((s) => (
            <button
              key={s}
              type="button"
              className="chip"
              onClick={() => update({ knowledge: [...character.knowledge, s] })}
            >
              {s}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
