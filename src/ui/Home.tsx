import { useMemo } from 'react';
import type { Screen } from '../App';
import { MODES } from '../modes/registry';
import { buildSession, queueInfo } from '../modes/verbs/cards';
import { newCardsToday, streak, useStore } from '../store';
import { dayKey } from '../srs/scheduler';
import { TENSE_BY_ID } from '../engine/tenses';

export function Home({ go }: { go: (s: Screen) => void }) {
  const { settings, srs, stats, verbs } = useStore();
  const info = useMemo(() => queueInfo(verbs, settings, srs), [verbs, settings, srs]);
  const newLeft = Math.max(0, settings.newPerDay - newCardsToday(stats));
  const today = stats.days[dayKey()];
  const st = streak(stats);

  const start = (mode: 'normal' | 'extra') => {
    const cards = buildSession(verbs, settings, srs, newCardsToday(stats), mode);
    if (cards.length) go({ name: 'session', cards });
  };
  const nothingToDo = info.due === 0 && (newLeft === 0 || info.fresh === 0);

  return (
    <div className="space-y-4 py-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Práctica</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Español latinoamericano</p>
        </div>
        <div className="text-right text-sm">
          <div className="text-2xl font-semibold">🔥 {st}</div>
          <div className="text-slate-500">{st === 1 ? 'día' : 'días'}</div>
        </div>
      </header>

      <section className="card space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔤</span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Verbos</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {settings.tenses.map((t) => TENSE_BY_ID[t].es).join(' · ')}
            </p>
          </div>
          <button className="btn-ghost !px-3 !py-2 text-sm" onClick={() => go({ name: 'setup' })}>Ajustar</button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat n={info.due} label="due today" />
          <Stat n={Math.min(newLeft, info.fresh)} label="new available" />
          <Stat n={today?.n ?? 0} label="done today" />
        </div>
        {nothingToDo ? (
          <div className="space-y-2">
            <p className="text-center text-sm text-slate-500">All caught up for today. ¡Bien hecho!</p>
            <button className="btn-ghost w-full" onClick={() => start('extra')}>Extra practice</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button className="btn-primary flex-1 text-lg" onClick={() => start('normal')}>Empezar ▶</button>
            <button className="btn-ghost" onClick={() => start('extra')} title="Random cards, ignoring the schedule">Libre</button>
          </div>
        )}
      </section>

      <h2 className="label px-1 pt-2">Más modos (coming soon)</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {MODES.filter((m) => !m.available).map((m) => (
          <div key={m.id} className="card opacity-60">
            <div className="text-2xl">{m.icon}</div>
            <div className="font-semibold">{m.es}</div>
            <div className="text-sm text-slate-500">{m.description}</div>
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
