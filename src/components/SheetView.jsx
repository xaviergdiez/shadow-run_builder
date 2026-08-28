import { ATTRIBUTES, GLITCH_LEGEND, METATYPES, RISK_TABLE, SKILLS, TIERS } from "../data/rules.js";
import { LIFESTYLES } from "../data/catalog.js";
import {
  armorRating,
  dicePool,
  essence,
  mentalThresholds,
  nuyen,
  physicalThresholds,
  riskReductions,
  unarmedDV,
  validate,
} from "../logic/derive.js";
import "./SheetView.css";

const abbrOf = (key) => ATTRIBUTES.find((a) => a.key === key)?.abbr ?? "";

// Risk Reduction that applies to a given skill or specialization, matched on
// the plain-language target the amp text names.
function rrFor(reductions, skillName, specName = null) {
  const hit = reductions.find(
    (r) =>
      r.skill.toLowerCase() === skillName.toLowerCase() &&
      (specName ? r.specialization?.toLowerCase() === specName.toLowerCase() : !r.specialization)
  );
  return hit?.rr ?? 0;
}

export default function SheetView({ character, spend, onRoll }) {
  const metatype = METATYPES.find((m) => m.id === character.identity.metatype);
  const tier = TIERS.find((t) => t.id === character.tier);
  const lifestyle = LIFESTYLES.find((l) => l.id === character.identity.lifestyle);
  const armor = armorRating(character.gear, character.amps);
  const physical = physicalThresholds(character.attributes.strength, armor);
  const mental = mentalThresholds(character.attributes.willpower);
  const ess = essence(character.amps);
  const reductions = riskReductions(character.amps);
  const issues = validate(character);
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warn");

  // A skill earns a row if it has ranks, a bought specialization, or an amp
  // pointing Risk Reduction at it. That last case matters: a Fixer granting
  // RR 1 to Network (street) is useless information if the row never appears.
  const rrSpecsFor = (skill) =>
    reductions
      .filter((r) => r.skill.toLowerCase() === skill.name.toLowerCase() && r.specialization)
      .map((r) => r.specialization);

  const activeSkills = SKILLS.filter(
    (s) =>
      (character.skills[s.key] || 0) > 0 ||
      (character.specializations[s.key]?.length ?? 0) > 0 ||
      rrSpecsFor(s).length > 0 ||
      rrFor(reductions, s.name) > 0
  );

  const weapons = character.gear.filter((g) => /DV\s*\d/i.test(g.note ?? ""));
  const carried = character.gear.filter((g) => !/DV\s*\d/i.test(g.note ?? ""));

  return (
    <div className="sheet">
      {(errors.length > 0 || warnings.length > 0) && (
        <section className="sheet__issues no-print">
          {errors.map((issue) => (
            <p key={issue.text} className="sheet__issue sheet__issue--error">
              {issue.text}
            </p>
          ))}
          {warnings.map((issue) => (
            <p key={issue.text} className="sheet__issue sheet__issue--warn">
              {issue.text}
            </p>
          ))}
        </section>
      )}

      <header className="sheet__head">
        {/* The portrait is a header cell rather than a floated image so the
            name block reflows beside it and the print layout keeps one row. */}
        {character.avatarV > 0 && (
          <img
            className="sheet__portrait"
            src={`/api/avatar?c=${character.charId}&v=${character.avatarV}`}
            alt={`Portrait of ${character.identity.streetName || "this runner"}`}
          />
        )}
        <div className="sheet__head-name">
          <p className="label">Street name</p>
          <h1 className="sheet__name">{character.identity.streetName || "Unnamed"}</h1>
          <p className="sheet__sub">
            {[
              character.identity.realName,
              metatype?.name,
              character.identity.concept,
              lifestyle && `${lifestyle.name} lifestyle`,
            ]
              .filter(Boolean)
              .join("  \u00B7  ")}
          </p>
        </div>
        <div className="sheet__stamp">
          <p className="label">Build</p>
          <p className="sheet__stamp-value num">{tier?.name ?? ""}</p>
          <p className="sheet__stamp-sub num">
            {nuyen(spend.total)} of {nuyen(character.budget)}
          </p>
        </div>
      </header>

      <section className="sheet__attrs">
        {ATTRIBUTES.map((attr) => (
          <div key={attr.key} className="sheet__attr">
            <p className="label">{attr.abbr}</p>
            <p className="sheet__attr-value num">{character.attributes[attr.key]}</p>
          </div>
        ))}
        <div className="sheet__attr sheet__attr--essence">
          <p className="label">Essence</p>
          <p className="sheet__attr-value num">{ess.toFixed(1)}</p>
        </div>
      </section>

      <div className="sheet__cols">
        <div className="sheet__col">
          <section className="sheet__block">
            <h2 className="sheet__block-title">Skills</h2>
            <div className="sheet__table sheet__table--skills">
              <div className="sheet__thead">
                <span>Skill</span>
                <span>Rating</span>
                <span>+Att</span>
                <span>= DP</span>
                <span>RR</span>
              </div>
              {activeSkills.length === 0 && <p className="sheet__empty">No skills bought yet.</p>}
              {activeSkills.map((skill) => {
                const bought = character.specializations[skill.key] ?? [];
                const specs = [...new Set([...bought, ...rrSpecsFor(skill)])];
                return (
                  <div key={skill.key} className="sheet__skill">
                    <div
                      className={`sheet__trow sheet__trow--main ${onRoll ? "sheet__trow--rollable" : ""}`}
                      role={onRoll ? "button" : undefined}
                      tabIndex={onRoll ? 0 : undefined}
                      onClick={
                        onRoll &&
                        (() =>
                          onRoll({
                            label: skill.name,
                            skillKey: skill.key,
                            pool: dicePool(character, skill.key),
                            rr: rrFor(reductions, skill.name),
                          }))
                      }
                      onKeyDown={
                        onRoll &&
                        ((e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          onRoll({
                            label: skill.name,
                            skillKey: skill.key,
                            pool: dicePool(character, skill.key),
                            rr: rrFor(reductions, skill.name),
                          });
                        })
                      }
                    >
                      <span>{skill.name}</span>
                      <span className="num">{character.skills[skill.key] || 0}</span>
                      <span className="num">{abbrOf(skill.attr)}</span>
                      <span className="num sheet__dp">{dicePool(character, skill.key)}</span>
                      <span className="num">{rrFor(reductions, skill.name) || ""}</span>
                    </div>
                    {specs.map((spec) => {
                      const specDef = skill.specializations.find((s) => s.name === spec);
                      const owned = bought.includes(spec);
                      return (
                        <div
                          key={spec}
                          className={`sheet__trow sheet__trow--spec ${owned ? "" : "sheet__trow--unbought"} ${
                            onRoll ? "sheet__trow--rollable" : ""
                          }`}
                          role={onRoll ? "button" : undefined}
                          tabIndex={onRoll ? 0 : undefined}
                          onClick={
                            onRoll &&
                            (() =>
                              onRoll({
                                label: `${skill.name} (${spec})`,
                                skillKey: skill.key,
                                pool: dicePool(character, skill.key, spec, owned),
                                rr: rrFor(reductions, skill.name, spec) || rrFor(reductions, skill.name),
                              }))
                          }
                        >
                          <span>
                            ({spec}
                            {owned ? " +2" : ""})
                          </span>
                          <span />
                          <span className="num">{abbrOf(specDef?.attr ?? skill.attr)}</span>
                          <span className="num sheet__dp">
                            {dicePool(character, skill.key, spec, owned)}
                          </span>
                          <span className="num">{rrFor(reductions, skill.name, spec) || ""}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </section>

          {character.knowledge.filter(Boolean).length > 0 && (
            <section className="sheet__block">
              <h2 className="sheet__block-title">Knowledge skills</h2>
              <p className="sheet__prose">{character.knowledge.filter(Boolean).join(", ")}</p>
            </section>
          )}

          <section className="sheet__block">
            <h2 className="sheet__block-title">Shadow Amps</h2>
            {character.amps.length === 0 && <p className="sheet__empty">None.</p>}
            <div className="sheet__table">
              {character.amps.map((amp) => (
                <div key={amp.instanceId} className="sheet__amp">
                  <div className="sheet__amp-head">
                    <span className="sheet__amp-name">{amp.name || "Unnamed amp"}</span>
                    <span className="num sheet__amp-nums">
                      {amp.essence > 0 ? `${amp.essence} ess` : ""} {amp.rating ? `R${amp.rating}` : ""}
                    </span>
                  </div>
                  {amp.effects && <p className="sheet__amp-effects">{amp.effects}</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="sheet__block">
            <h2 className="sheet__block-title">Weapons</h2>
            <div className="sheet__table sheet__table--weapons">
              <div className="sheet__thead">
                <span>Weapon</span>
                <span>Damage and ranges</span>
              </div>
              <div className="sheet__trow sheet__trow--main">
                <span>Unarmed</span>
                <span className="num">DV {unarmedDV(character.attributes.strength)} [OK/-/-/-]</span>
              </div>
              {weapons.map((w) => (
                <div key={w.instanceId} className="sheet__trow sheet__trow--main">
                  <span>{w.name}</span>
                  <span className="num">{w.note}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="sheet__block">
            <h2 className="sheet__block-title">Equipment</h2>
            {carried.length === 0 ? (
              <p className="sheet__empty">Nothing carried.</p>
            ) : (
              <p className="sheet__prose">
                {carried
                  .map((g) => `${g.name}${(g.qty ?? 1) > 1 ? ` \u00D7${g.qty}` : ""}`)
                  .join(", ")}
              </p>
            )}
          </section>
        </div>

        <div className="sheet__col sheet__col--narrow">
          <section className="sheet__block sheet__block--boxed">
            <h2 className="sheet__block-title">Keywords</h2>
            <ul className="sheet__list">
              {character.keywords.filter(Boolean).map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </section>

          <section className="sheet__block sheet__block--boxed">
            <h2 className="sheet__block-title">Dispositions</h2>
            <ul className="sheet__list">
              {character.dispositions.filter(Boolean).map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </section>

          <section className="sheet__block sheet__block--boxed">
            <h2 className="sheet__block-title">Cues</h2>
            <ul className="sheet__list sheet__list--cues">
              {character.cues.filter(Boolean).map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>

          <section className="sheet__block">
            <h2 className="sheet__block-title">Wounds</h2>
            <div className="sheet__table sheet__table--wounds">
              <div className="sheet__thead">
                <span>Thresholds</span>
                <span>Light</span>
                <span>Serious</span>
                <span>Incap.</span>
              </div>
              <div className="sheet__trow">
                <span>No armor</span>
                {physicalThresholds(character.attributes.strength, 0).map((v, i) => (
                  <span key={i} className="num">
                    {v}
                  </span>
                ))}
              </div>
              <div className="sheet__trow sheet__trow--main">
                <span>Armor {armor}</span>
                {physical.map((v, i) => (
                  <span key={i} className="num">
                    {v}
                  </span>
                ))}
              </div>
              <div className="sheet__trow">
                <span>Mental</span>
                {mental.map((v, i) => (
                  <span key={i} className="num">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="sheet__block">
            <h2 className="sheet__block-title">Risk dice</h2>
            <div className="sheet__table sheet__table--risk">
              <div className="sheet__thead">
                <span>RR</span>
                <span>Low</span>
                <span>Normal</span>
                <span>High</span>
                <span>Extreme</span>
              </div>
              {RISK_TABLE.map((r) => (
                <div key={r.rr} className="sheet__trow">
                  <span className="num">{r.rr}</span>
                  <span className="num">{r.low}</span>
                  <span className="num">{r.normal}</span>
                  <span className="num">{r.high}</span>
                  <span className="num">{r.extreme}</span>
                </div>
              ))}
            </div>
            <p className="sheet__legend">{GLITCH_LEGEND}</p>
          </section>
        </div>
      </div>

      {character.identity.background && (
        <section className="sheet__block">
          <h2 className="sheet__block-title">Background</h2>
          <p className="sheet__prose">{character.identity.background}</p>
        </section>
      )}
    </div>
  );
}
