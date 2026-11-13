import verbsJson from './verbs.json';
import categoriesJson from './categories.json';
import type { VerbEntry } from '../engine/types';

export interface Category {
  id: string;
  es: string;
  en: string;
  icon: string;
}

export const BUNDLED_VERBS = verbsJson as VerbEntry[];
export const CATEGORIES = categoriesJson as Category[];
export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<string, Category>;

/** Bundled verbs win over on-device ones with the same infinitive. */
export function mergeCatalogue(custom: VerbEntry[]): VerbEntry[] {
  const have = new Set(BUNDLED_VERBS.map((v) => v.inf));
  return [...BUNDLED_VERBS, ...custom.filter((c) => !have.has(c.inf))];
}

export function isBundled(inf: string): boolean {
  return BUNDLED_VERBS.some((v) => v.inf === inf);
}

export function isReflexive(inf: string): boolean {
  return /[aeií]rse$/.test(inf);
}

/** Verbs added in the last `days` days or still unverified. */
export function isRecent(v: VerbEntry, days = 30, now = Date.now()): boolean {
  if (v.unverified) return true;
  if (!v.added) return false;
  return now - new Date(v.added).getTime() < days * 86_400_000;
}
