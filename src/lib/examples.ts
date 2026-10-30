import type { Observations } from "./news2";
import type { RedFlagId } from "./triage";

export interface Example {
  label: string;
  obs: Observations;
  flags: RedFlagId[];
}

export const EMPTY_OBS: Observations = {
  respRate: null,
  spo2: null,
  onOxygen: false,
  systolic: null,
  pulse: null,
  temp: null,
  consciousness: "A",
};

export const EXAMPLES: Example[] = [
  {
    label: "Example: stable",
    obs: { respRate: 16, spo2: 98, onOxygen: false, systolic: 124, pulse: 78, temp: 36.8, consciousness: "A" },
    flags: [],
  },
  {
    label: "Example: septic",
    obs: { respRate: 26, spo2: 93, onOxygen: true, systolic: 92, pulse: 124, temp: 39.4, consciousness: "C" },
    flags: [],
  },
  {
    label: "Example: stroke",
    obs: { respRate: 18, spo2: 97, onOxygen: false, systolic: 182, pulse: 84, temp: 36.9, consciousness: "A" },
    flags: ["stroke"],
  },
];
