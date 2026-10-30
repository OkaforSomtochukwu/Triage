import { scoreObservations, type Observations, type News2Result } from "./news2";

/** The same seven red flags, grouped under the ABCDE step where they are looked for. */
export const RED_FLAGS = [
  { id: "airway", group: "A", text: "Airway compromise, stridor, or choking" },
  { id: "anaph", group: "B", text: "Anaphylaxis: allergen exposure with swelling, wheeze, or hypotension" },
  { id: "bleed", group: "C", text: "Catastrophic or uncontrolled bleeding" },
  { id: "chest", group: "C", text: "Chest pain with sweating, pallor, or radiation to arm or jaw" },
  { id: "seizure", group: "D", text: "Active seizure" },
  { id: "stroke", group: "D", text: "Sudden facial droop, arm weakness, or speech disturbance (FAST positive)" },
  { id: "glucose", group: "D", text: "Reduced consciousness with very low or very high blood glucose" },
] as const;

export const ABCDE = [
  { letter: "A", title: "Airway", note: null },
  { letter: "B", title: "Breathing", note: "Respiratory rate, SpO₂ and oxygen use are scored under vital signs." },
  { letter: "C", title: "Circulation", note: "Pulse and systolic BP are scored under vital signs." },
  { letter: "D", title: "Disability", note: "Level of consciousness is scored under vital signs." },
  { letter: "E", title: "Exposure", note: "Temperature is scored under vital signs." },
] as const;

export type RedFlagId = (typeof RED_FLAGS)[number]["id"];

export type BandId = "red" | "orange" | "yellow" | "green" | "blue";

export interface Band {
  id: BandId;
  priority: number;
  name: string;
  action: string;
}

export const BANDS: Record<BandId, Band> = {
  red: { id: "red", priority: 1, name: "Immediate", action: "Resuscitation: needs senior clinician attention now." },
  orange: { id: "orange", priority: 2, name: "Very urgent", action: "Urgent clinical review, aim to be seen within about 10 minutes." },
  yellow: { id: "yellow", priority: 3, name: "Urgent", action: "Prompt assessment, aim to be seen within about an hour." },
  green: { id: "green", priority: 4, name: "Standard", action: "Routine assessment with regular repeat observations." },
  blue: { id: "blue", priority: 5, name: "Non-urgent", action: "Low physiological risk and no red flags ticked. NEWS2 ignores the presenting complaint, so use clinical judgement." },
};

export type Assessment =
  | { status: "empty"; news2: News2Result }
  | { status: "incomplete"; news2: News2Result; reasons: string[] }
  | { status: "ready"; news2: News2Result; band: Band; reasons: string[] };

/**
 * Maps NEWS2 and red flags to a suggested priority band.
 * NEWS2 is an early warning score, not a triage system, so this mapping is a
 * teaching simplification. Red flags always override the score.
 */
export function assess(obs: Observations, flagIds: readonly RedFlagId[]): Assessment {
  const news2 = scoreObservations(obs);
  const entered = news2.parameters.filter((p) => p.score !== null);
  // Oxygen and consciousness always hold a default, so they alone do not count as input.
  const numericEntered = entered.filter((p) => p.key !== "oxygen" && p.key !== "consciousness");
  const hasInput = numericEntered.length > 0 || entered.some((p) => (p.score ?? 0) > 0);
  const flags = RED_FLAGS.filter((f) => flagIds.includes(f.id));

  const reasons: string[] = flags.map(
    (f) => `Red flag: ${f.text}. Red flags override the score.`,
  );
  let band: BandId | null = flags.length ? "red" : null;

  if (news2.total >= 7) {
    band ??= "red";
    reasons.push(`NEWS2 of ${news2.total} is 7 or more, which calls for an emergency response.`);
  } else if (news2.total >= 5) {
    band ??= "orange";
    reasons.push(`NEWS2 of ${news2.total} is 5 to 6, which calls for an urgent response.`);
  } else if (news2.anyRed) {
    band ??= "yellow";
    reasons.push("A single parameter scores 3, which triggers an urgent review even when the total is low.");
  } else if (hasInput && news2.total >= 1) {
    band ??= "green";
    reasons.push(`NEWS2 of ${news2.total} is in the low range (1 to 4) with no single parameter scoring 3.`);
  } else if (hasInput && news2.missing === 0) {
    band ??= "blue";
    reasons.push("Every parameter scores 0 and no red flags are ticked. NEWS2 does not account for the presenting complaint, so reassess if anything changes.");
  }

  for (const p of entered) {
    if (p.score) reasons.push(`${p.label} ${p.value} scores ${p.score}.`);
  }
  if (news2.missing > 0 && hasInput) {
    reasons.push(
      `${news2.missing} parameter${news2.missing > 1 ? "s" : ""} not entered yet, so the total may be an underestimate.`,
    );
  }

  if (!band) {
    return !hasInput && flags.length === 0
      ? { status: "empty", news2 }
      : { status: "incomplete", news2, reasons };
  }
  return { status: "ready", news2, band: BANDS[band], reasons };
}
