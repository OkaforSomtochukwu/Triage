import type { Assessment } from "../lib/triage";

export default function ResultPanel({ assessment }: { assessment: Assessment }) {
  const { news2 } = assessment;
  const entered = news2.parameters.some((p) => p.score !== null);

  let bandClass = "b-none";
  let label = "Waiting for input";
  let name = "Enter observations";
  let action = "Fill in the vital signs to see a score.";
  let reasons: string[] = ["No data yet."];

  if (assessment.status === "incomplete") {
    label = "Incomplete";
    name = "Keep entering";
    action = "Add the remaining observations for a suggestion.";
    reasons = assessment.reasons;
  } else if (assessment.status === "ready") {
    bandClass = "b-" + assessment.band.id;
    label = `Priority ${assessment.band.priority}`;
    name = assessment.band.name;
    action = assessment.band.action;
    reasons = assessment.reasons;
  }

  return (
    <section className="panel result" aria-labelledby="result-heading" aria-live="polite">
      <h2 id="result-heading">Suggested priority</h2>
      <div className={"band " + bandClass}>
        <div className="label">{label}</div>
        <div className="name">{name}</div>
        <p className="action">{action}</p>
      </div>

      <div className="score">
        <span className="n">{entered ? news2.total : "–"}</span>
        <span className="t">NEWS2 total</span>
      </div>

      <div className="chart" role="table" aria-label="Score per parameter">
        {news2.parameters.map((p) => (
          <div key={p.key} role="row" className={"cell " + (p.score === null ? "cx" : "c" + p.score)}>
            <span className="k">{p.label}</span>
            <span className="v">{p.value ?? "–"}</span>
            <span className="p">{p.score === null ? "" : `${p.score} pt`}</span>
          </div>
        ))}
      </div>

      <div className="why">
        <h3>Why</h3>
        <ul>
          {reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      <p className="note">
        Priority bands follow Manchester-style colours. NEWS2 is an early warning score, not a full
        triage system, so this mapping is a teaching simplification. Not validated for children,
        pregnancy, or chronic hypercapnic respiratory failure (SpO₂ scale 2).
      </p>
    </section>
  );
}
