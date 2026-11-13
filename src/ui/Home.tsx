import { useMemo } from 'react';
import type { Screen } from '../App';
import { MODES } from '../modes/registry';
import { buildSession, queueInfo } from '../modes/verbs/cards';
import { sessionContext, streak, useStore } from '../store';
import { dayKey } from '../srs/scheduler';
import { TENSE_BY_ID } from '../engine/tenses';
import { useLang, useT } from './i18n';

export function LangToggle() {
  const lang = useLang();
  const updateSettings = useStore((s) => s.updateSettings);
  return (
    <div className="flex overflow-hidden rounded-full text-xs font-semibold ring-1 ring-slate-300 dark:ring-slate-700" role="group" aria-label="Interface language">
      {(['en', 'es'] as const).map((l) => (
        <button
          key={l}
          onClick={() => updateSettings({ uiLang: l })}
          className={`px-2.5 py-1 ${lang === l ? 'bg-teal-700 text-white dark:bg-teal-600' : 'text-slate-600 dark:text-slate-300'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function Home({ go }: { go: (s: Screen) => void }) {
  const store = useStore();
  const { settings, srs, stats, verbs } = store;
  const ctx = sessionContext(store);
  const t = useT();
  const lang = useLang();
  const info = useMemo(() => queueInfo(verbs, settings, srs, ctx.met, ctx.newVerbsLeft), [verbs, settings, srs, store.introduced]); // eslint-disable-line react-hooks/exhaustive-deps
  const newLeft = Math.max(0, settings.newPerDay - ctx.newToday);
  const today = stats.days[dayKey()];
  const st = streak(stats);

  const start = (mode: 'normal' | 'extra') => {
    const cards = buildSession(verbs, settings, srs, ctx.newToday, mode, ctx.met, ctx.newVerbsLeft);
    if (cards.length) go({ name: 'session', cards });
  };
  const nothingToDo = info.due === 0 && (newLeft === 0 || info.fresh === 0);

  return (
    <div className="space-y-4 py-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Práctica</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <LangToggle />
          <div className="text-right text-sm">
            <span className="text-xl font-semibold">🔥 {st}</span> <span className="text-slate-500">{t.streakDays(st)}</span>
          </div>
        </div>
      </header>

      <section className="card space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔤</span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{t.verbs}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {settings.tenses.map((x) => (lang === 'es' ? TENSE_BY_ID[x].es : TENSE_BY_ID[x].en)).join(' · ')}
            </p>
          </div>
          <button className="btn-ghost !px-3 !py-2 text-sm" onClick={() => go({ name: 'setup' })}>{t.options}</button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat n={info.due} label={t.dueToday} />
          <Stat n={Math.min(newLeft, info.fresh)} label={t.newAvailable} />
          <Stat n={today?.n ?? 0} label={t.doneToday} />
        </div>
        {nothingToDo ? (
          <div className="space-y-2">
            <p className="text-center text-sm text-slate-500">{t.caughtUp}</p>
            <button className="btn-ghost w-full" onClick={() => start('extra')}>{t.extraPractice}</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button className="btn-primary flex-1 text-lg" onClick={() => start('normal')}>{t.start}</button>
            <button className="btn-ghost" onClick={() => start('extra')} title={t.freeHint}>{t.free}</button>
          </div>
        )}
      </section>

      <h2 className="label px-1 pt-2">{t.moreModes}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {MODES.filter((m) => !m.available).map((m) => (
          <div key={m.id} className="card opacity-60">
            <div className="text-2xl">{m.icon}</div>
            <div className="font-semibold">{lang === 'es' ? m.es : m.en}</div>
            <div className="text-sm text-slate-500">{lang === 'es' ? m.descriptionEs : m.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl bg-slate-100 py-2 dark:bg-slate-800">
      <div className="text-2xl font-semibold">{n}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
