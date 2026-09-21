// Fixed gap, not computed float epsilon: see docs/decisions.md.
const POSITION_GAP = 1000;

// Below this gap, computeDropPosition stops bisecting and tells the caller
// to renormalize instead of handing back an increasingly imprecise midpoint.
const MIN_POSITION_GAP = 1;

export type PositionNeighbors = {
  before: number | null;
  after: number | null;
};

/**
 * Computes the position value for a row moved between two neighbors.
 *
 * @param neighbors - The position of the row directly before and after
 *   the drop point, null at either end of the list
 * @returns The new position, or null when the gap has collapsed below
 *   what a midpoint can usefully bisect and the caller should renormalize
 */
export function computeDropPosition({ before, after }: PositionNeighbors): number | null {
  if (before === null && after === null) return POSITION_GAP;
  if (before === null) return after! - POSITION_GAP;
  if (after === null) return before + POSITION_GAP;

  const gap = after - before;
  if (gap < MIN_POSITION_GAP) return null;
  return before + gap / 2;
}

/**
 * Computes the position for a newly created task, appended to the end
 * of its project's list.
 *
 * @param maxPosition - The highest existing position in the project, or
 *   null when the project has no tasks yet
 * @returns The position for the new task
 */
export function computeAppendPosition(maxPosition: number | null): number {
  return (maxPosition ?? 0) + POSITION_GAP;
}
