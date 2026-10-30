import { describe, it, expect } from "vitest";
import {
  scoreRespRate, scoreSpo2, scoreSystolic, scorePulse, scoreTemp,
  scoreOxygen, scoreConsciousness, scoreObservations, type Score,
} from "./news2";

/** [input, expected score] pairs sit on each boundary of the NEWS2 chart. */
const table = (fn: (n: number) => Score, rows: [number, Score][]) =>
  rows.forEach(([input, expected]) => expect(fn(input), `input ${input}`).toBe(expected));

describe("NEWS2 parameter scoring", () => {
  it("respiratory rate", () =>
    table(scoreRespRate, [[6, 3], [8, 3], [9, 1], [11, 1], [12, 0], [20, 0], [21, 2], [24, 2], [25, 3], [30, 3]]));

  it("SpO2 scale 1", () =>
    table(scoreSpo2, [[85, 3], [91, 3], [92, 2], [93, 2], [94, 1], [95, 1], [96, 0], [100, 0]]));

  it("systolic BP", () =>
    table(scoreSystolic, [[70, 3], [90, 3], [91, 2], [100, 2], [101, 1], [110, 1], [111, 0], [219, 0], [220, 3]]));

  it("pulse", () =>
    table(scorePulse, [[35, 3], [40, 3], [41, 1], [50, 1], [51, 0], [90, 0], [91, 1], [110, 1], [111, 2], [130, 2], [131, 3]]));

  it("temperature", () =>
    table(scoreTemp, [[34.0, 3], [35.0, 3], [35.1, 1], [36.0, 1], [36.1, 0], [38.0, 0], [38.1, 1], [39.0, 1], [39.1, 2], [41, 2]]));

  it("supplemental oxygen", () => {
    expect(scoreOxygen(true)).toBe(2);
    expect(scoreOxygen(false)).toBe(0);
  });

  it("consciousness: alert is 0, anything else is 3", () => {
    expect(scoreConsciousness("A")).toBe(0);
    for (const c of ["C", "V", "P", "U"] as const) expect(scoreConsciousness(c)).toBe(3);
  });
});

describe("scoreObservations", () => {
  const normal = { respRate: 16, spo2: 98, onOxygen: false, systolic: 124, pulse: 78, temp: 36.8, consciousness: "A" as const };

  it("scores a normal patient as 0", () => {
    const r = scoreObservations(normal);
    expect(r.total).toBe(0);
    expect(r.missing).toBe(0);
    expect(r.anyRed).toBe(false);
  });

  it("sums a deteriorating patient", () => {
    const r = scoreObservations({ respRate: 26, spo2: 93, onOxygen: true, systolic: 92, pulse: 124, temp: 39.4, consciousness: "C" });
    // RR 3 + SpO2 2 + O2 2 + SBP 2 + HR 2 + consciousness 3 + temp 2
    expect(r.total).toBe(16);
    expect(r.anyRed).toBe(true);
  });

  it("counts missing parameters and ignores them in the total", () => {
    const r = scoreObservations({ ...normal, respRate: null, temp: null });
    expect(r.missing).toBe(2);
    expect(r.total).toBe(0);
  });
});
