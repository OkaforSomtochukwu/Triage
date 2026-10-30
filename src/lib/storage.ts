import type { Patient, Status } from "./patients";

const KEY = "triage-helper:v1";

const STATUSES: Status[] = ["waiting", "assessing", "seen"];

const isPatient = (x: unknown): x is Patient => {
  if (typeof x !== "object" || x === null) return false;
  const p = x as Partial<Patient>;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.age === "number" &&
    typeof p.complaint === "string" &&
    typeof p.arrivedAt === "number" &&
    Array.isArray(p.history) &&
    p.history.length > 0 &&
    p.history.every((r) => typeof r === "object" && r !== null && typeof r.at === "number" && typeof r.obs === "object")
  );
};

/** Browser-only storage. Nothing leaves the device. */
export function loadPatients(): Patient[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    // Boards saved before tickets and statuses existed are upgraded on load.
    return data.filter(isPatient).map((p, i) => ({
      ...p,
      ticket: typeof p.ticket === "number" ? p.ticket : i + 1,
      status: STATUSES.includes(p.status) ? p.status : "waiting",
    }));
  } catch {
    return [];
  }
}

export function savePatients(patients: Patient[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(patients));
  } catch {
    /* storage unavailable or full: the board still works for this session */
  }
}
