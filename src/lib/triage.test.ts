import { describe, it, expect } from "vitest";
import { assess } from "./triage";
import { EMPTY_OBS, EXAMPLES } from "./examples";

const stable = EXAMPLES[0].obs;

describe("assess", () => {
  it("is empty with no input", () => {
    expect(assess(EMPTY_OBS, []).status).toBe("empty");
  });

  it("returns Non-urgent when everything scores 0", () => {
    const a = assess(stable, []);
    expect(a.status === "ready" && a.band.id).toBe("blue");
  });

  it("reminds the user that NEWS2 ignores the presenting complaint when everything scores 0", () => {
    const a = assess(stable, []);
    expect(a.status === "ready" && a.reasons.join(" ")).toContain("presenting complaint");
  });

  it("returns Standard for a total of 1 to 4 with no red score", () => {
    const a = assess({ ...stable, pulse: 95 }, []);
    expect(a.status === "ready" && a.band.id).toBe("green");
  });

  it("returns Urgent when a single parameter scores 3 on a low total", () => {
    const a = assess({ ...stable, respRate: 7 }, []);
    expect(a.status === "ready" && a.band.id).toBe("yellow");
  });

  it("returns Very urgent for a total of 5 to 6", () => {
    // pulse 112 (2) + temp 39.2 (2) + SpO2 94 (1) = 5
    const a = assess({ ...stable, pulse: 112, temp: 39.2, spo2: 94 }, []);
    expect(a.status === "ready" && a.band.id).toBe("orange");
  });

  it("returns Immediate for a total of 7 or more", () => {
    const a = assess(EXAMPLES[1].obs, []);
    expect(a.status === "ready" && a.band.id).toBe("red");
  });

  it("lets a red flag override a reassuring score", () => {
    const a = assess(stable, ["stroke"]);
    expect(a.status === "ready" && a.band.id).toBe("red");
    expect(a.status === "ready" && a.reasons[0]).toContain("FAST");
  });

  it("is incomplete, not wrong, when only some values are in and all are normal", () => {
    const a = assess({ ...EMPTY_OBS, respRate: 16 }, []);
    expect(a.status).toBe("incomplete");
  });
});
