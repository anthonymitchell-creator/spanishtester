import { IRREGULARS } from './irregulars';
import { accentLastVowel, attachEnclitic, nuclei, prefixForm, stripAccents } from './text';
import type { Forms, IrregularDef, PatternTag, PersonalTense, Table, VerbEntry } from './types';

/**
 * Which rule layers are active. The classifier compares outputs across layers:
 *  naive (none) → ortho (spelling changes) → tags (stem changes) → irregular (full).
 */
export interface Layers {
  ortho: boolean;
  tags: boolean;
  irregular: boolean;
}
export const FULL: Layers = { ortho: true, tags: true, irregular: true };
export const NAIVE: Layers = { ortho: false, tags: false, irregular: false };
export const ORTHO_ONLY: Layers = { ortho: true, tags: false, irregular: false };
export const TAGS_ONLY: Layers = { ortho: true, tags: true, irregular: false };

type Conj = 'ar' | 'er' | 'ir';
export type VerbSpec = Pick<VerbEntry, 'inf' | 'tags' | 'base' | 'over'>;

interface Simple {
  pres: Forms; pret: Forms; impf: Forms; fut: Forms; cond: Forms; subj: Forms; impsubj: Forms;
  impTu: string; impNos: string | null; ger: string; part: string; noImperative: boolean;
}

interface Ctx { conj: Conj; L: Layers; zc: boolean; guir: boolean; guar: boolean; uir: boolean }

const PRES: Record<Conj, string[]> = {
  ar: ['o', 'as', 'a', 'amos', 'an'],
  er: ['o', 'es', 'e', 'emos', 'en'],
  ir: ['o', 'es', 'e', 'imos', 'en'],
};
const PRET_AR = ['é', 'aste', 'ó', 'amos', 'aron'];
const PRET_ERIR = ['í', 'iste', 'ió', 'imos', 'ieron'];
const IMPF_AR = ['aba', 'abas', 'aba', 'ábamos', 'aban'];
const IMPF_ERIR = ['ía', 'ías', 'ía', 'íamos', 'ían'];
const FUT = ['é', 'ás', 'á', 'emos', 'án'];
const COND = ['ía', 'ías', 'ía', 'íamos', 'ían'];
const SUBJ_AR = ['e', 'es', 'e', 'emos', 'en'];
const SUBJ_ERIR = ['a', 'as', 'a', 'amos', 'an'];

export const REFLEXIVE_PRONOUNS = ['me', 'te', 'se', 'nos', 'se'];

export function splitReflexive(inf: string): { core: string; refl: boolean } {
  if (/[aeií]rse$/.test(inf)) return { core: inf.slice(0, -2), refl: true };
  return { core: inf, refl: false };
}

/** Attach an ending to a stem, applying spelling rules for the active layers. */
function join(stem: string, end: string, c: Ctx): string {
  if (!end) return stem;
  let s = stem;
  const e = end;
  const f = e[0];
  if (!c.L.ortho) return s + e;

  if (c.conj === 'ar') {
    if (f === 'e' || f === 'é') {
      if (c.guar && s.endsWith('gu')) s = s.slice(0, -2) + 'gü';
      else if (s.endsWith('c')) s = s.slice(0, -1) + 'qu';
      else if (s.endsWith('g')) s = s.slice(0, -1) + 'gu';
      else if (s.endsWith('z')) s = s.slice(0, -1) + 'c';
    }
    return s + e;
  }

  // -er / -ir
  if ('aoáó'.includes(f)) {
    if (c.guir && s.endsWith('gu')) s = s.slice(0, -1);
    else if (s.endsWith('g')) s = s.slice(0, -1) + 'j';
    else if (s.endsWith('c')) {
      const prev = s[s.length - 2] ?? '';
      if ('aeiou'.includes(prev)) {
        if (c.zc && c.L.tags) s = s.slice(0, -1) + 'zc';
      } else s = s.slice(0, -1) + 'z';
    }
  }
  const last = s[s.length - 1] ?? '';
  const iThenVowel = f === 'i' && e.length > 1 && 'aeoó'.includes(e[1]); // ió, ieron, iendo
  if (c.uir && last === 'u' && c.L.tags) {
    if ('aeoáéó'.includes(f)) return s + 'y' + e;
    if (iThenVowel) return s + 'y' + e.slice(1);
    return s + e;
  }
  if (last !== '' && 'aeo'.includes(last)) {
    if (iThenVowel) return s + 'y' + e.slice(1);
    if (f === 'i') return s + 'í' + e.slice(1);
  }
  if ((s.endsWith('ñ') || s.endsWith('ll')) && iThenVowel) return s + e.slice(1);
  return s + e;
}

function replaceLast(s: string, find: string, rep: string): string {
  const i = s.lastIndexOf(find);
  return i < 0 ? s : s.slice(0, i) + rep + s.slice(i + find.length);
}

/** Stem used in stressed ("boot") positions. */
function bootStem(stem: string, tags: PatternTag[]): string {
  let s = stem;
  for (const t of tags) {
    if (t === 'e-ie') s = replaceLast(s, 'e', 'ie');
    else if (t === 'o-ue') {
      const i = s.lastIndexOf('o');
      if (i === 0) s = 'hue' + s.slice(1); // oler → huelo
      else if (i > 0) s = s.slice(0, i) + 'ue' + s.slice(i + 1);
    } else if (t === 'u-ue') s = replaceLast(s, 'u', 'ue');
    else if (t === 'e-i') s = replaceLast(s, 'e', 'i');
    else if (t === 'i-ie') s = replaceLast(s, 'i', 'ie');
    else if (t === 'accent') {
      const i = Math.max(s.lastIndexOf('i'), s.lastIndexOf('u'));
      if (i >= 0) s = s.slice(0, i) + (s[i] === 'i' ? 'í' : 'ú') + s.slice(i + 1);
    }
  }
  return s;
}

/** -ir stem-changers: e → i, o → u in unstressed positions (pidió, durmiendo, sintamos). */
function weakStem(stem: string, tags: PatternTag[]): string {
  if (tags.includes('e-ie') || tags.includes('e-i')) return replaceLast(stem, 'e', 'i');
  if (tags.includes('o-ue')) return replaceLast(stem, 'o', 'u');
  return stem;
}

function simple(inf: string, tagsIn: PatternTag[], def: IrregularDef | undefined, L: Layers): Simple {
  const plain = stripAccents(inf);
  const conj = plain.slice(-2) as Conj;
  const stem = plain.slice(0, -2);
  const d = L.irregular ? def : undefined;
  const T = L.tags ? tagsIn : [];
  const ducir = plain.endsWith('ducir');
  const c: Ctx = {
    conj, L,
    zc: T.includes('zc') || (L.tags && ducir),
    guir: plain.endsWith('guir'),
    guar: plain.endsWith('guar'),
    uir: conj === 'ir' && /[^gq]uir$/.test(plain),
  };
  const boot = bootStem(stem, T);
  const weak = conj === 'ir' ? weakStem(stem, T) : stem;

  // Present indicative
  let pres: Forms = PRES[conj].map((e, i) => join(i === 3 ? stem : boot, e, c));
  if (d?.presYo) pres[0] = d.presYo;
  if (d?.pres) pres = pres.map((f, i) => d.pres![i] ?? f);

  // Preterite
  let pret: Forms;
  const strong = d?.pretStrong ?? (L.irregular && ducir ? stem.slice(0, -1) + 'j' : undefined);
  if (d?.pret) pret = [...d.pret];
  else if (strong) {
    const ends = ['e', 'iste', 'o', 'imos', strong.endsWith('j') ? 'eron' : 'ieron'];
    pret = ends.map((e, i) => (i === 2 && strong.endsWith('c') ? strong.slice(0, -1) + 'zo' : strong + e));
  } else {
    pret = (conj === 'ar' ? PRET_AR : PRET_ERIR).map((e, i) => join(i === 2 || i === 4 ? weak : stem, e, c));
  }

  // Monosyllables take no accent (RAE 2010): guie, guio, crio, hui.
  pret = pret.map((x) => (x && /[áéíóú]/.test(x) && nuclei(x).length === 1 ? stripAccents(x) : x));

  // Imperfect
  const impf: Forms = d?.impf ? [...d.impf] : (conj === 'ar' ? IMPF_AR : IMPF_ERIR).map((e) => stem + e);

  // Future & conditional
  const fs = d?.futStem ?? plain;
  const fut: Forms = FUT.map((e) => fs + e);
  const cond: Forms = COND.map((e) => fs + e);

  // Present subjunctive
  const SE = conj === 'ar' ? SUBJ_AR : SUBJ_ERIR;
  const yo = pres[0]!;
  let subj: Forms;
  if (d?.subj) subj = [...d.subj];
  else if (d?.subjStem) subj = SE.map((e) => d.subjStem + e);
  else if ((d?.presYo || d?.pres?.[0] || c.zc) && yo.endsWith('o')) {
    const ys = yo.slice(0, -1);
    subj = SE.map((e) => ys + e);
  } else subj = SE.map((e, i) => join(i === 3 ? weak : boot, e, c));

  // Imperfect subjunctive (-ra, the LatAm norm), from 3pl preterite
  const b = pret[4]!.slice(0, -3);
  const impsubj: Forms = ['ra', 'ras', 'ra', 'ramos', 'ran'].map((e, i) => (i === 3 ? accentLastVowel(b) : b) + e);

  return {
    pres, pret, impf, fut, cond, subj, impsubj,
    impTu: d?.impTu ?? pres[2]!,
    impNos: d?.impNos ?? null,
    ger: d?.ger ?? join(weak, conj === 'ar' ? 'ando' : 'iendo', c),
    part: d?.part ?? join(stem, conj === 'ar' ? 'ado' : 'ido', c),
    noImperative: !!def?.noImperative,
  };
}

function mapSimple(s: Simple, fn: (f: string) => string): Simple {
  const m = (fs: Forms) => fs.map((f) => (f == null ? f : fn(f)));
  return {
    pres: m(s.pres), pret: m(s.pret), impf: m(s.impf), fut: m(s.fut), cond: m(s.cond),
    subj: m(s.subj), impsubj: m(s.impsubj),
    impTu: fn(s.impTu), impNos: s.impNos == null ? null : fn(s.impNos),
    ger: fn(s.ger), part: fn(s.part), noImperative: s.noImperative,
  };
}

function uniq<T>(xs: (T | undefined)[]): T[] {
  return [...new Set(xs.filter((x): x is T => x !== undefined))];
}

let haberCache: Simple | null = null;
function haber(): Simple {
  return (haberCache ??= simple('haber', [], IRREGULARS.haber, FULL));
}

export const SIMPLE_PERSONAL: PersonalTense[] = ['pres', 'pret', 'impf', 'fut', 'cond', 'perf', 'plup', 'subj', 'impsubj'];

/** Conjugate a verb into a full table (LatAm: five persons, no vosotros). */
export function conjugate(entry: VerbSpec, L: Layers = FULL): Table {
  const { core, refl } = splitReflexive(entry.inf);
  const over = entry.over ?? {};
  let s: Simple;
  if (entry.base && L.irregular && stripAccents(core).endsWith(stripAccents(entry.base))) {
    const baseDef = IRREGULARS[entry.base] ?? {};
    const def = { ...baseDef, ...over };
    const tags = uniq<PatternTag>([...(entry.tags ?? []), ...(baseDef.tags ?? [])]);
    const prefix = core.slice(0, core.length - entry.base.length);
    s = mapSimple(simple(entry.base, tags, def, L), (f) => prefixForm(prefix, f));
    // Overrides on the compound itself (its own IRREGULARS entry or `over`) are full forms.
    const own = { ...(IRREGULARS[core] ?? {}), ...over };
    if (own.impTu) s.impTu = own.impTu;
    if (own.part) s.part = own.part;
    if (own.ger) s.ger = own.ger;
  } else {
    const ownDef = IRREGULARS[core];
    const baseDef = entry.base ? IRREGULARS[entry.base] : undefined;
    const def = ownDef || Object.keys(over).length ? { ...(ownDef ?? {}), ...over } : undefined;
    const tags = uniq<PatternTag>([...(entry.tags ?? []), ...(ownDef?.tags ?? []), ...(baseDef?.tags ?? [])]);
    s = simple(core, tags, def, L);
    if (baseDef?.noImperative) s.noImperative = true;
  }

  const h = haber();
  const t: Table = {
    pres: s.pres, pret: s.pret, impf: s.impf, fut: s.fut, cond: s.cond,
    perf: h.pres.map((x) => `${x} ${s.part}`),
    plup: h.impf.map((x) => `${x} ${s.part}`),
    subj: s.subj, impsubj: s.impsubj,
    imp: [null, s.impTu, s.subj[2], s.impNos ?? s.subj[3], s.subj[4]],
    impneg: [null, `no ${s.subj[1]}`, `no ${s.subj[2]}`, `no ${s.subj[3]}`, `no ${s.subj[4]}`],
    ger: s.ger,
    part: s.part,
  };
  if (s.noImperative) {
    t.imp = [null, null, null, null, null];
    t.impneg = [null, null, null, null, null];
  }
  if (!refl) return t;

  const P = REFLEXIVE_PRONOUNS;
  for (const k of SIMPLE_PERSONAL) t[k] = t[k].map((f, i) => (f == null ? f : `${P[i]} ${f}`));
  if (!s.noImperative) {
    const nos = s.impNos ?? s.subj[3]!;
    t.imp = [
      null,
      attachEnclitic(s.impTu, 'te'),
      attachEnclitic(s.subj[2]!, 'se'),
      attachEnclitic(nos.replace(/s$/, ''), 'nos'),
      attachEnclitic(s.subj[4]!, 'se'),
    ];
    t.impneg = [null, `no te ${s.subj[1]}`, `no se ${s.subj[2]}`, `no nos ${s.subj[3]}`, `no se ${s.subj[4]}`];
  }
  t.ger = attachEnclitic(s.ger, 'se');
  return t;
}

/** Get a single form ('ger'/'part' ignore person). */
export function formOf(t: Table, tense: PersonalTense | 'ger' | 'part', person: number): string | null {
  if (tense === 'ger') return t.ger;
  if (tense === 'part') return t.part;
  return t[tense][person] ?? null;
}
