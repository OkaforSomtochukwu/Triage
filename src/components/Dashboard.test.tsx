import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import Dashboard from "./Dashboard";
import PatientDetail from "./PatientDetail";
import { seedDemo } from "../lib/patients";

const noop = () => {};
const NOW = 1_800_000_000_000;

const board = (patients = seedDemo(NOW)) =>
  renderToString(
    <Dashboard patients={patients} now={NOW} onAdd={noop} onOpen={noop} onStatus={noop} onDemo={noop} onClear={noop} />,
  );

describe("Dashboard render", () => {
  it("lists the queue in order of criticality", () => {
    const html = board();
    // Amina (sepsis), Emeka (stroke flag), Tunde, Efiong, Ngozi, Chidi
    const tickets = ["004", "007", "005", "006", "002", "003"];
    const positions = tickets.map((t) => html.indexOf(`data-ticket="${t}"`));
    expect(positions.every((p) => p > -1)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(html).toContain("Rising by 14 since last observations");
  });

  it("never shows patient names on the board", () => {
    const html = board();
    for (const name of ["Amina", "Emeka", "Tunde", "Efiong", "Ngozi", "Chidi", "Funmi"]) {
      expect(html).not.toContain(name);
    }
  });

  it("keeps seen patients out of the queue and in the seen list", () => {
    const html = board();
    const queueEnd = html.indexOf('class="seen"');
    expect(queueEnd).toBeGreaterThan(-1);
    expect(html.indexOf('data-ticket="001"')).toBeGreaterThan(queueEnd);
    expect(html).toContain("<summary>Seen (");
  });

  it("shows the board statistics", () => {
    const html = board();
    expect(html).toContain("Waiting");
    expect(html).toContain("Critical");
    expect(html).toContain("Average wait");
  });

  it("shows an empty state with no patients", () => {
    expect(board([])).toContain("No patients yet");
  });
});

describe("PatientDetail render", () => {
  it("shows the name, bio and observation history for the opened patient", () => {
    const amina = seedDemo(NOW).find((p) => p.name === "Amina Bello")!;
    const html = renderToString(
      <PatientDetail patient={amina} now={NOW} onBack={noop} onReassess={noop} onStatus={noop} onRemove={noop} />,
    );
    expect(html).toContain("Amina Bello");
    expect(html).toContain("Fever and confusion for two days");
    expect(html).toContain("Observation history");
    expect(html).toContain("Mark as seen"); // she is being assessed
    expect(html).toContain("Reassess");
  });
});
