import { create } from 'zustand';
import { load, save } from './storage/db';
import { mergeCatalogue, isBundled } from './data/catalogue';
import { TENSES } from './engine/tenses';
import type { Level, Person, TenseId, VerbEntry } from './engine/types';
import type { Strictness } from './engine/match';
import { dayKey, review, type Grade, type SrsState } from './srs/scheduler';

export type Direction = 'es-en' | 'en-es' | 'inf' | 'recog';
export type AnswerStyle = 'typed' | 'flip' | 'choice';
export type VerbFilter = 'all' | 'irregular' | 'regular' | 'recent' | 'reflexive';

export interface Settings {
  tenses: TenseId[];
  persons: Person[];
  directions: Direction[];
  answerStyle: AnswerStyle;
  categories: string[]; // empty = all
  verbFilter: VerbFilter;
  includeReflexive: boolean;
  warnings: { enabled: boolean; spelling: boolean; stem: boolean; irregular: boolean };
  strictness: Strictness;
  newPerDay: number;
  /** Max verbs introduced (with a mini-lesson) per day. */
  newVerbsPerDay: number;
  /** Show a mini-lesson the first time a verb appears. */
  introLessons: boolean;
  sessionLength: number;
  ttsAuto: boolean;
  voiceURI: string | null;
  speechRate: number;
  haptics: boolean;
  theme: 'system' | 'light' | 'dark';
  /** Interface language for menus and labels. */
  uiLang: 'en' | 'es';
}

export const DEFAULT_SETTINGS: Settings = {
  tenses: TENSES.filter((t) => t.defaultOn).map((t) => t.id),
  persons: [0, 1, 2, 3, 4],
  directions: ['en-es', 'es-en'],
  answerStyle: 'typed',
  categories: [],
  verbFilter: 'all',
  includeReflexive: true,
  warnings: { enabled: true, spelling: false, stem: true, irregular: true },
  strictness: 'lenient',
  newPerDay: 20,
  newVerbsPerDay: 5,
  introLessons: true,
  sessionLength: 20,
  ttsAuto: false,
  voiceURI: null,
  speechRate: 0.9,
  haptics: true,
  theme: 'system',
  uiLang: 'en',
};

export interface Tally { n: number; ok: number }
export interface DayStats { n: number; ok: number; newCards: number; ms: number }

export interface Stats {
  days: Record<string, DayStats>;
  byTense: Record<string, Tally>;
  byLevel: Record<string, Tally>;
  byVerb: Record<string, Tally>;
  byPerson: Record<string, Tally>;
}

const EMPTY_STATS: Stats = { days: {}, byTense: {}, byLevel: {}, byVerb: {}, byPerson: {} };

export interface VerbRequest {
  id: string;
  kind: 'verb' | 'category';
  text: string;
  at: string;
}

interface State {
  ready: boolean;
  settings: Settings;
  srs: Record<string, SrsState>;
  stats: Stats;
  requests: VerbRequest[];
  customVerbs: VerbEntry[];
  verbs: VerbEntry[];
  /** inf → day key when the verb was introduced. */
  introduced: Record<string, string>;

  init(): Promise<void>;
  updateSettings(p: Partial<Settings>): void;
  record(r: { srsId: string; grade: Grade; pass: boolean; tense: TenseId; level: Level; inf: string; person: Person; ms: number; updateSrs: boolean }): void;
  addRequest(kind: VerbRequest['kind'], text: string): void;
  removeRequest(id: string): void;
  clearRequests(): void;
  addCustomVerb(v: VerbEntry): void;
  removeCustomVerb(inf: string): void;
  markIntroduced(inf: string): void;
  replaceAll(d: { settings?: Settings; srs?: Record<string, SrsState>; stats?: Stats; requests?: VerbRequest[]; customVerbs?: VerbEntry[]; introduced?: Record<string, string> }): void;
}

const bump = (t: Record<string, Tally>, k: string, ok: boolean) => {
  const x = t[k] ?? { n: 0, ok: 0 };
  t[k] = { n: x.n + 1, ok: x.ok + (ok ? 1 : 0) };
};

export const useStore = create<State>((setState, getState) => ({
  ready: false,
  settings: DEFAULT_SETTINGS,
  srs: {},
  stats: EMPTY_STATS,
  requests: [],
  customVerbs: [],
  verbs: mergeCatalogue([]),
  introduced: {},

  async init() {
    const [settings, srs, stats, requests, customVerbs, introduced] = await Promise.all([
      load<Settings>('settings'),
      load<Record<string, SrsState>>('srs'),
      load<Stats>('stats'),
      load<VerbRequest[]>('requests'),
      load<VerbEntry[]>('customVerbs'),
      load<Record<string, string>>('introduced'),
    ]);
    // Drop on-device verbs that have since been added to the bundled catalogue.
    const custom = (customVerbs ?? []).filter((v) => !isBundled(v.inf));
    setState({
      ready: true,
      settings: { ...DEFAULT_SETTINGS, ...settings, warnings: { ...DEFAULT_SETTINGS.warnings, ...settings?.warnings } },
      srs: srs ?? {},
      stats: { ...EMPTY_STATS, ...stats },
      requests: requests ?? [],
      customVerbs: custom,
      verbs: mergeCatalogue(custom),
      introduced: introduced ?? {},
    });
    if (custom.length !== (customVerbs ?? []).length) save('customVerbs', custom);
  },

  updateSettings(p) {
    const settings = { ...getState().settings, ...p };
    setState({ settings });
    save('settings', settings);
  },

  record({ srsId, grade, pass, tense, level, inf, person, ms, updateSrs }) {
    const { srs, stats } = getState();
    const isNew = !srs[srsId];
    const nextSrs = updateSrs ? { ...srs, [srsId]: review(srs[srsId], grade) } : srs;
    const day = dayKey();
    const d = stats.days[day] ?? { n: 0, ok: 0, newCards: 0, ms: 0 };
    const next: Stats = {
      days: { ...stats.days, [day]: { n: d.n + 1, ok: d.ok + (pass ? 1 : 0), newCards: d.newCards + (isNew && updateSrs ? 1 : 0), ms: d.ms + Math.min(ms, 120_000) } },
      byTense: { ...stats.byTense },
      byLevel: { ...stats.byLevel },
      byVerb: { ...stats.byVerb },
      byPerson: { ...stats.byPerson },
    };
    bump(next.byTense, tense, pass);
    bump(next.byLevel, level, pass);
    bump(next.byVerb, inf, pass);
    bump(next.byPerson, String(person), pass);
    setState({ srs: nextSrs, stats: next });
    if (updateSrs) save('srs', nextSrs);
    save('stats', next);
  },

  addRequest(kind, text) {
    const t = text.trim();
    if (!t) return;
    const requests = [...getState().requests, { id: crypto.randomUUID(), kind, text: t, at: new Date().toISOString() }];
    setState({ requests });
    save('requests', requests);
  },
  removeRequest(id) {
    const requests = getState().requests.filter((r) => r.id !== id);
    setState({ requests });
    save('requests', requests);
  },
  clearRequests() {
    setState({ requests: [] });
    save('requests', []);
  },

  addCustomVerb(v) {
    const customVerbs = [...getState().customVerbs.filter((c) => c.inf !== v.inf), v];
    setState({ customVerbs, verbs: mergeCatalogue(customVerbs) });
    save('customVerbs', customVerbs);
  },
  markIntroduced(inf) {
    if (getState().introduced[inf]) return;
    const introduced = { ...getState().introduced, [inf]: dayKey() };
    setState({ introduced });
    save('introduced', introduced);
  },

  removeCustomVerb(inf) {
    const customVerbs = getState().customVerbs.filter((c) => c.inf !== inf);
    setState({ customVerbs, verbs: mergeCatalogue(customVerbs) });
    save('customVerbs', customVerbs);
  },

  replaceAll(d) {
    const customVerbs = d.customVerbs ?? [];
    setState({
      settings: { ...DEFAULT_SETTINGS, ...d.settings },
      srs: d.srs ?? {},
      stats: { ...EMPTY_STATS, ...d.stats },
      requests: d.requests ?? [],
      customVerbs,
      verbs: mergeCatalogue(customVerbs),
      introduced: d.introduced ?? {},
    });
  },
}));

/** Verbs already met: introduced with a lesson, or practised before lessons existed. */
export function introducedSet(introduced: Record<string, string>, srs: Record<string, SrsState>): Set<string> {
  const s = new Set(Object.keys(introduced));
  for (const k of Object.keys(srs)) if (k.startsWith('v:')) s.add(k.slice(2, k.indexOf('|')));
  return s;
}

export function verbsIntroducedToday(introduced: Record<string, string>): number {
  const d = dayKey();
  return Object.values(introduced).filter((x) => x === d).length;
}

/** Inputs every "Start" button passes to buildSession / queueInfo. */
export function sessionContext(st: { settings: Settings; introduced: Record<string, string>; srs: Record<string, SrsState>; stats: Stats }) {
  const met = introducedSet(st.introduced, st.srs);
  const newVerbsLeft = st.settings.introLessons ? Math.max(0, st.settings.newVerbsPerDay - verbsIntroducedToday(st.introduced)) : Infinity;
  return { met, newVerbsLeft, newToday: newCardsToday(st.stats) };
}

export function newCardsToday(stats: Stats): number {
  return stats.days[dayKey()]?.newCards ?? 0;
}

export function streak(stats: Stats): number {
  let n = 0;
  const d = new Date();
  // today counts if practiced; otherwise start from yesterday
  if (!stats.days[dayKey(d.getTime())]?.n) d.setDate(d.getDate() - 1);
  while (stats.days[dayKey(d.getTime())]?.n) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
