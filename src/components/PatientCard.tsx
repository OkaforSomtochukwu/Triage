import { RED_FLAGS } from "../lib/triage";
import { scoreObservations } from "../lib/news2";
import {
  SEX_LABEL, STATUS_LABEL, formatWait, latest, ticketLabel,
  type Status, type TriagedPatient,
} from "../lib/patients";

interface Props {
  item: TriagedPatient;
  now: number;
  onOpen: (id: string) => void;
  onStatus: (id: string, status: Status) => void;
}

/** One row of the queue. Shows the ticket number, not the name, so a screenshot identifies nobody. */
export default function PatientCard({ item, now, onOpen, onStatus }: Props) {
  const { patient: p, band, total, trend, missing } = item;
  const rec = latest(p);
  const abnormal = scoreObservations(rec.obs).parameters.filter((x) => x.score);
  const flags = RED_FLAGS.filter((f) => rec.flags.includes(f.id));

  let trendText: string | null = null;
  let trendClass = "same";
  if (trend !== null) {
    if (trend > 0) { trendText = `Rising by ${trend} since last observations`; trendClass = "worse"; }
    else if (trend < 0) { trendText = `Falling by ${Math.abs(trend)} since last observations`; trendClass = "better"; }
    else trendText = "Unchanged since last observations";
  }

  return (
    <article className={"qrow q-" + (band ? band.id : "none")} data-ticket={ticketLabel(p.ticket)}>
      <div className="ticket">#{ticketLabel(p.ticket)}</div>
      <div className="q-main">
        <div className="q-title">{p.complaint}</div>
        <div className="q-meta">{p.age} years, {SEX_LABEL[p.sex]}</div>
      </div>
      <div className="q-prio"><span className="pc-badge">{band ? band.name : "Needs observations"}</span></div>
      <div className="q-score"><span className="n">{total}</span></div>
      <div className="q-wait">{formatWait(now - p.arrivedAt)}<small>waiting</small></div>
      <div className="q-trend">
        {trendText && <div className={"trend " + trendClass}>{trendText}</div>}
        {missing > 0 && <div className="trend worse">{missing} observation{missing > 1 ? "s" : ""} not entered</div>}
        <small>Observations taken {formatWait(now - rec.at)} ago</small>
      </div>
      <div className={"status st-" + p.status}>{STATUS_LABEL[p.status]}</div>
      <div className="q-actions">
        <button type="button" onClick={() => onOpen(p.id)}>Open</button>
        {p.status === "waiting" && (
          <button type="button" className="primary" onClick={() => onStatus(p.id, "assessing")}>Start assessment</button>
        )}
        {p.status === "assessing" && (
          <button type="button" className="primary" onClick={() => onStatus(p.id, "seen")}>Mark as seen</button>
        )}
      </div>
      {(flags.length > 0 || abnormal.length > 0) && (
        <ul className="chips q-chips" aria-label="Findings">
          {flags.map((f) => (
            <li key={f.id} className="chip flagchip">{f.text}</li>
          ))}
          {abnormal.map((x) => (
            <li key={x.key} className={"chip c" + x.score}>{x.label} {x.value}, {x.score} pt</li>
          ))}
        </ul>
      )}
    </article>
  );
}
