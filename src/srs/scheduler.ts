// A compact SM-2 style scheduler. One state per card id.

export type Grade = 0 | 1 | 2 | 3; // again, hard, good, easy

export interface SrsState {
  /** Due time (ms since epoch). */
  due: number;
  /** Interval in days. */
  ivl: number;
  ease: number;
  reps: number;
  lapses: number;
  /** Last review (ms). */
  last: number;
  /** First seen (ms). */
  first: number;
}

const DAY = 86_400_000;
const MIN = 60_000;

export function review(prev: SrsState | undefined, grade: Grade, now = Date.now()): SrsState {
  const s: SrsState = prev
    ? { ...prev }
    : { due: now, ivl: 0, ease: 2.5, reps: 0, lapses: 0, last: now, first: now };
  s.last = now;

  if (grade === 0) {
    if (s.reps > 0) s.lapses++;
    s.reps = 0;
    s.ivl = 0;
    s.ease = Math.max(1.3, s.ease - 0.2);
    s.due = now + 10 * MIN;
    return s;
  }

  if (s.reps === 0) s.ivl = grade === 3 ? 3 : 1;
  else if (s.reps === 1) s.ivl = grade === 1 ? 2 : grade === 3 ? 5 : 3;
  else {
    const mult = grade === 1 ? 1.2 : grade === 3 ? s.ease * 1.3 : s.ease;
    s.ivl = Math.max(s.ivl + 1, Math.round(s.ivl * mult));
  }
  if (grade === 1) s.ease = Math.max(1.3, s.ease - 0.15);
  if (grade === 3) s.ease = s.ease + 0.15;
  s.reps++;
  // small fuzz so cards added together don't all come due together
  const fuzz = s.ivl >= 3 ? Math.round((Math.random() - 0.5) * 0.1 * s.ivl * DAY) : 0;
  s.due = startOfDay(now) + s.ivl * DAY + fuzz;
  return s;
}

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(4, 0, 0, 0); // day rolls over at 4am
  if (d.getTime() > t) d.setDate(d.getDate() - 1);
  return d.getTime();
}

export function dayKey(t = Date.now()): string {
  const d = new Date(startOfDay(t));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isDue(s: SrsState | undefined, now = Date.now()): boolean {
  return !!s && s.due <= now;
}

/** Due by the end of today (so a card due at 3pm shows up in a morning session). */
export function isDueToday(s: SrsState | undefined, now = Date.now()): boolean {
  return !!s && s.due <= startOfDay(now) + DAY;
}
