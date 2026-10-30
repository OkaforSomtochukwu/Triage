import { ABCDE, RED_FLAGS, type RedFlagId } from "../lib/triage";
import { CONSCIOUSNESS_LABEL, type Consciousness } from "../lib/news2";
import { EXAMPLES } from "../lib/examples";

export interface FormState {
  respRate: string;
  spo2: string;
  systolic: string;
  pulse: string;
  temp: string;
  consciousness: Consciousness;
  onOxygen: boolean;
  flags: RedFlagId[];
}

interface Props {
  form: FormState;
  onChange: (next: FormState) => void;
}

const EMPTY: FormState = {
  respRate: "", spo2: "", systolic: "", pulse: "", temp: "",
  consciousness: "A", onOxygen: false, flags: [],
};

const toForm = (ex: (typeof EXAMPLES)[number]): FormState => ({
  respRate: String(ex.obs.respRate ?? ""),
  spo2: String(ex.obs.spo2 ?? ""),
  systolic: String(ex.obs.systolic ?? ""),
  pulse: String(ex.obs.pulse ?? ""),
  temp: String(ex.obs.temp ?? ""),
  consciousness: ex.obs.consciousness,
  onOxygen: ex.obs.onOxygen,
  flags: ex.flags,
});

const CONSCIOUSNESS_OPTION: Record<Consciousness, string> = {
  A: "Alert",
  C: "New confusion",
  V: "Responds to voice",
  P: "Responds to pain",
  U: "Unresponsive",
};

export default function ObservationForm({ form, onChange }: Props) {
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    onChange({ ...form, [key]: value });

  const numberField = (
    key: "respRate" | "spo2" | "systolic" | "pulse" | "temp",
    letter: string,
    label: string,
    unit: string,
    step?: string,
  ) => (
    <div>
      <label htmlFor={key}>
        <span className="abc">{letter}</span> {label} <small>{unit}</small>
      </label>
      <input
        id={key}
        type="number"
        inputMode="decimal"
        step={step}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );

  const toggleFlag = (id: RedFlagId) =>
    set("flags", form.flags.includes(id) ? form.flags.filter((f) => f !== id) : [...form.flags, id]);

  return (
    <section className="panel" aria-labelledby="abcde-heading">
      <h2 id="abcde-heading">Rapid ABCDE check</h2>
      <p className="hint">Tick anything present. A ticked red flag overrides the score.</p>
      <div className="abcde">
        {ABCDE.map((step) => {
          const flags = RED_FLAGS.filter((f) => f.group === step.letter);
          return (
            <div key={step.letter} className="abcde-step">
              <div className="abcde-head">
                <span className="abc">{step.letter}</span>
                <strong>{step.title}</strong>
              </div>
              {flags.map((f) => (
                <label key={f.id} className={"flag" + (form.flags.includes(f.id) ? " on" : "")}>
                  <input type="checkbox" checked={form.flags.includes(f.id)} onChange={() => toggleFlag(f.id)} />
                  <span>{f.text}</span>
                </label>
              ))}
              {step.note && <p className="note-line">{step.note}</p>}
            </div>
          );
        })}
      </div>

      <h2 style={{ marginTop: 22 }}>Vital signs</h2>
      <div className="fields">
        {numberField("respRate", "B", "Respiratory rate", "breaths/min")}
        {numberField("spo2", "B", "SpO₂", "% (scale 1)")}
        {numberField("systolic", "C", "Systolic BP", "mmHg")}
        {numberField("pulse", "C", "Pulse", "beats/min")}
        {numberField("temp", "E", "Temperature", "°C", "0.1")}
        <div>
          <label htmlFor="consciousness"><span className="abc">D</span> Consciousness</label>
          <select
            id="consciousness"
            value={form.consciousness}
            onChange={(e) => set("consciousness", e.target.value as Consciousness)}
          >
            {(Object.keys(CONSCIOUSNESS_LABEL) as Consciousness[]).map((c) => (
              <option key={c} value={c}>{CONSCIOUSNESS_OPTION[c]}</option>
            ))}
          </select>
        </div>
        <div className="full">
          <label className="toggle">
            <input type="checkbox" checked={form.onOxygen} onChange={(e) => set("onOxygen", e.target.checked)} />
            <span className="abc">B</span> On supplemental oxygen
          </label>
        </div>
      </div>

      <div className="actions">
        {EXAMPLES.map((ex) => (
          <button key={ex.label} type="button" onClick={() => onChange(toForm(ex))}>
            {ex.label}
          </button>
        ))}
        <button type="button" onClick={() => onChange(EMPTY)}>Clear</button>
      </div>
    </section>
  );
}
