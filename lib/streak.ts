// Streak logic shared by every place a classroom gets "touched" (lesson
// opened, lesson completed, etc). Kept as a pure function so the rule is
// defined once and easy to reason about / unit test.

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Given a classroom's current streak state and "now", returns the updated
 * streak state after a study interaction:
 *  - same calendar day as lastStudiedAt      -> streak unchanged (min 1)
 *  - exactly one calendar day after          -> streak + 1
 *  - more than one calendar day after (or never studied) -> streak resets to 1
 */
export function computeStreak(
  lastStudiedAt: Date | null,
  currentStreak: number,
  now: Date = new Date()
): { streakCount: number; lastStudiedAt: Date } {
  if (!lastStudiedAt) {
    return { streakCount: 1, lastStudiedAt: now };
  }

  const dayDiff = Math.round((startOfDay(now) - startOfDay(lastStudiedAt)) / 86_400_000);

  if (dayDiff <= 0) {
    return { streakCount: Math.max(currentStreak, 1), lastStudiedAt: now };
  }
  if (dayDiff === 1) {
    return { streakCount: currentStreak + 1, lastStudiedAt: now };
  }
  return { streakCount: 1, lastStudiedAt: now };
}
