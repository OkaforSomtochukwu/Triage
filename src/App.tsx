import { useEffect, useState } from "react";
import Dashboard from "./components/Dashboard";
import PatientDetail from "./components/PatientDetail";
import PatientForm from "./components/PatientForm";
import { loadPatients, savePatients } from "./lib/storage";
import { nextTicket, seedDemo, type Patient, type Status } from "./lib/patients";

type View =
  | { kind: "board" }
  | { kind: "detail"; id: string }
  | { kind: "form"; id: string | null };

export default function App() {
  const [patients, setPatients] = useState<Patient[]>(loadPatients);
  const [view, setView] = useState<View>({ kind: "board" });
  const [now, setNow] = useState(Date.now());

  useEffect(() => savePatients(patients), [patients]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const find = (id: string | null) => (id ? patients.find((p) => p.id === id) ?? null : null);

  const save = (p: Patient) => {
    const exists = patients.some((x) => x.id === p.id);
    setPatients((list) => (exists ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p]));
    setNow(Date.now());
    setView(exists ? { kind: "detail", id: p.id } : { kind: "board" });
  };

  const setStatus = (id: string, status: Status) => {
    const t = Date.now();
    setNow(t);
    setPatients((list) =>
      list.map((p) => {
        if (p.id !== id) return p;
        const { seenAt: _drop, ...rest } = p;
        return status === "seen" ? { ...rest, status, seenAt: t } : { ...rest, status };
      }),
    );
  };

  const remove = (id: string) => {
    const p = find(id);
    if (p && window.confirm(`Remove ${p.name} from the board? This cannot be undone.`)) {
      setPatients((list) => list.filter((x) => x.id !== id));
      setView({ kind: "board" });
    }
  };

  const detailPatient = view.kind === "detail" ? find(view.id) : null;
  const formPatient = view.kind === "form" ? find(view.id) : null;

  return (
    <>
      <div className="topbar">
        <div className="topbar-in">
          <div className="brand">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="11" fill="none" stroke="var(--teal)" strokeWidth="1.6" />
              <path d="M12 6v12M6 12h12" stroke="var(--teal)" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
            TriageFlow <span>A&amp;E triage board</span>
          </div>
          <nav className="nav" aria-label="Main">
            <button type="button" aria-current={view.kind === "board" ? "page" : undefined} onClick={() => setView({ kind: "board" })}>Dashboard</button>
            <button type="button" aria-current={view.kind === "form" && !view.id ? "page" : undefined} onClick={() => setView({ kind: "form", id: null })}>New patient</button>
          </nav>
          <div className="topbar-right">
            <span>Somto (demo user)</span>
            <time dateTime={new Date(now).toISOString()}>
              {new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </time>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="disclaimer" role="note">
          <strong>Educational demo only.</strong> Not a medical device and not a substitute for clinical
          judgement or local protocols. Adults only. <strong>Never enter real patient information.</strong>{" "}
          Data stays in this browser and is never sent anywhere.
        </div>

        {view.kind === "board" && (
          <Dashboard
            patients={patients}
            now={now}
            onAdd={() => setView({ kind: "form", id: null })}
            onOpen={(id) => setView({ kind: "detail", id })}
            onStatus={setStatus}
            onDemo={() => {
              const t = Date.now();
              setNow(t);
              setPatients(seedDemo(t));
            }}
            onClear={() => {
              if (window.confirm("Remove every patient from the board?")) setPatients([]);
            }}
          />
        )}

        {view.kind === "detail" &&
          (detailPatient ? (
            <PatientDetail
              patient={detailPatient}
              now={now}
              onBack={() => setView({ kind: "board" })}
              onReassess={() => setView({ kind: "form", id: detailPatient.id })}
              onStatus={setStatus}
              onRemove={remove}
            />
          ) : (
            <p>
              That patient is no longer on the board.{" "}
              <button type="button" onClick={() => setView({ kind: "board" })}>Back to board</button>
            </p>
          ))}

        {view.kind === "form" && (
          <PatientForm
            key={view.id ?? "new"}
            initial={formPatient}
            nextTicket={nextTicket(patients)}
            onSave={save}
            onCancel={() => setView(formPatient ? { kind: "detail", id: formPatient.id } : { kind: "board" })}
          />
        )}
      </div>
    </>
  );
}
