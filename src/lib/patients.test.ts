import { describe, it, expect } from "vitest";
import {
  boardStats, formatWait, formatWaitShort, isActive, nextTicket, seedDemo, sortTriaged, summarise, ticketLabel,
  triagePatient, validateIntake,
  type Bio, type Patient,
} from "./patients";
import { EXAMPLES } from "./examples";

const NOW = 1_800_000_000_000;
const bio: Bio = { name: "Test Patient", age: "40", sex: "NR", complaint: "Cough" };
const good = EXAMPLES[0].obs;

describe("validateIntake", () => {
  it("accepts a complete, plausible intake", () => {
    expect(validateIntake(bio, good, [])).toEqual([]);
  });

  it("requires name, age and complaint", () => {
    const errs = validateIntake({ ...bio, name: " ", age: "", complaint: "" }, good, []);
    expect(errs).toHaveLength(3);
  });

  it("rejects patients under 16 because NEWS2 does not apply", () => {
    const errs = validateIntake({ ...bio, age: "12" }, good, []);
    expect(errs[0]).toContain("paediatric");
  });

  it("rejects missing vitals unless a red flag is ticked", () => {
    const partial = { ...good, pulse: null };
    expect(validateIntake(bio, partial, [])[0]).toContain("Pulse");
    expect(validateIntake(bio, partial, ["airway"])).toEqual([]);
  });

  it("flags implausible values such as a respiratory rate of 160", () => {
    const errs = validateIntake(bio, { ...good, respRate: 160 }, []);
    expect(errs[0]).toContain("Respiratory rate");
  });
});

describe("sorting", () => {
  const demo = seedDemo(NOW).filter(isActive);
  const order = sortTriaged(demo.map(triagePatient)).map((t) => t.patient.name);

  it("puts the most critical first and the least critical last", () => {
    expect(order).toEqual([
      "Amina Bello",   // red, NEWS2 16
      "Emeka Eze",     // red, FAST-positive flag
      "Tunde Adebayo", // orange
      "Efiong Etim",   // yellow, single parameter scoring 3
      "Ngozi Udo",     // green
      "Chidi Okafor",  // blue
    ]);
  });

  it("breaks ties by NEWS2, then by who has waited longest", () => {
    const base = demo[0];
    const a: Patient = { ...base, id: "a", name: "A", arrivedAt: NOW - 10 * 60000 };
    const b: Patient = { ...base, id: "b", name: "B", arrivedAt: NOW - 50 * 60000 };
    const sorted = sortTriaged([a, b].map(triagePatient)).map((t) => t.patient.name);
    expect(sorted).toEqual(["B", "A"]);
  });

  it("places patients who cannot be banded at the top", () => {
    const partial: Patient = {
      ...demo[0], id: "p", name: "Partial",
      history: [{ at: NOW, obs: { ...good, respRate: 16, spo2: null, systolic: null, pulse: null, temp: null }, flags: [] }],
    };
    const sorted = sortTriaged([...demo, partial].map(triagePatient));
    expect(sorted[0].patient.name).toBe("Partial");
    expect(sorted[0].band).toBeNull();
  });

  it("counts patients per band", () => {
    const s = summarise(demo.map(triagePatient));
    expect(s).toEqual({ red: 2, orange: 1, yellow: 1, green: 1, blue: 1, unplaced: 0 });
  });
});

describe("board statistics", () => {
  it("counts waiting, critical, average wait and seen", () => {
    const stats = boardStats(seedDemo(NOW), NOW);
    expect(stats.waiting).toBe(6);
    expect(stats.critical).toBe(2);
    expect(stats.seen).toBe(1);
    // waits in minutes: 120, 95, 70, 45, 30, 20 -> mean 63.33
    expect(Math.round((stats.avgWaitMs ?? 0) / 60000)).toBe(63);
  });

  it("has no average wait when nobody is waiting", () => {
    expect(boardStats([], NOW).avgWaitMs).toBeNull();
  });
});

describe("tickets", () => {
  it("formats with leading zeros and increments past the highest ticket", () => {
    expect(ticketLabel(7)).toBe("007");
    expect(nextTicket(seedDemo(NOW))).toBe(8);
    expect(nextTicket([])).toBe(1);
  });
});

describe("trend", () => {
  it("shows the change in NEWS2 between the last two sets of observations", () => {
    const amina = seedDemo(NOW).find((p) => p.name === "Amina Bello")!;
    expect(triagePatient(amina).trend).toBe(14);
  });

  it("is null with a single set of observations", () => {
    expect(triagePatient(seedDemo(NOW)[0]).trend).toBeNull();
  });
});

describe("formatWaitShort", () => {
  it("is compact for stat cards", () => {
    expect(formatWaitShort(30_000)).toBe("0m");
    expect(formatWaitShort(45 * 60000)).toBe("45m");
    expect(formatWaitShort(63 * 60000)).toBe("1h 3m");
    expect(formatWaitShort(120 * 60000)).toBe("2h");
  });
});

describe("formatWait", () => {
  it("formats minutes and hours", () => {
    expect(formatWait(20_000)).toBe("just arrived");
    expect(formatWait(5 * 60000)).toBe("5 min");
    expect(formatWait(60 * 60000)).toBe("1 h");
    expect(formatWait(125 * 60000)).toBe("2 h 5 min");
    expect(formatWait(-5000)).toBe("just arrived");
  });
});
