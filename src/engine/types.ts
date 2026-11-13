/** Person slots. LatAm Spanish: no vosotros. 2 = él/ella/usted, 4 = ellos/ellas/ustedes. */
export type Person = 0 | 1 | 2 | 3 | 4;
export const PERSONS: Person[] = [0, 1, 2, 3, 4];

export type PersonalTense =
  | 'pres' | 'pret' | 'impf' | 'fut' | 'cond' | 'perf' | 'plup'
  | 'subj' | 'impsubj' | 'imp' | 'impneg';
export type TenseId = PersonalTense | 'ger' | 'part';

/** Five person slots; null where a form doesn't exist (e.g. imperative "yo"). */
export type Forms = (string | null)[];

export type Table = Record<PersonalTense, Forms> & { ger: string; part: string };

export type Level = 'regular' | 'spelling' | 'stem' | 'irregular';
export const LEVEL_RANK: Record<Level, number> = { regular: 0, spelling: 1, stem: 2, irregular: 3 };

/** A stem-change / pattern tag stored on a verb entry. */
export type PatternTag = 'e-ie' | 'o-ue' | 'u-ue' | 'e-i' | 'i-ie' | 'accent' | 'zc';

export interface EnglishForms {
  s?: string;
  past?: string;
  pp?: string;
  ing?: string;
}

/** One verb in the catalogue (src/data/verbs.json). */
export interface VerbEntry {
  /** Infinitive, including "se" for reflexive verbs. */
  inf: string;
  /** English glosses, primary first. Each begins with "to ". */
  en: string[];
  /** Category ids (src/data/categories.json). */
  cat: string[];
  /** Frequency rank (1 = most common). */
  f?: number;
  /** Stem-change / pattern tags. Spelling changes (c→qu, g→j, -uir → y...) are automatic. */
  tags?: PatternTag[];
  /** Irregular base verb for compounds, e.g. mantener → "tener", sonreír → "reír". */
  base?: string;
  /** Per-verb overrides of generated forms. */
  over?: Partial<IrregularDef>;
  /** Override English principal parts of the FIRST word of the gloss. */
  enx?: EnglishForms;
  /** Only these persons make sense (e.g. llover → [2]). */
  persons?: Person[];
  /** Short usage note shown on cards (e.g. LatAm usage). */
  note?: string;
  /** Date added (YYYY-MM-DD), used for the "recently added" filter. */
  added?: string;
  /** Added on-device; not yet verified in a Claude Code session. */
  unverified?: boolean;
}

export interface IrregularDef {
  tags?: PatternTag[];
  /** Full present overrides (null = use generated). */
  pres?: Forms;
  /** Irregular yo present; also drives the present subjunctive stem. */
  presYo?: string;
  pret?: Forms;
  /** Strong ("pretérito grave") stem: tuv-, hic-, dij- ... */
  pretStrong?: string;
  impf?: Forms;
  futStem?: string;
  subj?: Forms;
  subjStem?: string;
  impTu?: string;
  impNos?: string;
  ger?: string;
  part?: string;
  /** Not drilled in the imperative (poder, haber). */
  noImperative?: boolean;
}
