// Practice modes. Each mode supplies its own setup + session screens; SRS, stats and
// settings storage are shared. Add future modes (nouns, sentences, listening) here.

export interface ModeInfo {
  id: string;
  es: string;
  en: string;
  icon: string;
  description: string;
  available: boolean;
}

export const MODES: ModeInfo[] = [
  { id: 'verbs', es: 'Verbos', en: 'Verbs', icon: '🔤', description: 'Conjugations, infinitives and recognition', available: true },
  { id: 'nouns', es: 'Sustantivos', en: 'Nouns', icon: '📦', description: 'Translation, gender (el/la) and plurals', available: false },
  { id: 'sentences', es: 'Frases', en: 'Sentences', icon: '📝', description: 'Translate whole sentences', available: false },
  { id: 'listening', es: 'Escuchar', en: 'Listening', icon: '🎧', description: 'Hear a form, type what you heard', available: false },
];
