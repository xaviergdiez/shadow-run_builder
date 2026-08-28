import { useMemo } from "react";
import { usePersistedState } from "./hooks/usePersistedState";
import {
  attributesSeed,
  identitySeed,
  skillsSeed,
  specializationsSeed,
  defaultTier,
} from "./data/character.js";
import { essence, spendBreakdown } from "./logic/derive.js";
import BurnBar from "./components/BurnBar.jsx";
import StepNav from "./components/StepNav.jsx";
import IdentityStep from "./components/steps/IdentityStep.jsx";
import AttributesStep from "./components/steps/AttributesStep.jsx";
import SkillsStep from "./components/steps/SkillsStep.jsx";
import AmpsStep from "./components/steps/AmpsStep.jsx";
import GearStep from "./components/steps/GearStep.jsx";
import PersonaStep from "./components/steps/PersonaStep.jsx";
import SheetView from "./components/SheetView.jsx";
import "./App.css";

const STEPS = [
  { id: "identity", label: "Identity", accent: "--cat-attributes" },
  { id: "attributes", label: "Attributes", accent: "--cat-attributes", spendKeys: ["attributes"] },
  { id: "skills", label: "Skills", accent: "--cat-skills", spendKeys: ["skills", "knowledge"] },
  { id: "amps", label: "Shadow Amps", accent: "--cat-amps", spendKeys: ["amps"] },
  { id: "gear", label: "Gear", accent: "--cat-gear", spendKeys: ["gear"] },
  { id: "persona", label: "Persona", accent: "--cat-knowledge" },
  { id: "sheet", label: "Sheet", accent: "--color-amber", spendKeys: ["total"] },
];

export default function App({ charId, me }) {
  // Split across keys rather than one blob so that adding a field later merges
  // cleanly over an older saved state instead of overwriting it wholesale.
  const [tier, setTier] = usePersistedState("tier", defaultTier.id);
  const [budget, setBudget] = usePersistedState("budget", defaultTier.nuyen);
  const [identity, setIdentity] = usePersistedState("identity", identitySeed);
  const [attributes, setAttributes] = usePersistedState("attributes", attributesSeed);
  const [skills, setSkills] = usePersistedState("skills", skillsSeed);
  const [specializations, setSpecializations] = usePersistedState("specializations", specializationsSeed);
  const [knowledge, setKnowledge] = usePersistedState("knowledge", []);
  const [amps, setAmps] = usePersistedState("amps", []);
  const [gear, setGear] = usePersistedState("gear", []);
  const [keywords, setKeywords] = usePersistedState("keywords", []);
  const [dispositions, setDispositions] = usePersistedState("dispositions", []);
  const [cues, setCues] = usePersistedState("cues", []);
  // Bumped when a portrait is generated. Persisted so the sheet knows there is
  // an image to fetch, and so the URL changes when it is regenerated.
  const [avatarV, setAvatarV] = usePersistedState("avatarV", 0);
  // Remembered so re-importing after editing the sheet is one click, not
  // another paste.
  const [sheetSource, setSheetSource] = usePersistedState("sheetSource", { url: "", tab: "" });
  const [activeStep, setActiveStep] = usePersistedState("activeStep", STEPS[0].id);

  const setters = {
    tier: setTier,
    budget: setBudget,
    identity: setIdentity,
    attributes: setAttributes,
    skills: setSkills,
    specializations: setSpecializations,
    knowledge: setKnowledge,
    amps: setAmps,
    gear: setGear,
    keywords: setKeywords,
    dispositions: setDispositions,
    cues: setCues,
    avatarV: setAvatarV,
    sheetSource: setSheetSource,
  };

  const character = {
    tier,
    budget,
    identity,
    attributes,
    skills,
    specializations,
    knowledge,
    amps,
    gear,
    keywords,
    dispositions,
    cues,
    avatarV,
    sheetSource,
    charId,
  };

  // One update path for every step: pass a partial character, it lands on the
  // right persisted key.
  const update = (patch) => {
    for (const [key, value] of Object.entries(patch)) {
      setters[key]?.(value);
    }
  };

  const spend = useMemo(() => spendBreakdown(character), [
    budget,
    attributes,
    skills,
    knowledge,
    amps,
    gear,
  ]);

  const ess = essence(amps);

  const backToList = () => {
    window.location.hash = "#/characters";
    window.location.reload();
  };

  const stepProps = { character, update, spend };

  return (
    <div className="app">
      <div className="app__container">
        <header className="app__chrome">
          <div className="app__brand">
            <button type="button" className="app__back" onClick={backToList}>
              &larr; All runners
            </button>
            <p className="app__wordmark">
              Shadowrun <span>Anarchy 2.0</span> <span className="app__wordmark-sub">character builder</span>
            </p>
          </div>
          <div className="app__identity">
            <span className="app__runner-name">{identity.streetName || "Unnamed runner"}</span>
            <button type="button" className="ghost-button" onClick={() => window.print()}>
              Print sheet
            </button>
          </div>
        </header>

        <BurnBar spend={spend} budget={budget} essence={ess} />

        <StepNav steps={STEPS} active={activeStep} onChange={setActiveStep} spend={spend} />

        <main className="app__stage">
          {activeStep === "identity" && <IdentityStep {...stepProps} />}
          {activeStep === "attributes" && <AttributesStep {...stepProps} />}
          {activeStep === "skills" && <SkillsStep {...stepProps} />}
          {activeStep === "amps" && <AmpsStep {...stepProps} />}
          {activeStep === "gear" && <GearStep {...stepProps} />}
          {activeStep === "persona" && <PersonaStep {...stepProps} />}
          {activeStep === "sheet" && <SheetView character={character} spend={spend} />}
        </main>

        <footer className="app__footer no-print">
          <span className="label">
            Signed in as {me?.email ?? "unknown"} {"\u00B7"} saved automatically
          </span>
          <span className="label">
            Costs marked ASSUMED are placeholders, not printed rules. See the README.
          </span>
        </footer>
      </div>
    </div>
  );
}
