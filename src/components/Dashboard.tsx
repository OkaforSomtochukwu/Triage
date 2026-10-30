import { useMemo } from "react";
import { BANDS } from "../lib/triage";
import { scoreObservations } from "../lib/news2";
import {
  BAND_ORDER, boardStats, formatWait, formatWaitShort, isActive, latest, sortTriaged, summarise, ticketLabel, triagePatient,
  type Patient, type Status,
} from "../lib/patients";
import PatientCard from "./PatientCard";
import { BAND_COLOR, Gauge, Icon, Scatter, TrendLine, type Dot } from "./Charts";

interface Props {
  patients: Patient[];
  now: number;
  onAdd: () => void;
  onOpen: (id: string) => void;
  onStatus: (id: string, status: Status) => void;
  onDemo: () => void;
  onClear: () => void;
}

/** NEWS2 aggregate risk: 7 or more is high, 5 to 6 is medium, below 5 is low. */
function level(score: number | null): { label: string; color: string } {
  if (score === null) return { label: "NO PATIENTS", color: "var(--muted)" };
  if (score >= 7) return { label: "HIGH", color: "var(--red)" };
  if (score >= 5) return { label: "MEDIUM", color: "var(--orange)" };
  return { label: "LOW", color: "var(--green)" };
}

export default function Dashboard({ patients, now, onAdd, onOpen, onStatus, onDemo, onClear }: Props) {
  const queue = useMemo(() => sortTriaged(patients.filter(isActive).map(triagePatient)), [patients]);
  const seen = useMemo(
    () => patients.filter((p) => !isActive(p)).sort((a, b) => (b.seenAt ?? 0) - (a.seenAt ?? 0)),
    [patients],
  );
  const summary = useMemo(() => summarise(queue), [queue]);
  const stats = useMemo(() => boardStats(patients, now), [patients, now]);

  const top = queue.reduce<(typeof queue)[number] | null>((m, t) => (!m || t.total > m.total ? t : m), null);
  const lvl = level(top ? top.total : null);
  const flagged = queue.filter((t) => latest(t.patient).flags.length > 0).length;
  const dots: Dot[] = queue.map((t) => ({
    key: t.patient.id,
    ticket: "#" + ticketLabel(t.patient.ticket),
    wait: Math.max(0, Math.round((now - t.patient.arrivedAt) / 60000)),
    score: t.total,
    color: t.band ? BAND_COLOR[t.band.id] : "var(--muted)",
    title: `#${ticketLabel(t.patient.ticket)} ${t.patient.complaint}: NEWS2 ${t.total}${t.band ? ", " + t.band.name : ""}`,
  }));
  const trendPoints = top ? top.patient.history.map((h) => scoreObservations(h.obs).total) : [];
  const trendBadge =
    top && top.trend !== null
      ? top.trend > 0 ? { t: `Rising +${top.trend}`, c: "var(--red)" }
        : top.trend < 0 ? { t: `Falling ${top.trend}`, c: "var(--green)" }
        : { t: "Unchanged", c: "var(--muted)" }
      : { t: "First set of observations", c: "var(--muted)" };
  const seenPct = patients.length === 0 ? null : Math.round((stats.seen / patients.length) * 100);

  return (
    <section aria-labelledby="board-heading">
      <div className="board-top">
        <h2 id="board-heading">A&amp;E overview</h2>
        <div className="actions" style={{ marginTop: 0 }}>
          <button type="button" className="primary" onClick={onAdd}>+ New patient</button>
          <button type="button" onClick={onDemo}>Load demo patients</button>
          {patients.length > 0 && <button type="button" onClick={onClear}>Clear board</button>}
        </div>
      </div>

      <div className="r1">
        <div className="panel chartbox">
          <h3 className="ptitle">Wait vs score</h3>
          <Scatter dots={dots} />
        </div>
        <div className="panel">
          <h3 className="ptitle" style={{ textAlign: "center" }}>Highest NEWS2 on the board</h3>
          <Gauge value={top ? top.total : null} max={20} color={lvl.color} label={lvl.label} title="Highest NEWS2 on the board" />
          <p className="gcap">
            {top ? <>Patient <strong>#{ticketLabel(top.patient.ticket)}</strong></> : "Add a patient to begin"}
            {flagged > 0 && <> · {flagged} with red flags</>}
          </p>
        </div>
        <div className="panel chartbox">
          <h3 className="ptitle">Score trend{top && <> · #{ticketLabel(top.patient.ticket)}</>}</h3>
          <span className="trendbadge" style={{ color: trendBadge.c }}>{trendBadge.t}</span>
          <TrendLine points={trendPoints} />
        </div>
      </div>

      <ul className="r2" aria-label="Board statistics">
        <li className="stat" style={{ color: "var(--blue)" }}>
          <span className="ico"><Icon name="waiting" /></span>
          <span><span className="n" style={{ color: "var(--ink)" }}>{stats.waiting}</span><span className="t">Waiting</span></span>
        </li>
        <li className="stat" style={{ color: "var(--red)" }}>
          <span className="ico"><Icon name="critical" /></span>
          <span><span className="n" style={{ color: "var(--red)" }}>{stats.critical}</span><span className="t">Critical</span></span>
        </li>
        <li className="stat" style={{ color: "var(--yellow)" }}>
          <span className="ico"><Icon name="clock" /></span>
          <span>
            <span className="n" style={{ color: "var(--ink)" }}>{stats.avgWaitMs === null ? "–" : formatWaitShort(stats.avgWaitMs)}</span>
            <span className="t">Average wait</span>
          </span>
        </li>
        <li className="stat" style={{ color: "var(--green)" }}>
          <span className="ico"><Icon name="seen" /></span>
          <span><span className="n" style={{ color: "var(--green)" }}>{stats.seen}</span><span className="t">Seen</span></span>
        </li>
        <li className="legend" aria-label="Patients per priority">
          <h3 className="ptitle" style={{ margin: 0 }}>Priority levels</h3>
          <ul>
            {BAND_ORDER.map((id) => (
              <li key={id}>
                <i style={{ background: BAND_COLOR[id] }} />
                {BANDS[id].name}
                <b>{summary[id]}</b>
              </li>
            ))}
            {summary.unplaced > 0 && (
              <li><i style={{ background: "var(--muted)" }} />Needs observations<b>{summary.unplaced}</b></li>
            )}
          </ul>
        </li>
        <li className="mini">
          <h3 className="ptitle">Seen</h3>
          <Gauge value={seenPct} max={100} color="var(--green)" display={seenPct === null ? "–" : seenPct + "%"} title="Share of patients seen" small />
        </li>
      </ul>

      <div className="panel qpanel">
        <h3 className="ptitle">
          <span>Current queue</span>
          <span>{queue.length} {queue.length === 1 ? "patient" : "patients"}</span>
        </h3>
        {queue.length === 0 ? (
          <div className="empty">
            <h3>{patients.length === 0 ? "No patients yet" : "Nobody waiting"}</h3>
            <p>
              {patients.length === 0
                ? "Add a patient to see them ranked by how critical they are. To try the board first, load the demo patients."
                : "Everyone on the board has been seen."}
            </p>
          </div>
        ) : (
          <div role="table" aria-label="Current queue">
            <div className="qhead" aria-hidden="true">
              <span>Ticket</span><span>Complaint</span><span>Priority</span><span>NEWS2</span>
              <span>Wait</span><span>Trend</span><span>Status</span><span />
            </div>
            {queue.map((item) => (
              <PatientCard key={item.patient.id} item={item} now={now} onOpen={onOpen} onStatus={onStatus} />
            ))}
          </div>
        )}
      </div>

      {seen.length > 0 && (
        <details className="seen">
          <summary>Seen ({seen.length})</summary>
          <ul>
            {seen.map((p) => (
              <li key={p.id} data-ticket={ticketLabel(p.ticket)}>
                <span><strong>#{ticketLabel(p.ticket)}</strong> {p.complaint}</span>
                <span className="muted">seen {formatWait(now - (p.seenAt ?? now))} ago</span>
                <button type="button" onClick={() => onOpen(p.id)}>Open</button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
