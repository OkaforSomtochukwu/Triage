import { scoreObservations, type Observations } from "./news2";
import { assess, BANDS, type Band, type BandId, type RedFlagId } from "./triage";

export type Sex = "F" | "M" | "NR";
export const SEX_LABEL: Record<Sex, string> = { F: "Female", M: "Male", NR: "Not recorded" };

export interface ObsRecord {
  at: number;
  obs: Observations;
  flags: RedFlagId[];
}

export type Status = "waiting" | "assessing" | "seen";
export const STATUS_LABEL: Record<Status, string> = {
  waiting: "Waiting",
  assessing: "Being assessed",
  seen: "Seen",
};

export interface Patient {
  id: string;
  /** Queue number, shown instead of the name on the board. */
  ticket: number;
  status: Status;
  /** Set when status becomes "seen". */
  seenAt?: number;
  name: string;
  age: number;
  sex: Sex;
  complaint: string;
  arrivedAt: number;
  /** Oldest first. The last record is the current set of observations. */
  history: ObsRecord[];
}

export interface Bio {
  name: string;
  age: string;
  sex: Sex;
  complaint: string;
}

export const MIN_AGE = 16;
export const MAX_AGE = 120;

/** Plausible ranges. Catches typos such as 160 for a respiratory rate of 16. */
export const RANGES = {
  respRate: [4, 60],
  spo2: [50, 100],
  systolic: [40, 300],
  pulse: [20, 250],
  temp: [30, 43],
} as const;

const VITAL_LABEL = {
  respRate: "Respiratory rate",
  spo2: "SpO₂",
  systolic: "Systolic BP",
  pulse: "Pulse",
  temp: "Temperature",
} as const;

type VitalKey = keyof typeof RANGES;

export const latest = (p: Patient): ObsRecord => p.history[p.history.length - 1];

export const ticketLabel = (n: number): string => String(n).padStart(3, "0");
export const nextTicket = (patients: Patient[]): number =>
  patients.reduce((max, p) => Math.max(max, p.ticket), 0) + 1;
export const isActive = (p: Patient): boolean => p.status !== "seen";

export interface BoardStats {
  /** Patients not yet seen. */
  waiting: number;
  /** Patients not yet seen who are in the Immediate band. */
  critical: number;
  /** Mean time waited so far by patients not yet seen, or null if nobody is waiting. */
  avgWaitMs: number | null;
  seen: number;
}

export function boardStats(patients: Patient[], now: number): BoardStats {
  const active = patients.filter(isActive);
  return {
    waiting: active.length,
    critical: active.filter((p) => triagePatient(p).band?.id === "red").length,
    avgWaitMs: active.length === 0 ? null : active.reduce((sum, p) => sum + (now - p.arrivedAt), 0) / active.length,
    seen: patients.length - active.length,
  };
}

export function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function validateIntake(bio: Bio, obs: Observations, flags: readonly RedFlagId[]): string[] {
  const errors: string[] = [];

  if (!bio.name.trim()) errors.push("Enter the patient's name.");

  const age = Number(bio.age);
  if (bio.age.trim() === "" || !Number.isInteger(age)) {
    errors.push("Enter the age as a whole number.");
  } else if (age < MIN_AGE) {
    errors.push(
      `NEWS2 is validated for ages ${MIN_AGE} and over. Younger patients need a paediatric score (PEWS) and clinician review.`,
    );
  } else if (age > MAX_AGE) {
    errors.push(`Check the age: ${age} is above ${MAX_AGE}.`);
  }

  if (!bio.complaint.trim()) errors.push("Enter the presenting complaint.");

  const missing: string[] = [];
  (Object.keys(RANGES) as VitalKey[]).forEach((k) => {
    const v = obs[k];
    if (v === null) {
      missing.push(VITAL_LABEL[k]);
      return;
    }
    const [lo, hi] = RANGES[k];
    if (v < lo || v > hi) {
      errors.push(`Check ${VITAL_LABEL[k]}: ${v} is outside the plausible range (${lo} to ${hi}).`);
    }
  });
  if (missing.length > 0 && flags.length === 0) {
    errors.push(
      `Enter ${missing.join(", ")}. A partial set of observations understates the score. If the patient needs immediate care, tick a red flag and add observations afterwards.`,
    );
  }

  return errors;
}

export interface TriagedPatient {
  patient: Patient;
  /** Null when there is not enough data to place the patient in a band. */
  band: Band | null;
  total: number;
  /** Change in NEWS2 since the previous set of observations, or null if there is only one set. */
  trend: number | null;
  /** Number of the five numeric observations still missing. */
  missing: number;
}

export function triagePatient(p: Patient): TriagedPatient {
  const rec = latest(p);
  const a = assess(rec.obs, rec.flags);
  const prev = p.history.length >= 2 ? p.history[p.history.length - 2] : null;
  return {
    patient: p,
    band: a.status === "ready" ? a.band : null,
    total: a.news2.total,
    trend: prev ? a.news2.total - scoreObservations(prev.obs).total : null,
    missing: a.news2.missing,
  };
}

/**
 * Most critical first: priority band, then higher NEWS2, then longest wait.
 * Patients who could not be placed in a band sort to the top so they are not missed.
 * Within a band the order is a convenience. The clinician decides who is seen next.
 */
export function sortTriaged(list: TriagedPatient[]): TriagedPatient[] {
  return [...list].sort(
    (a, b) =>
      (a.band?.priority ?? 0) - (b.band?.priority ?? 0) ||
      b.total - a.total ||
      a.patient.arrivedAt - b.patient.arrivedAt,
  );
}

export type Summary = Record<BandId, number> & { unplaced: number };

export function summarise(list: TriagedPatient[]): Summary {
  const s: Summary = { red: 0, orange: 0, yellow: 0, green: 0, blue: 0, unplaced: 0 };
  for (const t of list) {
    if (t.band) s[t.band.id] += 1;
    else s.unplaced += 1;
  }
  return s;
}

export function formatWait(ms: number): string {
  const mins = Math.max(0, Math.floor(ms / 60000));
  if (mins < 1) return "just arrived";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Compact form for stat cards: 45m, 1h 3m. */
export function formatWaitShort(ms: number): string {
  const mins = Math.max(0, Math.floor(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export const BAND_ORDER: BandId[] = ["red", "orange", "yellow", "green", "blue"];
export const bandName = (id: BandId): string => BANDS[id].name;

/** Fictional patients for demos. Never replace these with real people. */
export function seedDemo(now: number): Patient[] {
  const min = (m: number) => now - m * 60000;
  const mk = (
    ticket: number, name: string, age: number, sex: Sex, complaint: string,
    arrivedMinAgo: number, status: Status,
    history: [number, Observations, RedFlagId[]?][],
    seenMinAgo?: number,
  ): Patient => ({
    id: `demo-${ticket}`,
    ticket,
    status,
    ...(seenMinAgo !== undefined ? { seenAt: min(seenMinAgo) } : {}),
    name,
    age,
    sex,
    complaint,
    arrivedAt: min(arrivedMinAgo),
    history: history.map(([minAgo, obs, flags]) => ({ at: min(minAgo), obs, flags: flags ?? [] })),
  });
  const o = (
    respRate: number, spo2: number, onOxygen: boolean, systolic: number,
    pulse: number, temp: number, consciousness: Observations["consciousness"] = "A",
  ): Observations => ({ respRate, spo2, onOxygen, systolic, pulse, temp, consciousness });

  return [
    mk(1, "Funmi Alabi", 29, "F", "Minor cut to finger", 130, "seen", [[125, o(15, 99, false, 118, 72, 36.7)]], 25),
    mk(2, "Ngozi Udo", 41, "F", "Lower abdominal pain since morning", 120, "waiting", [[110, o(16, 98, false, 126, 95, 37.0)]]),
    mk(3, "Chidi Okafor", 24, "M", "Twisted ankle playing football", 95, "waiting", [[90, o(16, 98, false, 124, 78, 36.8)]]),
    mk(4, "Amina Bello", 67, "F", "Fever and confusion for two days", 70, "assessing", [
      [65, o(20, 96, false, 112, 98, 38.2)],
      [10, o(26, 93, true, 92, 124, 39.4, "C")],
    ]),
    mk(5, "Tunde Adebayo", 72, "M", "Productive cough and breathlessness", 45, "waiting", [[40, o(20, 94, false, 128, 112, 39.2)]]),
    mk(6, "Efiong Etim", 35, "M", "Dizzy and light-headed after standing", 30, "waiting", [[25, o(16, 98, false, 88, 82, 36.6)]]),
    mk(7, "Emeka Eze", 58, "M", "Sudden weakness in left arm", 20, "waiting", [[18, o(18, 97, false, 182, 84, 36.9), ["stroke"]]]),
  ];
}
