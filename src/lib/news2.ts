/**
 * NEWS2 (National Early Warning Score 2, Royal College of Physicians, 2017).
 * SpO2 Scale 1 only. Adults only.
 * Pure functions, no UI or framework code, so they are easy to test and audit.
 */

export type Consciousness = "A" | "C" | "V" | "P" | "U";

export interface Observations {
  respRate: number | null;
  spo2: number | null;
  onOxygen: boolean;
  systolic: number | null;
  pulse: number | null;
  temp: number | null;
  consciousness: Consciousness;
}

export type ParameterKey =
  | "respRate"
  | "spo2"
  | "oxygen"
  | "systolic"
  | "pulse"
  | "consciousness"
  | "temp";

export interface ParameterScore {
  key: ParameterKey;
  label: string;
  /** Display value, or null when not yet entered. */
  value: string | null;
  /** 0 to 3, or null when not yet entered. */
  score: 0 | 1 | 2 | 3 | null;
}

export type Score = 0 | 1 | 2 | 3;

export const scoreRespRate = (v: number): Score =>
  v <= 8 ? 3 : v <= 11 ? 1 : v <= 20 ? 0 : v <= 24 ? 2 : 3;

export const scoreSpo2 = (v: number): Score =>
  v <= 91 ? 3 : v <= 93 ? 2 : v <= 95 ? 1 : 0;

export const scoreOxygen = (onOxygen: boolean): Score => (onOxygen ? 2 : 0);

export const scoreSystolic = (v: number): Score =>
  v <= 90 ? 3 : v <= 100 ? 2 : v <= 110 ? 1 : v <= 219 ? 0 : 3;

export const scorePulse = (v: number): Score =>
  v <= 40 ? 3 : v <= 50 ? 1 : v <= 90 ? 0 : v <= 110 ? 1 : v <= 130 ? 2 : 3;

export const scoreConsciousness = (c: Consciousness): Score => (c === "A" ? 0 : 3);

export const scoreTemp = (v: number): Score =>
  v <= 35.0 ? 3 : v <= 36.0 ? 1 : v <= 38.0 ? 0 : v <= 39.0 ? 1 : 2;

export const CONSCIOUSNESS_LABEL: Record<Consciousness, string> = {
  A: "Alert",
  C: "New confusion",
  V: "Voice",
  P: "Pain",
  U: "Unresponsive",
};

export interface News2Result {
  parameters: ParameterScore[];
  /** Sum of the parameters that have been entered. */
  total: number;
  /** Number of parameters still missing. */
  missing: number;
  /** True when any single parameter scores 3. */
  anyRed: boolean;
}

export function scoreObservations(obs: Observations): News2Result {
  const num = (
    key: ParameterKey,
    label: string,
    v: number | null,
    fn: (n: number) => Score,
  ): ParameterScore => ({
    key,
    label,
    value: v === null ? null : String(v),
    score: v === null ? null : fn(v),
  });

  const parameters: ParameterScore[] = [
    num("respRate", "Resp rate", obs.respRate, scoreRespRate),
    num("spo2", "SpO₂", obs.spo2, scoreSpo2),
    {
      key: "oxygen",
      label: "On O₂",
      value: obs.onOxygen ? "Yes" : "No",
      score: scoreOxygen(obs.onOxygen),
    },
    num("systolic", "Systolic BP", obs.systolic, scoreSystolic),
    num("pulse", "Pulse", obs.pulse, scorePulse),
    {
      key: "consciousness",
      label: "Conscious level",
      value: CONSCIOUSNESS_LABEL[obs.consciousness],
      score: scoreConsciousness(obs.consciousness),
    },
    num("temp", "Temp", obs.temp, scoreTemp),
  ];

  const entered = parameters.filter((p) => p.score !== null);
  return {
    parameters,
    total: entered.reduce((sum, p) => sum + (p.score ?? 0), 0),
    missing: parameters.length - entered.length,
    anyRed: entered.some((p) => p.score === 3),
  };
}
