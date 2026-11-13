import { describe, expect, it } from 'vitest';
import { segment } from '../src/engine/segment';
import { buildSession, personsFor } from '../src/modes/verbs/cards';
import { DEFAULT_SETTINGS } from '../src/store';
import { TENSES } from '../src/engine/tenses';
import type { Person, VerbEntry } from '../src/engine/types';
import verbsJson from '../src/data/verbs.json';

const verbs = verbsJson as VerbEntry[];
const V = (inf: string) => verbs.find((v) => v.inf === inf)!;

describe('segment', () => {
  it('splits forms into stem + ending', () => {
    expect(segment(V('hablar'), 'pres', 3)).toMatchObject({ pre: '', stem: 'habl', end: 'amos', level: 'regular' });
    expect(segment(V('tener'), 'pres', 1)).toMatchObject({ stem: 'tien', end: 'es', level: 'stem' });
    expect(segment(V('tener'), 'pres', 0)).toMatchObject({ stem: 'teng', end: 'o', level: 'irregular' });
    expect(segment(V('tener'), 'pret', 2)).toMatchObject({ stem: 'tuv', end: 'o' });
    expect(segment(V('decir'), 'pret', 4)).toMatchObject({ stem: 'dij', end: 'eron' });
    expect(segment(V('tener'), 'fut', 3)).toMatchObject({ stem: 'tendr', end: 'emos' });
    expect(segment(V('levantarse'), 'pres', 0)).toMatchObject({ pre: 'me ', stem: 'levant', end: 'o' });
    expect(segment(V('buscar'), 'pret', 0)).toMatchObject({ stem: 'busqu', end: 'é', level: 'spelling' });
    expect(segment(V('ser'), 'pres', 0)).toMatchObject({ stem: 'soy', end: '' });
  });

  it('always reassembles to the real form, and the ending is among the choices', () => {
    for (const v of verbs) {
      for (const t of TENSES.filter((x) => ['pres', 'pret', 'impf', 'fut', 'cond', 'subj', 'impsubj'].includes(x.id))) {
        for (const p of personsFor(v, t.id, DEFAULT_SETTINGS)) {
          const s = segment(v, t.id, p as Person)!;
          expect(s.pre + s.stem + s.end, `${v.inf} ${t.id} ${p}`).toBe(s.form);
          if (s.end) expect(s.endings).toContain(s.end);
        }
      }
    }
  });
});

describe('new verb pacing', () => {
  it('introduces at most newVerbsLeft unmet verbs per session', () => {
    const s = { ...DEFAULT_SETTINGS, sessionLength: 40, newPerDay: 40 };
    const cards = buildSession(verbs, s, {}, 0, 'normal', new Set(), 3);
    expect(new Set(cards.map((c) => c.verb.inf)).size).toBe(3);
  });
  it('keeps practising met verbs when no new verbs are allowed', () => {
    const met = new Set(['hablar', 'comer']);
    const cards = buildSession(verbs, { ...DEFAULT_SETTINGS, newPerDay: 10 }, {}, 0, 'normal', met, 0);
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every((c) => met.has(c.verb.inf))).toBe(true);
  });
});
