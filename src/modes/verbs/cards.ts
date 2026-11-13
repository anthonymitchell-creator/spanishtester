import { analyze, alternatives, levelOf, verbLevel } from '../../engine/classify';
import { formOf } from '../../engine/conjugate';
import { englishAnswers, englishPrompt } from '../../engine/english';
import { checkEnglish, checkSpanish, glossAnswers, type CheckResult, type Strictness } from '../../engine/match';
import { PERSON_ES_SHORT, TENSE_BY_ID } from '../../engine/tenses';
import type { Level, Person, TenseId, VerbEntry } from '../../engine/types';
import { isReflexive, isRecent } from '../../data/catalogue';
import { isDueToday, type SrsState } from '../../srs/scheduler';
import type { Direction, Settings } from '../../store';

export interface VerbCard {
  key: string; // unique within a session
  srsId: string;
  verb: VerbEntry;
  tense: TenseId;
  person: Person;
  dir: Direction;
  /** For infinitive cards: which way round. */
  sub?: 'es-en' | 'en-es';
  isNew: boolean;
}

const NON_PERSONAL: TenseId[] = ['ger', 'part'];

export function srsIdOf(inf: string, tense: TenseId | 'inf', dir: string) {
  return `v:${inf}|${tense}|${dir}`;
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Verbs matching the session filters. */
export function filterVerbs(verbs: VerbEntry[], s: Settings): VerbEntry[] {
  return verbs.filter((v) => {
    if (s.categories.length && !v.cat.some((c) => s.categories.includes(c))) return false;
    if (!s.includeReflexive && isReflexive(v.inf) && s.verbFilter !== 'reflexive') return false;
    switch (s.verbFilter) {
      case 'irregular': return verbLevel(v) === 'irregular' || verbLevel(v) === 'stem';
      case 'regular': return verbLevel(v) === 'regular' || verbLevel(v) === 'spelling';
      case 'recent': return isRecent(v);
      case 'reflexive': return isReflexive(v.inf);
      default: return true;
    }
  });
}

/** Persons available for this verb/tense under the settings. */
export function personsFor(v: VerbEntry, tense: TenseId, s: Settings): Person[] {
  if (NON_PERSONAL.includes(tense)) return [0];
  const t = analyze(v).table;
  return s.persons.filter((p) => (!v.persons || v.persons.includes(p)) && formOf(t, tense, p) != null);
}

interface Slot { srsId: string; verb: VerbEntry; tense: TenseId; dir: Direction; sub?: 'es-en' | 'en-es'; order: number }

/** Every schedulable slot (verb × tense × direction) for the current settings. */
export function allSlots(verbs: VerbEntry[], s: Settings): Slot[] {
  const pool = filterVerbs(verbs, s);
  // Newest additions first, then catalogue (frequency) order.
  const ordered = pool
    .map((v, i) => ({ v, i }))
    .sort((a, b) => (b.v.added ?? '').localeCompare(a.v.added ?? '') || a.i - b.i);
  const slots: Slot[] = [];
  ordered.forEach(({ v }, vi) => {
    for (const dir of s.directions) {
      if (dir === 'inf') {
        slots.push({ srsId: srsIdOf(v.inf, 'inf', 'es-en'), verb: v, tense: 'pres', dir, sub: 'es-en', order: vi });
        slots.push({ srsId: srsIdOf(v.inf, 'inf', 'en-es'), verb: v, tense: 'pres', dir, sub: 'en-es', order: vi });
        continue;
      }
      for (const tense of s.tenses) {
        if (personsFor(v, tense, s).length === 0) continue;
        slots.push({ srsId: srsIdOf(v.inf, tense, dir), verb: v, tense, dir, order: vi });
      }
    }
  });
  return slots;
}

export interface QueueInfo { due: number; fresh: number; total: number }

export function queueInfo(
  verbs: VerbEntry[], s: Settings, srs: Record<string, SrsState>,
  met: Set<string> = new Set(verbs.map((v) => v.inf)), newVerbsLeft = Infinity,
): QueueInfo {
  const slots = allSlots(verbs, s);
  let due = 0, fresh = 0;
  const newVerbs = new Set<string>();
  for (const x of slots) {
    const st = srs[x.srsId];
    if (!st) {
      if (met.has(x.verb.inf)) fresh++;
      else if (newVerbs.size < newVerbsLeft || newVerbs.has(x.verb.inf)) { newVerbs.add(x.verb.inf); fresh++; }
    } else if (isDueToday(st)) due++;
  }
  return { due, fresh, total: slots.length };
}

function toCard(x: Slot, s: Settings, isNew: boolean, i: number): VerbCard {
  const ps = x.dir === 'inf' ? [0 as Person] : personsFor(x.verb, x.tense, s);
  const person = ps[Math.floor(Math.random() * ps.length)] ?? 0;
  return { key: `${x.srsId}#${i}`, srsId: x.srsId, verb: x.verb, tense: x.tense, person, dir: x.dir, sub: x.sub, isNew };
}

/**
 * Build a session: due cards first (most overdue first), then new cards up to the daily cap.
 * mode "extra" ignores scheduling and picks random cards (free practice).
 */
export function buildSession(
  verbs: VerbEntry[], s: Settings, srs: Record<string, SrsState>, newToday: number, mode: 'normal' | 'extra' = 'normal',
  /** Verbs the learner has already met (introduced or practised). */
  met: Set<string> = new Set(verbs.map((v) => v.inf)),
  /** How many not-yet-met verbs may be introduced in this session. */
  newVerbsLeft = Infinity,
): VerbCard[] {
  const slots = allSlots(verbs, s);
  const n = s.sessionLength;
  if (mode === 'extra') {
    // Free practice sticks to verbs you've met once there are enough of them.
    const pool = slots.filter((x) => met.has(x.verb.inf));
    return shuffle(pool.length >= n ? pool : slots).slice(0, n).map((x, i) => toCard(x, s, !srs[x.srsId], i));
  }
  const due = slots.filter((x) => isDueToday(srs[x.srsId])).sort((a, b) => srs[a.srsId].due - srs[b.srsId].due);
  const picked: VerbCard[] = due.slice(0, n).map((x, i) => toCard(x, s, false, i));
  const room = Math.min(n - picked.length, Math.max(0, s.newPerDay - newToday));
  if (room > 0) {
    // Take new cards in priority order, but spread across verbs (one slot per verb per pass).
    const fresh = slots.filter((x) => !srs[x.srsId]);
    const byVerb = new Map<string, Slot[]>();
    for (const x of fresh) byVerb.set(x.verb.inf, [...(byVerb.get(x.verb.inf) ?? []), x]);
    // Mix card types and tenses within each verb, keeping present tense slightly ahead.
    for (const [k, q] of byVerb) byVerb.set(k, shuffle(q).sort((a, b) => Number(b.tense === 'pres') - Number(a.tense === 'pres') || 0));
    const chosen: Slot[] = [];
    const all = [...byVerb.keys()];
    // New verbs (capped per day) first so they actually get introduced, then more slots of verbs already met.
    const unmet = all.filter((v) => !met.has(v)).slice(0, Math.max(0, Math.min(newVerbsLeft, 1000)));
    const known = all.filter((v) => met.has(v)).slice(0, Math.max(3, Math.ceil(room / 2)));
    const verbsInOrder = [...unmet, ...known];
    while (chosen.length < room && verbsInOrder.some((v) => byVerb.get(v)!.length)) {
      for (const v of verbsInOrder) {
        const q = byVerb.get(v)!;
        if (q.length && chosen.length < room) chosen.push(q.shift()!);
      }
    }
    picked.push(...chosen.map((x, i) => toCard(x, s, true, 1000 + i)));
  }
  return shuffle(picked);
}

// ---------- Prompt / answer helpers ----------

export type AnswerLang = 'es' | 'en' | 'analysis';

export function answerLang(c: VerbCard): AnswerLang {
  if (c.dir === 'recog') return 'analysis';
  if (c.dir === 'inf') return c.sub === 'es-en' ? 'en' : 'es';
  return c.dir === 'es-en' ? 'en' : 'es';
}

export function spanishForm(c: VerbCard): string {
  if (c.dir === 'inf') return c.verb.inf;
  return formOf(analyze(c.verb).table, c.tense, c.person) ?? c.verb.inf;
}

export interface Prompt {
  main: string;
  mainLang: 'es' | 'en';
  sub?: string;
  tenseLabel?: string;
  tenseHint?: string;
  personChip?: string;
}

export function promptOf(c: VerbCard): Prompt {
  const t = TENSE_BY_ID[c.tense];
  if (c.dir === 'inf') {
    return c.sub === 'es-en'
      ? { main: c.verb.inf, mainLang: 'es', tenseLabel: 'Infinitivo' }
      : { main: c.verb.en[0], mainLang: 'en', tenseLabel: 'Infinitive' };
  }
  if (c.dir === 'es-en' || c.dir === 'recog') {
    return { main: spanishForm(c), mainLang: 'es', tenseLabel: c.dir === 'recog' ? undefined : t.es, tenseHint: c.dir === 'recog' ? undefined : t.en };
  }
  return {
    main: englishPrompt(c.verb.en[0], c.tense, c.person, c.verb.enx),
    mainLang: 'en',
    sub: c.verb.en[0],
    tenseLabel: t.es,
    tenseHint: t.en,
    personChip: t.personal ? PERSON_ES_SHORT[c.person] : undefined,
  };
}

/** Persons whose form in this tense equals the card's (e.g. hablaba = yo / él). */
function samePersons(c: VerbCard): Person[] {
  if (!TENSE_BY_ID[c.tense].personal) return [c.person];
  const t = analyze(c.verb).table;
  const f = formOf(t, c.tense, c.person);
  return ([0, 1, 2, 3, 4] as Person[]).filter((p) => formOf(t, c.tense, p) === f);
}

/** All accepted answers (Spanish forms or English sentences). */
export function acceptedAnswers(c: VerbCard, verbs: VerbEntry[]): string[] {
  const lang = answerLang(c);
  if (c.dir === 'inf') {
    if (lang === 'en') return glossAnswers(c.verb.en);
    const g = c.verb.en[0];
    return verbs.filter((v) => v.en.includes(g)).map((v) => v.inf);
  }
  if (lang === 'en') {
    const out = new Set<string>();
    for (const p of samePersons(c)) englishAnswers(c.verb.en, c.tense, p, c.verb.enx).forEach((a) => out.add(a));
    return [...out];
  }
  // Spanish: this verb's form + alternatives + verbs sharing the same primary gloss
  const g = c.verb.en[0];
  const out = new Set<string>([spanishForm(c), ...alternatives(c.verb.inf, c.tense, c.person)]);
  for (const v of verbs) {
    if (v.inf !== c.verb.inf && v.en.includes(g)) {
      const f = formOf(analyze(v).table, c.tense, c.person);
      if (f) out.add(f);
    }
  }
  return [...out];
}

/** The answer to display as "correct answer". */
export function displayAnswer(c: VerbCard): string {
  const lang = answerLang(c);
  if (lang === 'es') return spanishForm(c);
  if (c.dir === 'inf') return c.verb.en.join(' / ');
  const p = samePersons(c);
  return englishPrompt(c.verb.en[0], c.tense, p[0], c.verb.enx) + (p.length > 1 ? ` (or ${p.slice(1).map((x) => PERSON_ES_SHORT[x]).join(', ')})` : '');
}

export function check(c: VerbCard, answer: string, verbs: VerbEntry[], strictness: Strictness): CheckResult {
  const acc = acceptedAnswers(c, verbs);
  return answerLang(c) === 'es' ? checkSpanish(answer, acc, strictness) : checkEnglish(answer, acc);
}

export function cardLevel(c: VerbCard): Level {
  if (c.dir === 'inf') return 'regular';
  return levelOf(c.verb, c.tense, c.person);
}

/** Should the irregularity warning badge be shown before answering? */
export function showWarning(c: VerbCard, s: Settings): Level | null {
  if (!s.warnings.enabled || c.dir === 'inf' || c.dir === 'recog') return null;
  const l = cardLevel(c);
  if (l === 'regular') return null;
  return s.warnings[l] ? l : null;
}

// ---------- Multiple choice ----------

export interface Choice { label: string; correct: boolean }

function analysisLabel(v: VerbEntry, tense: TenseId, person: Person): string {
  const t = TENSE_BY_ID[tense];
  return `${v.inf} · ${t.es.toLowerCase()}${t.personal ? ` · ${PERSON_ES_SHORT[person]}` : ''}`;
}

export function choicesFor(c: VerbCard, verbs: VerbEntry[], s: Settings): Choice[] {
  const lang = answerLang(c);
  const table = analyze(c.verb).table;
  const want = 4;
  const out: Choice[] = [];
  const seen = new Set<string>();
  const add = (label: string, correct: boolean) => {
    const k = label.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ label, correct });
  };
  const others = shuffle(verbs.filter((v) => v.inf !== c.verb.inf)).slice(0, 12);
  const tensesPool = shuffle([...new Set([...s.tenses, 'pres', 'pret', 'impf', 'fut', 'subj'] as TenseId[])]);
  const persons = shuffle([0, 1, 2, 3, 4] as Person[]);

  if (c.dir === 'recog') {
    const shown = spanishForm(c);
    add(analysisLabel(c.verb, c.tense, c.person), true);
    for (const t of tensesPool) for (const p of persons) {
      if (out.length >= want) break;
      const f = formOf(table, t, p);
      if (f && f !== shown) add(analysisLabel(c.verb, t, p), false);
    }
    return shuffle(out);
  }

  if (c.dir === 'inf') {
    if (lang === 'en') {
      add(c.verb.en[0], true);
      for (const v of others) if (out.length < want && !v.en.some((g) => c.verb.en.includes(g))) add(v.en[0], false);
    } else {
      add(c.verb.inf, true);
      for (const v of others) if (out.length < want && !v.en.includes(c.verb.en[0])) add(v.inf, false);
    }
    return shuffle(out);
  }

  const accepted = acceptedAnswers(c, verbs);
  if (lang === 'es') {
    add(spanishForm(c), true);
    const tryAdd = (f: string | null) => { if (f && out.length < want && !accepted.includes(f)) add(f, false); };
    for (const p of persons) tryAdd(formOf(table, c.tense, p));
    for (const t of tensesPool) tryAdd(formOf(table, t, c.person));
    for (const v of others) tryAdd(formOf(analyze(v).table, c.tense, c.person));
  } else {
    add(displayAnswer(c).replace(/ \(or .*\)$/, ''), true);
    const tryAdd = (t: TenseId, p: Person) => {
      if (out.length >= want) return;
      const label = englishPrompt(c.verb.en[0], t, p, c.verb.enx);
      if (!checkEnglish(label, accepted).pass) add(label, false);
    };
    for (const p of persons) tryAdd(c.tense, p);
    for (const t of tensesPool) tryAdd(t, c.person);
  }
  return shuffle(out);
}
