import { useMemo, useState } from 'react';
import { TENSES } from '../engine/tenses';
import type { Level } from '../engine/types';
import { dayKey } from '../srs/scheduler';
import { streak, useStore, type Tally } from '../store';
import { LEVEL_UI, Section } from './common';
import { useLang, useT } from './i18n';

const pct = (t?: Tally) => (t && t.n ? Math.round((t.ok / t.n) * 100) : null);

export function StatsScreen() {
  const { stats, srs } = useStore();
  const [hover, setHover] = useState<number | null>(null);
  const t = useT();
  const lang = useLang();

  const days = useMemo(() => {
    const out: { key: string; label: string; n: number; ok: number }[] = [];
    for (let k = 13; k >= 0; k--) {
      const d = new Date();
      d.setDate(d.getDate() - k);
      const key = dayKey(d.getTime());
      const s = stats.days[key];
      out.push({ key, label: d.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { weekday: 'narrow' }), n: s?.n ?? 0, ok: s?.ok ?? 0 });
    }
    return out;
  }, [stats]);
  const max = Math.max(10, ...days.map((d) => d.n));

  const cards = Object.values(srs);
  const learned = cards.filter((c) => c.reps > 0).length;
  const mature = cards.filter((c) => c.ivl >= 21).length;
  const total = Object.values(stats.days).reduce((a, d) => ({ n: a.n + d.n, ok: a.ok + d.ok }), { n: 0, ok: 0 });
  const minutes = Math.round(Object.values(stats.days).reduce((a, d) => a + (d.ms ?? 0), 0) / 60000);

  const weakest = Object.entries(stats.byVerb)
    .filter(([, t]) => t.n >= 3)
    .sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)
    .slice(0, 8);

  const h = hover != null ? days[hover] : null;

  return (
    <div className="space-y-4 py-4">
      <h1 className="text-2xl font-bold">{t.progress}</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile n={`🔥 ${streak(stats)}`} label={t.dayStreak} />
        <Tile n={total.n} label={t.reviews} />
        <Tile n={pct(total) != null ? `${pct(total)}%` : '–'} label={t.accuracy} />
        <Tile n={`${learned}`} label={t.cardsLearned(mature)} />
      </div>

      <Section title={t.last14} right={<span className="text-sm text-slate-500">{t.minTotal(minutes)}</span>}>
        <div className="relative">
          <div className="h-5 text-sm text-slate-600 dark:text-slate-300">
            {h ? t.barDetail(h.key, h.n, h.n ? Math.round((h.ok / h.n) * 100) : null) : t.tapBar}
          </div>
          <div className="mt-2 flex h-32 items-end gap-[2px] border-b border-slate-200 dark:border-slate-800" onMouseLeave={() => setHover(null)}>
            {days.map((d, k) => (
              <button
                key={d.key}
                className="group flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHover(k)}
                onClick={() => setHover(k)}
                aria-label={`${d.key}: ${d.n} cards`}
              >
                <div
                  className={`w-full max-w-[18px] rounded-t-[4px] ${hover === k ? 'bg-teal-500' : 'bg-teal-600 dark:bg-teal-500/80'}`}
                  style={{ height: `${(d.n / max) * 100}%`, minHeight: d.n ? 3 : 0 }}
                />
              </button>
            ))}
          </div>
          <div className="mt-1 flex gap-[2px] text-center text-[11px] text-slate-500">
            {days.map((d) => <span key={d.key} className="flex-1">{d.label}</span>)}
          </div>
        </div>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title={t.byTense}>
          <table className="w-full text-sm">
            <tbody>
              {TENSES.filter((x) => stats.byTense[x.id]?.n).map((x) => (
                <Row key={x.id} label={lang === 'es' ? x.es : x.en} t={stats.byTense[x.id]} />
              ))}
            </tbody>
          </table>
          {!Object.keys(stats.byTense).length && <p className="text-sm text-slate-500">{t.noReviews}</p>}
        </Section>

        <Section title={t.byType}>
          <table className="w-full text-sm">
            <tbody>
              {(['regular', 'spelling', 'stem', 'irregular'] as Level[]).filter((l) => stats.byLevel[l]?.n).map((l) => (
                <Row key={l} label={`${LEVEL_UI[l].dot} ${t[({ regular: 'lvRegular', spelling: 'lvSpelling', stem: 'lvStem', irregular: 'lvIrregular' } as const)[l]]}`} t={stats.byLevel[l]} />
              ))}
            </tbody>
          </table>
        </Section>

        <Section title={t.trickiest}>
          {weakest.length === 0 ? (
            <p className="text-sm text-slate-500">{t.trickiestEmpty}</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>{weakest.map(([inf, t]) => <Row key={inf} label={inf} t={t} />)}</tbody>
            </table>
          )}
        </Section>

        <Section title={t.byPerson}>
          <table className="w-full text-sm">
            <tbody>
              {['yo', 'tú', 'él/usted', 'nosotros', 'ellos/ustedes'].map((p, i) => stats.byPerson[i]?.n ? <Row key={p} label={p} t={stats.byPerson[i]} /> : null)}
            </tbody>
          </table>
        </Section>
      </div>
    </div>
  );
}

function Tile({ n, label }: { n: string | number; label: string }) {
  return (
    <div className="card text-center">
      <div className="text-2xl font-semibold">{n}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

function Row({ label, t }: { label: string; t: Tally }) {
  const p = pct(t) ?? 0;
  return (
    <tr>
      <td className="py-1 pr-2">{label}</td>
      <td className="w-1/3 py-1">
        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-teal-600" style={{ width: `${p}%` }} />
        </div>
      </td>
      <td className="w-20 py-1 text-right tabular-nums text-slate-600 dark:text-slate-300">{p}% <span className="text-slate-400">({t.n})</span></td>
    </tr>
  );
}
