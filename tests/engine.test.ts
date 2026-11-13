import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { conjugate } from '../src/engine/conjugate';
import { explain, levelOf } from '../src/engine/classify';
import { englishAnswers, englishPrompt } from '../src/engine/english';
import { checkEnglish, checkSpanish } from '../src/engine/match';
import { attachEnclitic } from '../src/engine/text';
import type { Person, Table, VerbEntry } from '../src/engine/types';
import verbsJson from '../src/data/verbs.json';
import categories from '../src/data/categories.json';

const verbs = verbsJson as VerbEntry[];
const refPath = path.join(__dirname, 'fixtures', 'jehle.json');
const ref: Record<string, Partial<Table>> = JSON.parse(fs.readFileSync(refPath, 'utf8'));

/**
 * Known differences where the engine is deliberately right and the reference is wrong or old-style:
 * - ir/irse: affirmative nosotros "vamos/vámonos" (we also accept vayamos as an alternative)
 * - soñar, maquillarse: typos in the reference
 * - huir, freír: reference uses pre-2010 accents (huí, frió); RAE 2010 = hui, frio
 */
const EXCEPTIONS: Record<string, string[]> = {
  ir: ['imp[3]'],
  irse: ['imp[3]'],
  soñar: ['imp[3]', 'impneg[3]'],
  maquillarse: ['imp[1]', 'imp[2]'],
  huir: ['pret[0]'],
  freír: ['pret[2]'],
};

const KEYS = ['pres', 'pret', 'impf', 'fut', 'cond', 'perf', 'plup', 'subj', 'impsubj', 'imp', 'impneg', 'ger', 'part'] as const;

function mismatches(v: VerbEntry): string[] {
  const r = ref[v.inf];
  if (!r) return [];
  const t = conjugate(v);
  const out: string[] = [];
  for (const k of KEYS) {
    const want = r[k];
    const got = t[k];
    if (want == null) continue;
    if (Array.isArray(want)) {
      want.forEach((w, i) => {
        const g = (got as (string | null)[])[i];
        const id = `${k}[${i}]`;
        if (w == null || w === 'no' || g == null) return; // reference "no" = form doesn't exist
        if (w !== g && !EXCEPTIONS[v.inf]?.includes(id)) out.push(`${id}: want ${w}, got ${g}`);
      });
    } else if (want !== got && !EXCEPTIONS[v.inf]?.includes(k)) out.push(`${k}: want ${want}, got ${got}`);
  }
  return out;
}

describe('verb catalogue', () => {
  it('has unique infinitives and valid categories', () => {
    const ids = new Set(categories.map((c) => c.id));
    const seen = new Set<string>();
    for (const v of verbs) {
      expect(seen.has(v.inf), `duplicate ${v.inf}`).toBe(false);
      seen.add(v.inf);
      expect(v.en.length, v.inf).toBeGreaterThan(0);
      v.en.forEach((g) => expect(g.startsWith('to '), `${v.inf}: gloss "${g}" must start with "to "`).toBe(true));
      v.cat.forEach((c) => expect(ids.has(c), `${v.inf}: unknown category ${c}`).toBe(true));
    }
  });

  it('conjugates every catalogue verb in the reference exactly (LatAm, no vosotros)', () => {
    const failures: string[] = [];
    let checked = 0;
    for (const v of verbs) {
      if (!ref[v.inf]) continue;
      checked++;
      const m = mismatches(v);
      if (m.length) failures.push(`${v.inf}: ${m.slice(0, 3).join('; ')}`);
    }
    expect(failures).toEqual([]);
    expect(checked).toBeGreaterThan(150);
  });

  it('never produces vosotros forms or empty forms', () => {
    for (const v of verbs) {
      const t = conjugate(v);
      for (const k of KEYS) {
        if (k === 'ger' || k === 'part') { expect(t[k]).toBeTruthy(); continue; }
        expect(t[k]).toHaveLength(5);
      }
    }
  });
});

const V = (inf: string) => verbs.find((v) => v.inf === inf)!;

describe('classifier', () => {
  const cases: [string, 'pres' | 'pret' | 'subj' | 'fut' | 'perf', Person, string][] = [
    ['hablar', 'pres', 0, 'regular'],
    ['buscar', 'pret', 0, 'spelling'],
    ['llegar', 'pret', 0, 'spelling'],
    ['leer', 'pret', 2, 'spelling'],
    ['dormir', 'pres', 0, 'stem'],
    ['dormir', 'pres', 3, 'regular'],
    ['pedir', 'pret', 2, 'stem'],
    ['conocer', 'pres', 0, 'stem'],
    ['construir', 'pres', 0, 'stem'],
    ['tener', 'pret', 0, 'irregular'],
    ['tener', 'pres', 1, 'stem'],
    ['tener', 'fut', 0, 'irregular'],
    ['hacer', 'perf', 0, 'irregular'],
    ['ir', 'pres', 0, 'irregular'],
    ['saber', 'pres', 0, 'irregular'],
  ];
  for (const [inf, t, p, level] of cases) {
    it(`${inf} ${t}[${p}] is ${level}`, () => expect(levelOf(V(inf), t, p)).toBe(level));
  }

  it('explains with the would-be regular form', () => {
    const e = explain(V('tener'), 'pres', 0);
    expect(e.regular).toBe('teno');
    expect(e.notes.join(' ')).toMatch(/yo/);
  });
});

describe('orthography', () => {
  it('keeps stress when attaching pronouns', () => {
    expect(attachEnclitic('levanta', 'te')).toBe('levántate');
    expect(attachEnclitic('vamo', 'nos')).toBe('vámonos');
    expect(attachEnclitic('pon', 'te')).toBe('ponte');
    expect(attachEnclitic('dé', 'me')).toBe('deme');
    expect(attachEnclitic('ríe', 'te')).toBe('ríete');
  });
  it('handles prefixed irregulars', () => {
    expect(conjugate(V('mantener')).imp[1]).toBe('mantén');
    expect(conjugate(V('sonreír')).pret[2]).toBe('sonrió');
    expect(conjugate(V('devolver')).part).toBe('devuelto');
  });
});

describe('english', () => {
  it('builds prompts', () => {
    expect(englishPrompt('to eat', 'fut', 3)).toBe('we will eat');
    expect(englishPrompt('to get up', 'pres', 2)).toBe('he/she gets up');
    expect(englishPrompt("to comb one's hair", 'pret', 0)).toBe('I combed my hair');
    expect(englishPrompt('to be (permanent)', 'pret', 4)).toBe('they were');
    expect(englishPrompt('to speak', 'impneg', 1)).toBe("Don't speak! (tú)");
    expect(englishPrompt('to stop', 'pret', 0)).toBe('I stopped');
  });
  it('accepts reasonable English answers', () => {
    const acc = englishAnswers(['to speak', 'to talk'], 'impf', 4);
    expect(checkEnglish('They were speaking', acc).pass).toBe(true);
    expect(checkEnglish('you all used to talk', acc).pass).toBe(true);
    expect(checkEnglish("y'all were talking", acc).pass).toBe(true);
    expect(checkEnglish('I was speaking', acc).pass).toBe(false);
    const fut = englishAnswers(['to eat'], 'fut', 0);
    expect(checkEnglish("I'll eat", fut).pass).toBe(true);
    const perf = englishAnswers(['to eat'], 'perf', 2);
    expect(checkEnglish("she's eaten", perf).pass).toBe(true);
  });
});

describe('spanish answer matching', () => {
  it('flags missing accents', () => {
    expect(checkSpanish('hablo', ['habló'], 'lenient')).toMatchObject({ verdict: 'accent', pass: true });
    expect(checkSpanish('hablo', ['habló'], 'strict')).toMatchObject({ verdict: 'accent', pass: false });
    expect(checkSpanish('Habló', ['habló'], 'strict')).toMatchObject({ verdict: 'correct' });
    expect(checkSpanish('  me  levanto ', ['me levanto'], 'strict').verdict).toBe('correct');
    expect(checkSpanish('levanto', ['me levanto'], 'lenient').verdict).toBe('wrong');
  });
});
