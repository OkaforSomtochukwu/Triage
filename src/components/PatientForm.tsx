import { useMemo, useState } from "react";
import ObservationForm, { type FormState } from "./ObservationForm";
import ResultPanel from "./ResultPanel";
import { assess } from "../lib/triage";
import { EMPTY_FORM, formToObs, obsToForm } from "../lib/form";
import { latest, makeId, ticketLabel, validateIntake, type Bio, type Patient, type Sex } from "../lib/patients";

interface Props {
  initial: Patient | null;
  /** Ticket number the next new patient will receive. */
  nextTicket: number;
  onSave: (p: Patient) => void;
  onCancel: () => void;
}

export default function PatientForm({ initial, nextTicket, onSave, onCancel }: Props) {
  const [bio, setBio] = useState<Bio>(
    initial
      ? { name: initial.name, age: String(initial.age), sex: initial.sex, complaint: initial.complaint }
      : { name: "", age: "", sex: "NR", complaint: "" },
  );
  const [form, setForm] = useState<FormState>(
    initial ? obsToForm(latest(initial).obs, latest(initial).flags) : EMPTY_FORM,
  );
  const [errors, setErrors] = useState<string[]>([]);

  const obs = formToObs(form);
  const assessment = useMemo(() => assess(obs, form.flags), [form]); // eslint-disable-line react-hooks/exhaustive-deps

  const setB = <K extends keyof Bio>(k: K, v: Bio[K]) => setBio({ ...bio, [k]: v });

  const save = () => {
    const errs = validateIntake(bio, obs, form.flags);
    setErrors(errs);
    if (errs.length > 0) return;

    const now = Date.now();
    const record = { at: now, obs, flags: form.flags };
    if (initial) {
      const last = latest(initial);
      const changed = JSON.stringify({ o: last.obs, f: last.flags }) !== JSON.stringify({ o: obs, f: form.flags });
      onSave({
        ...initial,
        name: bio.name.trim(),
        age: Number(bio.age),
        sex: bio.sex,
        complaint: bio.complaint.trim(),
        history: changed ? [...initial.history, record] : initial.history,
      });
    } else {
      onSave({
        id: makeId(),
        ticket: nextTicket,
        status: "waiting",
        name: bio.name.trim(),
        age: Number(bio.age),
        sex: bio.sex,
        complaint: bio.complaint.trim(),
        arrivedAt: now,
        history: [record],
      });
    }
  };

  return (
    <div>
      <section className="panel" aria-labelledby="bio-heading" style={{ marginBottom: 20 }}>
        <h2 id="bio-heading">{initial ? `Reassess #${ticketLabel(initial.ticket)}` : `New patient, ticket #${ticketLabel(nextTicket)}`}</h2>
        <div className="fields bio">
          <div>
            <label htmlFor="name">Name</label>
            <input id="name" type="text" autoComplete="off" value={bio.name} onChange={(e) => setB("name", e.target.value)} />
          </div>
          <div>
            <label htmlFor="age">Age <small>years</small></label>
            <input id="age" type="number" inputMode="numeric" value={bio.age} onChange={(e) => setB("age", e.target.value)} />
          </div>
          <div>
            <label htmlFor="sex">Sex</label>
            <select id="sex" value={bio.sex} onChange={(e) => setB("sex", e.target.value as Sex)}>
              <option value="NR">Not recorded</option>
              <option value="F">Female</option>
              <option value="M">Male</option>
            </select>
          </div>
          <div className="full">
            <label htmlFor="complaint">Presenting complaint</label>
            <input id="complaint" type="text" autoComplete="off" value={bio.complaint} onChange={(e) => setB("complaint", e.target.value)} />
          </div>
        </div>
      </section>

      <div className="grid">
        <ObservationForm form={form} onChange={setForm} />
        <ResultPanel assessment={assessment} />
      </div>

      {errors.length > 0 && (
        <div className="errors" role="alert">
          <strong>Fix before saving</strong>
          <ul>
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <div className="actions">
        <button type="button" className="primary" onClick={save}>
          {initial ? "Save observations" : "Add to board"}
        </button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
