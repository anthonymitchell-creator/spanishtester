// Splits conjugated forms into pronoun + stem + ending, for teaching ("habl|amos", "tien|es").
import { analyze, levelOf } from './classify';
import {
  COND, formOf, FUT, IMPF_AR, IMPF_ERIR, PRES, PRET_AR, PRET_ERIR, REFLEXIVE_PRONOUNS, SIMPLE_PERSONAL, splitReflexive,
  SUBJ_AR, SUBJ_ERIR, type VerbSpec,
} from './conjugate';
import { stripAccents } from './text';
import type { Level, Person, TenseId } from './types';

export type Conj = 'ar' | 'er' | 'ir';

export function conjOf(inf: string): Conj {
  return stripAccents(splitReflexive(inf).core).slice(-2) as Conj;
}

/** The regular stem (hablar → habl). */
export function regularStem(inf: string): string {
  return splitReflexive(inf).core.slice(0, -2);
}

const STRONG_PRET = ['e', 'iste', 'o', 'imos', 'ieron'];
const STRONG_PRET_J = ['e', 'iste', 'o', 'imos', 'eron'];
const IMPSUBJ = ['ra', 'ras', 'ra', 'ramos', 'ran'];

/** Candidate ending sets for a tense, most regular first. */
export function endingSets(conj: Conj, tense: TenseId): string[][] {
  switch (tense) {
    case 'pres': return [PRES[conj]];
    case 'pret': return [conj === 'ar' ? PRET_AR : PRET_ERIR, STRONG_PRET, STRONG_PRET_J];
    case 'impf': return [conj === 'ar' ? IMPF_AR : IMPF_ERIR];
    case 'fut': return [FUT];
    case 'cond': return [COND];
    case 'subj': return [conj === 'ar' ? SUBJ_AR : SUBJ_ERIR];
    case 'impsubj': return [IMPSUBJ];
    default: return [];
  }
}

/** Can forms of this tense be taught as stem + ending? */
export function segmentable(tense: TenseId): boolean {
  return endingSets('ar', tense).length > 0;
}

export interface Segment {
  form: string;
  /** Reflexive pronoun incl. trailing space ("me "), or "". */
  pre: string;
  stem: string;
  /** "" when the form can't be split (e.g. soy, fui). */
  end: string;
  /** The ending set the form matched (for "pick the ending" choices). */
  endings: string[];
  level: Level;
}

export function segment(v: VerbSpec, tense: TenseId, person: Person): Segment | null {
  const t = analyze(v).table;
  const form = formOf(t, tense, person);
  if (!form) return null;
  const level = levelOf(v, tense, person);
  const { refl } = splitReflexive(v.inf);
  let pre = '';
  let body = form;
  if (refl && SIMPLE_PERSONAL.includes(tense as never)) {
    pre = `${REFLEXIVE_PRONOUNS[person]} `;
    body = form.slice(pre.length);
  }
  for (const set of endingSets(conjOf(v.inf), tense)) {
    const e = set[person];
    if (body.endsWith(e) && body.length > e.length) {
      return { form, pre, stem: body.slice(0, -e.length), end: e, endings: [...new Set(set)], level };
    }
  }
  return { form, pre, stem: body, end: '', endings: [], level };
}
