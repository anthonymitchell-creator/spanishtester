import { describe, expect, it } from 'vitest';
import { buildSession, check, choicesFor, displayAnswer, personsFor, spanishForm, type VerbCard } from '../src/modes/verbs/cards';
import { DEFAULT_SETTINGS, type Direction, type Settings } from '../src/store';
import { TENSES } from '../src/engine/tenses';
import type { Person, VerbEntry } from '../src/engine/types';
import verbsJson from '../src/data/verbs.json';

const verbs = verbsJson as VerbEntry[];
const ALL: Settings = { ...DEFAULT_SETTINGS, tenses: TENSES.map((t) => t.id), directions: ['en-es', 'es-en', 'inf', 'recog'] };

function cardsFor(v: VerbEntry): VerbCard[] {
  const out: VerbCard[] = [];
  for (const dir of ['en-es', 'es-en'] as Direction[]) {
    for (const t of TENSES) {
      for (const p of personsFor(v, t.id, ALL)) {
        out.push({ key: '', srsId: '', verb: v, tense: t.id, person: p as Person, dir, isNew: false });
      }
    }
  }
  out.push({ key: '', srsId: '', verb: v, tense: 'pres', person: 0, dir: 'inf', sub: 'es-en', isNew: false });
  out.push({ key: '', srsId: '', verb: v, tense: 'pres', person: 0, dir: 'inf', sub: 'en-es', isNew: false });
  return out;
}

describe('cards', () => {
  it('accepts the displayed answer for every verb, tense, person and direction', () => {
    const bad: string[] = [];
    for (const v of verbs) {
      for (const c of cardsFor(v)) {
        const shown = c.dir === 'inf' && c.sub === 'es-en' ? c.verb.en[0] : displayAnswer(c).replace(/ \(or .*\)$/, '');
        const r = check(c, shown, verbs, 'strict');
        if (!r.pass) bad.push(`${v.inf} ${c.tense}[${c.person}] ${c.dir}: "${shown}"`);
      }
    }
    expect(bad.slice(0, 20)).toEqual([]);
  });

  it('multiple choice always has exactly one correct option and no duplicates', () => {
    const bad: string[] = [];
    for (const v of verbs.slice(0, 80)) {
      for (const c of [...cardsFor(v), ...cardsFor(v).filter((x) => x.dir === 'es-en').map((x) => ({ ...x, dir: 'recog' as Direction }))]) {
        const ch = choicesFor(c, verbs, ALL);
        const correct = ch.filter((x) => x.correct).length;
        const labels = new Set(ch.map((x) => x.label.toLowerCase()));
        if (correct !== 1 || labels.size !== ch.length || ch.length < 2) bad.push(`${v.inf} ${c.tense}[${c.person}] ${c.dir}: ${ch.map((x) => x.label).join(' | ')}`);
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it('builds a session respecting the new-card cap', () => {
    const s = buildSession(verbs, { ...DEFAULT_SETTINGS, sessionLength: 30, newPerDay: 12 }, {}, 0);
    expect(s.length).toBe(12);
    expect(new Set(s.map((c) => c.verb.inf)).size).toBeGreaterThan(2);
    const none = buildSession(verbs, DEFAULT_SETTINGS, {}, DEFAULT_SETTINGS.newPerDay);
    expect(none.length).toBe(0);
  });

  it('shows spanish forms for imperative and reflexive verbs', () => {
    const v = verbs.find((x) => x.inf === 'levantarse')!;
    expect(spanishForm({ key: '', srsId: '', verb: v, tense: 'imp', person: 1, dir: 'en-es', isNew: false })).toBe('levántate');
  });
});
