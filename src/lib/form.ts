import type { FormState } from "../components/ObservationForm";
import type { Observations } from "./news2";
import type { RedFlagId } from "./triage";

export const EMPTY_FORM: FormState = {
  respRate: "", spo2: "", systolic: "", pulse: "", temp: "",
  consciousness: "A", onOxygen: false, flags: [],
};

const toNum = (s: string): number | null => {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export function formToObs(f: FormState): Observations {
  return {
    respRate: toNum(f.respRate),
    spo2: toNum(f.spo2),
    systolic: toNum(f.systolic),
    pulse: toNum(f.pulse),
    temp: toNum(f.temp),
    onOxygen: f.onOxygen,
    consciousness: f.consciousness,
  };
}

export function obsToForm(obs: Observations, flags: RedFlagId[]): FormState {
  const s = (n: number | null) => (n === null ? "" : String(n));
  return {
    respRate: s(obs.respRate), spo2: s(obs.spo2), systolic: s(obs.systolic),
    pulse: s(obs.pulse), temp: s(obs.temp),
    consciousness: obs.consciousness, onOxygen: obs.onOxygen, flags,
  };
}
