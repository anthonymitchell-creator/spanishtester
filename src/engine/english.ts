import type { EnglishForms, Person, TenseId } from './types';

/** Irregular English verbs: [past, past participle]. US English (gotten). */
const IRR: Record<string, [string, string]> = {
  arise: ['arose', 'arisen'], awake: ['awoke', 'awoken'], be: ['was', 'been'], bear: ['bore', 'born'],
  beat: ['beat', 'beaten'], become: ['became', 'become'], begin: ['began', 'begun'], bend: ['bent', 'bent'],
  bet: ['bet', 'bet'], bite: ['bit', 'bitten'], bleed: ['bled', 'bled'], blow: ['blew', 'blown'],
  break: ['broke', 'broken'], bring: ['brought', 'brought'], build: ['built', 'built'], burn: ['burned', 'burned'],
  buy: ['bought', 'bought'], catch: ['caught', 'caught'], choose: ['chose', 'chosen'], come: ['came', 'come'],
  cost: ['cost', 'cost'], cut: ['cut', 'cut'], deal: ['dealt', 'dealt'], dig: ['dug', 'dug'], do: ['did', 'done'],
  draw: ['drew', 'drawn'], dream: ['dreamed', 'dreamed'], drink: ['drank', 'drunk'], drive: ['drove', 'driven'],
  eat: ['ate', 'eaten'], fall: ['fell', 'fallen'], feed: ['fed', 'fed'], feel: ['felt', 'felt'],
  fight: ['fought', 'fought'], find: ['found', 'found'], fit: ['fit', 'fit'], flee: ['fled', 'fled'],
  fly: ['flew', 'flown'], forbid: ['forbade', 'forbidden'], forget: ['forgot', 'forgotten'],
  forgive: ['forgave', 'forgiven'], freeze: ['froze', 'frozen'], get: ['got', 'gotten'], give: ['gave', 'given'],
  go: ['went', 'gone'], grow: ['grew', 'grown'], hang: ['hung', 'hung'], have: ['had', 'had'],
  hear: ['heard', 'heard'], hide: ['hid', 'hidden'], hit: ['hit', 'hit'], hold: ['held', 'held'],
  hurt: ['hurt', 'hurt'], keep: ['kept', 'kept'], know: ['knew', 'known'], lay: ['laid', 'laid'],
  lead: ['led', 'led'], leave: ['left', 'left'], lend: ['lent', 'lent'], let: ['let', 'let'],
  lie: ['lied', 'lied'], light: ['lit', 'lit'], lose: ['lost', 'lost'], make: ['made', 'made'],
  mean: ['meant', 'meant'], meet: ['met', 'met'], overcome: ['overcame', 'overcome'], pay: ['paid', 'paid'],
  put: ['put', 'put'], quit: ['quit', 'quit'], read: ['read', 'read'], ride: ['rode', 'ridden'],
  ring: ['rang', 'rung'], rise: ['rose', 'risen'], run: ['ran', 'run'], say: ['said', 'said'],
  see: ['saw', 'seen'], seek: ['sought', 'sought'], sell: ['sold', 'sold'], send: ['sent', 'sent'],
  set: ['set', 'set'], sew: ['sewed', 'sewn'], shake: ['shook', 'shaken'], shine: ['shone', 'shone'],
  shoot: ['shot', 'shot'], show: ['showed', 'shown'], shut: ['shut', 'shut'], sing: ['sang', 'sung'],
  sink: ['sank', 'sunk'], sit: ['sat', 'sat'], sleep: ['slept', 'slept'], slide: ['slid', 'slid'],
  sow: ['sowed', 'sown'], speak: ['spoke', 'spoken'], spend: ['spent', 'spent'], spread: ['spread', 'spread'],
  stand: ['stood', 'stood'], steal: ['stole', 'stolen'], stick: ['stuck', 'stuck'], sting: ['stung', 'stung'],
  strike: ['struck', 'struck'], swear: ['swore', 'sworn'], sweep: ['swept', 'swept'], swim: ['swam', 'swum'],
  swing: ['swung', 'swung'], take: ['took', 'taken'], teach: ['taught', 'taught'], tear: ['tore', 'torn'],
  tell: ['told', 'told'], think: ['thought', 'thought'], throw: ['threw', 'thrown'],
  understand: ['understood', 'understood'], undertake: ['undertook', 'undertaken'], upset: ['upset', 'upset'],
  wake: ['woke', 'woken'], wear: ['wore', 'worn'], win: ['won', 'won'], wind: ['wound', 'wound'],
  withdraw: ['withdrew', 'withdrawn'], write: ['wrote', 'written'],
};

/** Verbs that rarely take the progressive in English. */
const STATIVE = new Set([
  'be', 'have', 'need', 'know', 'want', 'love', 'hate', 'like', 'seem', 'believe', 'understand', 'remember', 'prefer',
  'owe', 'belong', 'exist', 'cost', 'deserve', 'doubt', 'fear', 'hope', 'mean', 'own', 'suppose', 'recognize', 'fit',
  'contain', 'trust', 'hear', 'see', 'smell', 'appear', 'forget', 'imagine', 'assume', 'deny', 'include',
]);

/** Multi-syllable verbs that double their final consonant (US spelling). */
const DOUBLE = new Set(['admit', 'commit', 'permit', 'prefer', 'refer', 'occur', 'regret', 'control', 'omit', 'submit', 'transfer', 'equip', 'compel', 'patrol', 'forget', 'begin', 'upset']);

function doubles(v: string): boolean {
  return DOUBLE.has(v) || /^[^aeiou]*[aeiou][bdgklmnprt]$/.test(v);
}

export interface Parts { base: string; s: string; past: string; pp: string; ing: string }

export function parts(verb: string, x?: EnglishForms): Parts {
  const v = verb;
  let s: string, past: string, pp: string, ing: string;
  if (v === 'have') s = 'has';
  else if (v === 'be') s = 'is';
  else if (/(s|sh|ch|x|z|o)$/.test(v)) s = v + 'es';
  else if (/[^aeiou]y$/.test(v)) s = v.slice(0, -1) + 'ies';
  else s = v + 's';

  const irr = IRR[v];
  if (irr) [past, pp] = irr;
  else {
    if (/e$/.test(v)) past = v + 'd';
    else if (/[^aeiou]y$/.test(v)) past = v.slice(0, -1) + 'ied';
    else if (doubles(v)) past = v + v[v.length - 1] + 'ed';
    else past = v + 'ed';
    pp = past;
  }

  if (v === 'be') ing = 'being';
  else if (/ie$/.test(v)) ing = v.slice(0, -2) + 'ying';
  else if (/[^eoy]e$/.test(v)) ing = v.slice(0, -1) + 'ing';
  else if (doubles(v)) ing = v + v[v.length - 1] + 'ing';
  else ing = v + 'ing';

  return { base: v, s: x?.s ?? s, past: x?.past ?? past, pp: x?.pp ?? pp, ing: x?.ing ?? ing };
}

/** English grammatical subjects. */
export type EnSubj = 'I' | 'you' | 'he' | 'we' | 'they';

/** Spanish person → English subjects that may express it, with their grammatical form. */
export const SUBJECTS: Record<Person, [string, EnSubj][]> = {
  0: [['I', 'I']],
  1: [['you', 'you']],
  2: [['he', 'he'], ['she', 'he'], ['it', 'he'], ['you', 'you']],
  3: [['we', 'we']],
  4: [['they', 'they'], ['you all', 'you'], ['you', 'you'], ["y'all", 'you']],
};

/** How the subject is displayed on an English prompt card. */
export const PROMPT_SUBJECT: Record<Person, string> = {
  0: 'I',
  1: 'you (tú)',
  2: 'he/she',
  3: 'we',
  4: 'they',
};

const REFL: Record<EnSubj, string> = { I: 'myself', you: 'yourself', he: 'himself', we: 'ourselves', they: 'themselves' };
const POSS: Record<EnSubj, string> = { I: 'my', you: 'your', he: 'his', we: 'our', they: 'their' };

function beForm(tense: 'pres' | 'past', s: EnSubj): string {
  if (tense === 'pres') return s === 'I' ? 'am' : s === 'he' ? 'is' : 'are';
  return s === 'I' || s === 'he' ? 'was' : 'were';
}

/** Split "to get up" into its head verb and the rest. */
export function splitGloss(gloss: string): { head: string; rest: string } {
  const g = gloss.replace(/^to\s+/, '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
  const [head, ...rest] = g.split(/\s+/);
  return { head, rest: rest.join(' ') };
}

function fixRest(rest: string, s: EnSubj, person: Person): string {
  const r = person === 4 && s === 'you' ? 'yourselves' : REFL[s];
  return rest.replace(/\boneself\b/g, r).replace(/\bone's\b/g, POSS[s]);
}

/**
 * English verb phrases (no subject) for one tense and English subject.
 * Several variants may be returned (imperfect: "was speaking", "used to speak").
 */
export function englishPhrases(gloss: string, tense: TenseId, s: EnSubj, person: Person, x?: EnglishForms): string[] {
  const { head, rest } = splitGloss(gloss);
  const p = parts(head, x);
  const nonPersonal = tense === 'ger' || tense === 'part';
  const tail = rest ? ' ' + (nonPersonal ? rest : fixRest(rest, s, person)) : '';
  const isBe = head === 'be';
  const third = s === 'he';
  const out: string[] = [];
  const add = (...xs: string[]) => xs.forEach((v) => out.push(v + tail));

  switch (tense) {
    case 'pres':
      if (isBe) add(beForm('pres', s));
      else add(third ? p.s : p.base);
      add(`${isBe ? beForm('pres', s) : beForm('pres', s)} ${p.ing}`);
      break;
    case 'pret':
      add(isBe ? beForm('past', s) : p.past);
      break;
    case 'impf':
      // Stative verbs sound wrong in the progressive ("was needing"), so lead with the simple past.
      if (isBe || STATIVE.has(head)) add(isBe ? beForm('past', s) : p.past, `used to ${p.base}`, `${beForm('past', s)} ${p.ing}`);
      else add(`${beForm('past', s)} ${p.ing}`, `used to ${p.base}`, p.past);
      break;
    case 'fut':
      add(`will ${p.base}`, `${beForm('pres', s)} going to ${p.base}`);
      break;
    case 'cond':
      add(`would ${p.base}`);
      break;
    case 'perf':
      add(`${third ? 'has' : 'have'} ${p.pp}`);
      break;
    case 'plup':
      add(`had ${p.pp}`);
      break;
    case 'subj':
      add(isBe ? 'be' : p.base, isBe ? beForm('pres', s) : third ? p.s : p.base, `may ${p.base}`);
      break;
    case 'impsubj':
      add(isBe ? 'were' : p.past, `were to ${p.base}`, `might ${p.base}`, `would ${p.base}`);
      break;
    case 'imp':
      if (person === 3) add(`let's ${p.base}`, `let us ${p.base}`);
      else add(p.base);
      break;
    case 'impneg':
      if (person === 3) add(`let's not ${p.base}`, `let us not ${p.base}`);
      else add(`don't ${p.base}`, `do not ${p.base}`);
      break;
    case 'ger':
      add(p.ing);
      break;
    case 'part':
      add(p.pp);
      break;
  }
  return [...new Set(out)];
}

const IMP_HINT: Record<number, string> = { 1: '(tú)', 2: '(usted)', 3: '', 4: '(ustedes)' };

/** The single English prompt shown on an EN→ES card. */
export function englishPrompt(gloss: string, tense: TenseId, person: Person, x?: EnglishForms): string {
  if (tense === 'ger' || tense === 'part') return englishPhrases(gloss, tense, 'he', 2, x)[0];
  const isImp = tense === 'imp' || tense === 'impneg';
  const subj: EnSubj = isImp ? (person === 3 ? 'we' : 'you') : (['I', 'you', 'he', 'we', 'they'] as EnSubj[])[person];
  const phrase = englishPhrases(gloss, tense, subj, person, x)[0];
  if (isImp) {
    const p = phrase.charAt(0).toUpperCase() + phrase.slice(1);
    return `${p}! ${IMP_HINT[person]}`.trim();
  }
  const subjText = PROMPT_SUBJECT[person];
  if (tense === 'subj') return `(that) ${subjText} ${phrase}`;
  if (tense === 'impsubj') return `(if) ${subjText} ${phrase}`;
  return `${subjText} ${phrase}`;
}

/** All accepted English answers (full sentences, lowercase) for an ES→EN card. */
export function englishAnswers(glosses: string[], tense: TenseId, person: Person, x?: EnglishForms): string[] {
  const out = new Set<string>();
  glosses.forEach((g, gi) => {
    const fx = gi === 0 ? x : undefined;
    if (tense === 'ger' || tense === 'part' || tense === 'imp' || tense === 'impneg') {
      const s: EnSubj = person === 0 ? 'I' : person === 3 ? 'we' : person === 4 ? 'they' : 'you';
      for (const ph of englishPhrases(g, tense, s === 'they' ? 'you' : s, person, fx)) out.add(ph.toLowerCase());
      return;
    }
    for (const [word, s] of SUBJECTS[person]) {
      for (const ph of englishPhrases(g, tense, s, person, fx)) {
        out.add(`${word} ${ph}`.toLowerCase());
        if (tense === 'subj' || tense === 'impsubj') {
          out.add(`that ${word} ${ph}`.toLowerCase());
          out.add(`if ${word} ${ph}`.toLowerCase());
        }
      }
    }
  });
  return [...out];
}
