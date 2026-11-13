import { fold } from './text';

export type Verdict = 'correct' | 'accent' | 'wrong';
export type Strictness = 'strict' | 'lenient' | 'ignore';

export interface CheckResult {
  verdict: Verdict;
  /** True if the answer is counted as correct for scheduling/stats. */
  pass: boolean;
  /** The expected answer closest to what was typed. */
  expected: string;
}

export function normalizeEs(s: string): string {
  return s.toLowerCase().replace(/[¡!¿?.,;:"]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Compare a typed Spanish answer with the accepted forms. Missing accents/ñ = "accent". */
export function checkSpanish(answer: string, accepted: string[], strictness: Strictness): CheckResult {
  const a = normalizeEs(answer);
  for (const e of accepted) if (a === normalizeEs(e)) return { verdict: 'correct', pass: true, expected: e };
  for (const e of accepted) {
    if (fold(a) === fold(normalizeEs(e))) {
      if (strictness === 'ignore') return { verdict: 'correct', pass: true, expected: e };
      return { verdict: 'accent', pass: strictness === 'lenient', expected: e };
    }
  }
  return { verdict: 'wrong', pass: false, expected: accepted[0] ?? '' };
}

const CONTRACTIONS: [RegExp, string][] = [
  [/\bi'm\b/g, 'i am'], [/\byou're\b/g, 'you are'], [/\bwe're\b/g, 'we are'], [/\bthey're\b/g, 'they are'],
  [/\bwon't\b/g, 'will not'], [/\bcan't\b/g, 'can not'], [/\bcannot\b/g, 'can not'], [/\bshan't\b/g, 'shall not'],
  [/\blet's\b/g, 'let us'], [/n't\b/g, ' not'], [/'ll\b/g, ' will'], [/'ve\b/g, ' have'], [/'re\b/g, ' are'],
  [/\by'all\b/g, 'you all'], [/\byall\b/g, 'you all'],
];

function baseNormEn(s: string): string {
  let x = s
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\(.*?\)/g, ' ')
    .replace(/\b(he|she|it)\s*(\/|\bor\b)\s*(he|she|it)\b/g, 'he')
    .replace(/\bthey\s*(\/|\bor\b)\s*you all\b/g, 'they');
  for (const [re, rep] of CONTRACTIONS) x = x.replace(re, rep);
  return x.replace(/[!?.,;:"]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Expand ambiguous 's / 'd contractions into every reading. */
function variantsEn(s: string): string[] {
  let outs = [baseNormEn(s)];
  const expand = (re: RegExp, reps: string[]) => {
    outs = outs.flatMap((o) => (re.test(o) ? reps.map((r) => o.replace(re, r)) : [o]));
  };
  expand(/'s\b/, [' is', ' has']);
  expand(/'d\b/, [' would', ' had']);
  // US/UK participle variants
  outs = outs.flatMap((o) => (/\bgotten\b/.test(o) ? [o, o.replace(/\bgotten\b/g, 'got')] : [o]));
  return outs.map((o) => o.replace(/\s+/g, ' ').trim());
}

/** Compare an English answer with accepted sentences (already lowercased). */
export function checkEnglish(answer: string, accepted: string[]): CheckResult {
  const given = variantsEn(answer);
  const acc = new Map<string, string>();
  for (const e of accepted) for (const v of variantsEn(e)) acc.set(v, e);
  for (const g of given) {
    const hit = acc.get(g) ?? acc.get(g.replace(/^to /, ''));
    if (hit) return { verdict: 'correct', pass: true, expected: hit };
  }
  return { verdict: 'wrong', pass: false, expected: accepted[0] ?? '' };
}

/** Accepted answers for an infinitive gloss card: "to remember" / "remember". */
export function glossAnswers(glosses: string[]): string[] {
  const out = new Set<string>();
  for (const g of glosses) {
    const clean = g.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    out.add(clean);
    out.add(clean.replace(/^to /, ''));
    // "to look at" ↔ "to watch" handled by listing glosses; also accept "to X oneself" without "oneself"
    out.add(clean.replace(/ oneself$/, '').replace(/^to /, ''));
  }
  return [...out];
}
