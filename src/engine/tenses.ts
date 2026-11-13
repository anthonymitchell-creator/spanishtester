import type { TenseId } from './types';

export interface TenseInfo {
  id: TenseId;
  es: string;
  en: string;
  mood: 'indicativo' | 'subjuntivo' | 'imperativo' | 'no personal';
  personal: boolean;
  defaultOn: boolean;
  hint: string;
}

export const TENSES: TenseInfo[] = [
  { id: 'pres', es: 'Presente', en: 'Present', mood: 'indicativo', personal: true, defaultOn: true, hint: 'I speak' },
  { id: 'pret', es: 'Pretérito', en: 'Preterite', mood: 'indicativo', personal: true, defaultOn: true, hint: 'I spoke' },
  { id: 'impf', es: 'Imperfecto', en: 'Imperfect', mood: 'indicativo', personal: true, defaultOn: true, hint: 'I was speaking / used to speak' },
  { id: 'fut', es: 'Futuro', en: 'Future', mood: 'indicativo', personal: true, defaultOn: false, hint: 'I will speak' },
  { id: 'cond', es: 'Condicional', en: 'Conditional', mood: 'indicativo', personal: true, defaultOn: false, hint: 'I would speak' },
  { id: 'perf', es: 'Pretérito perfecto', en: 'Present perfect', mood: 'indicativo', personal: true, defaultOn: false, hint: 'I have spoken' },
  { id: 'plup', es: 'Pluscuamperfecto', en: 'Pluperfect', mood: 'indicativo', personal: true, defaultOn: false, hint: 'I had spoken' },
  { id: 'subj', es: 'Presente de subjuntivo', en: 'Present subjunctive', mood: 'subjuntivo', personal: true, defaultOn: false, hint: '(that) I speak' },
  { id: 'impsubj', es: 'Imperfecto de subjuntivo', en: 'Imperfect subjunctive', mood: 'subjuntivo', personal: true, defaultOn: false, hint: '(if) I spoke' },
  { id: 'imp', es: 'Imperativo afirmativo', en: 'Affirmative command', mood: 'imperativo', personal: true, defaultOn: false, hint: 'speak!' },
  { id: 'impneg', es: 'Imperativo negativo', en: 'Negative command', mood: 'imperativo', personal: true, defaultOn: false, hint: "don't speak!" },
  { id: 'ger', es: 'Gerundio', en: 'Gerund', mood: 'no personal', personal: false, defaultOn: false, hint: 'speaking' },
  { id: 'part', es: 'Participio', en: 'Past participle', mood: 'no personal', personal: false, defaultOn: false, hint: 'spoken' },
];

export const TENSE_BY_ID = Object.fromEntries(TENSES.map((t) => [t.id, t])) as Record<TenseId, TenseInfo>;

export const PERSON_ES = ['yo', 'tú', 'él/ella/usted', 'nosotros', 'ellos/ellas/ustedes'];
export const PERSON_ES_SHORT = ['yo', 'tú', 'él/usted', 'nosotros', 'ellos/ustedes'];
