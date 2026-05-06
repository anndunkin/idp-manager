/**
 * Generate a human-readable label for a milestone period number given the
 * total number of milestone periods for the plan.
 *
 * count=2  → H1, H2           (halves)
 * count=3  → T1, T2, T3       (thirds)
 * count=4  → Q1, Q2, Q3, Q4   (quarters — default)
 * count=6  → B1–B6            (bi-months)
 * count=12 → M1–M12           (months)
 * other    → P1, P2…          (generic periods)
 */
export function milestoneLabel(periodNum: number, totalPeriods: number): string {
  switch (totalPeriods) {
    case 2:  return `H${periodNum}`;
    case 3:  return `T${periodNum}`;
    case 4:  return `Q${periodNum}`;
    case 6:  return `B${periodNum}`;
    case 12: return `M${periodNum}`;
    default: return `P${periodNum}`;
  }
}

/** Full period label for display (e.g. "Quarter 1", "Month 3") */
export function milestoneLabelFull(periodNum: number, totalPeriods: number): string {
  switch (totalPeriods) {
    case 2:  return `Half ${periodNum}`;
    case 3:  return `Third ${periodNum}`;
    case 4:  return `Quarter ${periodNum}`;
    case 6:  return `Bi-Month ${periodNum}`;
    case 12: return `Month ${periodNum}`;
    default: return `Period ${periodNum}`;
  }
}

/** Short heading for the column (same as milestoneLabel) */
export function milestoneColumnHeader(periodNum: number, totalPeriods: number): string {
  return milestoneLabel(periodNum, totalPeriods);
}

/** Generate an array [1..count] */
export function milestonePeriods(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i + 1);
}

/** Preset options shown in the plan creation form */
export const MILESTONE_PRESETS: Array<{ value: number; label: string }> = [
  { value: 2,  label: '2 — Semi-Annual (H1, H2)' },
  { value: 3,  label: '3 — Thirds (T1, T2, T3)' },
  { value: 4,  label: '4 — Quarterly (Q1, Q2, Q3, Q4)' },
  { value: 6,  label: '6 — Bi-Monthly (B1–B6)' },
  { value: 12, label: '12 — Monthly (M1–M12)' },
];
