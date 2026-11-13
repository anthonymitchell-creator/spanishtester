import { conjugate, formOf, FULL, NAIVE, ORTHO_ONLY, splitReflexive, TAGS_ONLY, type VerbSpec } from './conjugate';
import { IRREGULARS } from './irregulars';
import { stripAccents } from './text';
import type { Level, PatternTag, Person, Table, TenseId } from './types';
import { LEVEL_RANK } from './types';

export interface Analysis {
  table: Table;
  naive: Table;
  ortho: Table;
  tags: Table;
}

const cache = new Map<string, Analysis>();

function key(v: VerbSpec) {
  return `${v.inf}|${v.base ?? ''}|${(v.tags ?? []).join(',')}|${v.over ? JSON.stringify(v.over) : ''}`;
}

export function analyze(v: VerbSpec): Analysis {
  const k = key(v);
  let a = cache.get(k);
  if (!a) {
    a = { table: conjugate(v, FULL), naive: conjugate(v, NAIVE), ortho: conjugate(v, ORTHO_ONLY), tags: conjugate(v, TAGS_ONLY) };
    cache.set(k, a);
  }
  return a;
}

function hasStrongPreterite(v: VerbSpec): boolean {
  const { core } = splitReflexive(v.inf);
  const def = { ...(v.base ? IRREGULARS[v.base] : {}), ...(IRREGULARS[core] ?? {}), ...(v.over ?? {}) };
  return !!(def.pretStrong || def.pret || stripAccents(core).endsWith('ducir'));
}

export function levelOf(v: VerbSpec, tense: TenseId, person: Person): Level {
  const a = analyze(v);
  const full = formOf(a.table, tense, person);
  if (full == null) return 'regular';
  if (full === formOf(a.naive, tense, person)) return 'regular';
  // Strong preterites are irregular even where they coincide with a stem-change form (previnieron).
  if ((tense === 'pret' || tense === 'impsubj') && hasStrongPreterite(v)) return 'irregular';
  if (full === formOf(a.ortho, tense, person)) return 'spelling';
  if (full === formOf(a.tags, tense, person)) return 'stem';
  return 'irregular';
}

/** Highest irregularity level anywhere in the verb (for filters and badges in lists). */
export function verbLevel(v: VerbSpec): Level {
  const a = analyze(v);
  let best: Level = 'regular';
  for (const t of ['pres', 'pret', 'impf', 'fut', 'cond', 'subj', 'imp'] as const) {
    for (let p = 0; p < 5; p++) {
      const l = levelOf(v, t, p as Person);
      if (LEVEL_RANK[l] > LEVEL_RANK[best]) best = l;
    }
  }
  if (a.table.part !== a.naive.part && a.table.part !== a.tags.part) best = 'irregular';
  return best;
}

function allTags(v: VerbSpec): PatternTag[] {
  const { core } = splitReflexive(v.inf);
  return [...(v.tags ?? []), ...(IRREGULARS[core]?.tags ?? []), ...(v.base ? IRREGULARS[v.base]?.tags ?? [] : [])];
}

const TAG_NOTES: Record<PatternTag, string> = {
  'e-ie': 'Stem change e → ie when the stem is stressed (all but nosotros).',
  'o-ue': 'Stem change o → ue when the stem is stressed (all but nosotros).',
  'u-ue': 'Stem change u → ue when the stem is stressed (jugar is the only one).',
  'e-i': 'Stem change e → i when the stem is stressed (all but nosotros).',
  'i-ie': 'Stem change i → ie when the stem is stressed.',
  accent: 'The stressed i/u takes a written accent (envío, continúo, reúno).',
  zc: 'c → zc before a/o: the yo form and the whole present subjunctive (conozco, conozca).',
};

function spellingNote(inf: string): string | null {
  const p = stripAccents(splitReflexive(inf).core);
  if (p.endsWith('guar')) return 'Spelling: gu → gü before e, to keep the u pronounced (averigüé).';
  if (p.endsWith('car')) return 'Spelling: c → qu before e, to keep the hard /k/ sound (busqué).';
  if (p.endsWith('gar')) return 'Spelling: g → gu before e, to keep the hard /g/ sound (llegué).';
  if (p.endsWith('zar')) return 'Spelling: z → c before e (empecé). Same sound in LatAm.';
  if (p.endsWith('guir')) return 'Spelling: gu → g before a/o (sigo, siga).';
  if (/g[ei]r$/.test(p)) return 'Spelling: g → j before a/o, to keep the soft sound (escojo, elija).';
  if (/[^aeiou]c[ei]r$/.test(p)) return 'Spelling: c → z before a/o, to keep the /s/ sound (venzo).';
  if (/[aeo][ei]r$/.test(p)) return 'Spelling: an unstressed i between vowels becomes y (leyó, leyendo); stressed i takes an accent (leí, leído).';
  if (/[ñ]|ll/.test(p.slice(-4))) return 'Spelling: the i of -ió/-iendo is absorbed after ñ/ll (gruñó).';
  return null;
}

export interface Explanation {
  level: Level;
  /** What a fully regular -ar/-er/-ir pattern would have produced. */
  regular: string | null;
  notes: string[];
}

export function explain(v: VerbSpec, tense: TenseId, person: Person): Explanation {
  const a = analyze(v);
  const level = levelOf(v, tense, person);
  const regular = formOf(a.naive, tense, person);
  const notes: string[] = [];
  if (level === 'regular') return { level, regular, notes };

  const { core } = splitReflexive(v.inf);
  const p = stripAccents(core);
  const tags = allTags(v);
  const isIr = p.endsWith('ir');
  const weakPos =
    (tense === 'pret' && (person === 2 || person === 4)) || tense === 'ger' || tense === 'impsubj' ||
    ((tense === 'subj' || tense === 'imp' || tense === 'impneg') && person === 3);

  if (level === 'spelling') {
    const n = spellingNote(v.inf);
    if (n) notes.push(n);
  }
  if (level === 'stem') {
    if (isIr && weakPos && (tags.includes('e-ie') || tags.includes('e-i') || tags.includes('o-ue'))) {
      notes.push('-ir stem-changer: e → i / o → u in the 3rd-person preterite, the gerund, nosotros subjunctive and the whole imperfect subjunctive.');
    } else {
      for (const t of tags) notes.push(TAG_NOTES[t]);
    }
    if (/[^gq]uir$/.test(p)) notes.push('-uir verbs add y before a, e, o (construyo, construyó).');
    if (p.endsWith('ducir') && !notes.some((n) => n.includes('zc'))) notes.push(TAG_NOTES.zc);
    const n = spellingNote(v.inf);
    if (n && formOf(a.ortho, tense, person) !== regular) notes.push(n);
  }
  if (level === 'irregular') {
    const def = { ...(v.base ? IRREGULARS[v.base] : {}), ...(IRREGULARS[core] ?? {}), ...(v.over ?? {}) };
    if ((tense === 'pret' || tense === 'impsubj') && (def.pretStrong || p.endsWith('ducir'))) {
      const stem = def.pretStrong ?? p.slice(0, -3) + 'j';
      notes.push(`Irregular preterite stem ${stem}- with unstressed endings (-e, -iste, -o, -imos, -ieron).`);
      if (tense === 'impsubj') notes.push('The imperfect subjunctive is built from the 3rd-person plural preterite.');
    } else if ((tense === 'fut' || tense === 'cond') && def.futStem) {
      notes.push(`Irregular future/conditional stem ${def.futStem}- (regular endings).`);
    } else if ((tense === 'perf' || tense === 'plup' || tense === 'part') && def.part) {
      notes.push(`Irregular past participle: ${a.table.part}.`);
    } else if (tense === 'pres' && person === 0 && def.presYo) {
      notes.push(`Irregular yo form. The present subjunctive is built from it (${a.table.subj[0]}).`);
    } else if ((tense === 'subj' || tense === 'impneg' || (tense === 'imp' && person > 1)) && (def.presYo || def.subjStem)) {
      notes.push(`Subjunctive built from the irregular yo form ${a.table.pres[0]}.`);
    } else if (tense === 'imp' && person === 1 && def.impTu) {
      notes.push(`Irregular tú command: ${def.impTu}. One of: di, haz, ve, pon, sal, sé, ten, ven.`);
    } else if (regular && formOf(a.table, tense, person) && stripAccents(formOf(a.table, tense, person)!) === stripAccents(regular)) {
      notes.push('Same letters as the regular pattern, but the stress falls on the ending, so it takes a written accent.');
    } else {
      notes.push('Irregular form; learn it on its own.');
    }
    if (tags.length && (tense === 'pres' || tense === 'subj') && person !== 0) for (const t of tags) notes.push(TAG_NOTES[t]);
  }
  return { level, regular, notes };
}

/** Alternative accepted forms (both are correct in LatAm usage). */
export function alternatives(inf: string, tense: TenseId, person: Person): string[] {
  if (tense === 'imp' && person === 3) {
    if (inf === 'ir') return ['vayamos'];
    if (inf === 'irse') return ['vayámonos'];
  }
  return [];
}
