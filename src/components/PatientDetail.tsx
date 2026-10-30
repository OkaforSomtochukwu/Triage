import { RED_FLAGS, assess } from "../lib/triage";
import { CONSCIOUSNESS_LABEL, scoreObservations } from "../lib/news2";
import {
  SEX_LABEL, STATUS_LABEL, formatWait, latest, ticketLabel, type Patient, type Status,
} from "../lib/patients";
import ResultPanel from "./ResultPanel";

interface Props {
  patient: Patient;
  now: number;
  onBack: () => void;
  onReassess: () => void;
  onStatus: (id: string, status: Status) => void;
  onRemove: (id: string) => void;
}

const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function PatientDetail({ patient: p, now, onBack, onReassess, onStatus, onRemove }: Props) {
  const rec = latest(p);
  const assessment = assess(rec.obs, rec.flags);
  const flags = RED_FLAGS.filter((f) => rec.flags.includes(f.id));
  const history = [...p.history].reverse();

  return (
    <div>
      <button type="button" onClick={onBack}>Back to board</button>

      <div className="detail-head">
        <div>
          <div className="ticket">#{ticketLabel(p.ticket)}</div>
          <h2>{p.name}</h2>
        </div>
        <div className={"status st-" + p.status}>{STATUS_LABEL[p.status]}</div>
      </div>

      <dl className="bio-grid">
        <div><dt>Age</dt><dd>{p.age} years</dd></div>
        <div><dt>Sex</dt><dd>{SEX_LABEL[p.sex]}</dd></div>
        <div><dt>Arrived</dt><dd>{clock(p.arrivedAt)}</dd></div>
        <div>
          <dt>{p.status === "seen" ? "Waited" : "Waiting"}</dt>
          <dd>{formatWait((p.status === "seen" && p.seenAt ? p.seenAt : now) - p.arrivedAt)}</dd>
        </div>
        <div className="wide"><dt>Presenting complaint</dt><dd>{p.complaint}</dd></div>
      </dl>

      <div className="actions">
        {p.status === "waiting" && (
          <button type="button" className="primary" onClick={() => onStatus(p.id, "assessing")}>Start assessment</button>
        )}
        {p.status === "assessing" && (
          <button type="button" className="primary" onClick={() => onStatus(p.id, "seen")}>Mark as seen</button>
        )}
        {p.status === "seen" && <button type="button" onClick={() => onStatus(p.id, "waiting")}>Reopen</button>}
        {p.status !== "seen" && <button type="button" onClick={onReassess}>Reassess</button>}
        <button type="button" onClick={() => onRemove(p.id)}>Remove from board</button>
      </div>

      <div className="grid" style={{ marginTop: 20 }}>
        <div>
          <section className="panel" style={{ marginBottom: 20 }}>
            <h2>Latest ABCDE findings</h2>
            {flags.length === 0 ? (
              <p className="muted">No red flags ticked at the last assessment.</p>
            ) : (
              <ul className="chips">
                {flags.map((f) => <li key={f.id} className="chip flagchip">{f.text}</li>)}
              </ul>
            )}
          </section>

          <section className="panel">
            <h2>Observation history</h2>
            <div className="table-scroll">
              <table className="hist">
                <thead>
                  <tr>
                    <th>Time</th><th>NEWS2</th><th>RR</th><th>SpO₂</th><th>BP</th><th>HR</th><th>Temp</th><th>Conscious</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.at}>
                      <td>{clock(h.at)}</td>
                      <td><strong>{scoreObservations(h.obs).total}</strong></td>
                      <td>{h.obs.respRate ?? "–"}</td>
                      <td>{h.obs.spo2 ?? "–"}{h.obs.onOxygen ? " (O₂)" : ""}</td>
                      <td>{h.obs.systolic ?? "–"}</td>
                      <td>{h.obs.pulse ?? "–"}</td>
                      <td>{h.obs.temp ?? "–"}</td>
                      <td>{CONSCIOUSNESS_LABEL[h.obs.consciousness]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <ResultPanel assessment={assessment} />
      </div>
    </div>
  );
}
