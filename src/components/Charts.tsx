import type { BandId } from "../lib/triage";

export const BAND_COLOR: Record<BandId, string> = {
  red: "var(--red)", orange: "var(--orange)", yellow: "var(--yellow)", green: "var(--green)", blue: "var(--blue)",
};

const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
const arc = (cx: number, cy: number, r: number, from: number, to: number) => {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};
const START = 225;
const SWEEP = 270;

interface GaugeProps {
  value: number | null;
  /** Value at which the arc is full. */
  max: number;
  color: string;
  /** Text in the box under the number, e.g. HIGH. Omit for the small gauge. */
  label?: string;
  display?: string;
  title: string;
  small?: boolean;
}

/** 270-degree arc gauge, the hero element of the board. */
export function Gauge({ value, max, color, label, display, title, small }: GaugeProps) {
  const f = value === null ? 0 : Math.min(Math.max(value / max, 0), 1);
  const text = display ?? (value === null ? "–" : String(value));
  return (
    <div className={"gauge" + (small ? " sm" : "")}>
      <svg viewBox="0 0 300 300" role="img" aria-label={`${title}: ${text}${label ? ", " + label : ""}`}>
        <path className="g-track" d={arc(150, 150, 120, START, START + SWEEP)} />
        {!small && <path className="g-ticks" d={arc(150, 150, 94, START, START + SWEEP)} />}
        {f > 0 && <path className="g-prog" style={{ stroke: color, color }} d={arc(150, 150, 120, START, START + SWEEP * f)} />}
        <text x="150" y={small ? 178 : 168} textAnchor="middle" className="g-num" style={{ fill: color }}>{text}</text>
        {label && (
          <>
            <rect x="85" y="196" width="130" height="38" rx="6" fill="none" stroke={color} strokeWidth="2" />
            <text x="150" y="223" textAnchor="middle" className="g-lab" style={{ fill: color }}>{label}</text>
          </>
        )}
      </svg>
    </div>
  );
}

export interface Dot { key: string; ticket: string; wait: number; score: number; color: string; title: string }

/** Wait time against NEWS2 for everyone in the queue. */
export function Scatter({ dots }: { dots: Dot[] }) {
  if (dots.length === 0) return <div className="empty-chart">No patients on the board</div>;
  const W = 380, H = 290, pl = 36, pr = 14, pt = 12, pb = 32;
  const xmax = Math.max(60, Math.ceil(Math.max(...dots.map((d) => d.wait)) / 30) * 30);
  const ymax = Math.max(10, Math.ceil(Math.max(...dots.map((d) => d.score)) / 5) * 5);
  const X = (v: number) => pl + (v / xmax) * (W - pl - pr);
  const Y = (v: number) => H - pb - (v / ymax) * (H - pt - pb);
  const yt = Array.from({ length: ymax / 5 + 1 }, (_, i) => i * 5);
  const xt = Array.from({ length: xmax / 30 + 1 }, (_, i) => i * 30);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Waiting time against NEWS2 score for each patient in the queue">
      {yt.map((v) => (
        <g key={"y" + v}>
          <line className="grid-l" x1={pl} x2={W - pr} y1={Y(v)} y2={Y(v)} />
          <text className="tick" x={pl - 6} y={Y(v) + 3} textAnchor="end">{v}</text>
        </g>
      ))}
      {xt.map((v) => (
        <text key={"x" + v} className="tick" x={X(v)} y={H - pb + 14} textAnchor="middle">{v}</text>
      ))}
      <line className="axis" x1={pl} x2={W - pr} y1={H - pb} y2={H - pb} />
      <line className="axis" x1={pl} x2={pl} y1={pt} y2={H - pb} />
      {ymax >= 5 && <line className="thr" stroke="var(--orange)" x1={pl} x2={W - pr} y1={Y(5)} y2={Y(5)} />}
      {ymax >= 7 && <line className="thr" stroke="var(--red)" x1={pl} x2={W - pr} y1={Y(7)} y2={Y(7)} />}
      <text className="tick" x={W / 2} y={H - 2} textAnchor="middle">Minutes waiting</text>
      <text className="tick" x={10} y={H / 2} textAnchor="middle" transform={`rotate(-90 10 ${H / 2})`}>NEWS2</text>
      {dots.map((d) => (
        <g key={d.key}>
          <circle cx={X(d.wait)} cy={Y(d.score)} r={7} fill={d.color} style={{ filter: `drop-shadow(0 0 6px ${d.color})` }}>
            <title>{d.title}</title>
          </circle>
          <text className="dotlabel" x={X(d.wait)} y={Y(d.score) - 11} textAnchor="middle">{d.ticket}</text>
        </g>
      ))}
    </svg>
  );
}

/** NEWS2 across a patient's sets of observations, oldest to newest. */
export function TrendLine({ points }: { points: number[] }) {
  if (points.length === 0) return <div className="empty-chart">No observations yet</div>;
  const W = 380, H = 250, pl = 30, pr = 18, pt = 22, pb = 16;
  const ymax = Math.max(10, Math.ceil(Math.max(...points) / 5) * 5);
  const X = (i: number) => (points.length === 1 ? (W + pl - pr) / 2 : pl + (i / (points.length - 1)) * (W - pl - pr));
  const Y = (v: number) => H - pb - (v / ymax) * (H - pt - pb);
  const path = points.map((v, i) => `${i === 0 ? "M" : "L"} ${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  const yt = Array.from({ length: ymax / 5 + 1 }, (_, i) => i * 5);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`NEWS2 across observations: ${points.join(", ")}`}>
      {yt.map((v) => (
        <g key={v}>
          <line className="grid-l" x1={pl} x2={W - pr} y1={Y(v)} y2={Y(v)} />
          <text className="tick" x={pl - 6} y={Y(v) + 3} textAnchor="end">{v}</text>
        </g>
      ))}
      {points.length > 1 && <path className="t-line" d={path} />}
      {points.map((v, i) => (
        <g key={i}>
          <circle className="t-dot" cx={X(i)} cy={Y(v)} r={5} />
          <text className="dotlabel" x={X(i)} y={Y(v) - 10} textAnchor="middle">{v}</text>
        </g>
      ))}
    </svg>
  );
}

const paths: Record<string, string> = {
  waiting: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c0-4.4 3.6-7 8-7s8 2.6 8 7",
  critical: "M12 3 2 20h20L12 3zM12 10v4M12 17.5v.5",
  clock: "M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 9v4l3 2M9 2h6",
  seen: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12.5l3 3 5-6",
};
export function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
