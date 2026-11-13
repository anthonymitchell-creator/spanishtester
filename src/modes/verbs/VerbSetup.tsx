import { useMemo } from 'react';
import type { Screen } from '../../App';
import { CATEGORIES } from '../../data/catalogue';
import { PERSON_ES } from '../../engine/tenses';
import type { Person } from '../../engine/types';
import { newCardsToday, useStore, type Direction } from '../../store';
import { ChipGroup, Section } from '../../ui/common';
import { TenseChips, WarningSettings } from '../../ui/PracticeOptions';
import { buildSession, filterVerbs, queueInfo } from './cards';

export const DIRECTIONS: { value: Direction; label: string; hint: string }[] = [
  { value: 'en-es', label: 'EN → ES', hint: '“we will eat” → comeremos' },
  { value: 'es-en', label: 'ES → EN', hint: 'hablaron → “they spoke”' },
  { value: 'inf', label: 'Infinitivos', hint: 'to remember ↔ recordar' },
  { value: 'recog', label: 'Reconocer', hint: 'fuimos → ir · pretérito · nosotros' },
];

export function VerbSetup({ go }: { go: (s: Screen) => void }) {
  const { settings: s, updateSettings, verbs, srs, stats } = useStore();
  const pool = useMemo(() => filterVerbs(verbs, s), [verbs, s]);
  const info = useMemo(() => queueInfo(verbs, s, srs), [verbs, s, srs]);

  const start = (mode: 'normal' | 'extra') => {
    const cards = buildSession(verbs, s, srs, newCardsToday(stats), mode);
    if (cards.length) go({ name: 'session', cards });
  };

  return (
    <div className="space-y-4 py-4">
      <header className="flex items-center gap-3">
        <button className="btn-ghost !px-3 !py-2" onClick={() => go({ name: 'home' })}>←</button>
        <h1 className="text-2xl font-bold">Verbos: ajustes</h1>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <Section title="Tenses">
            <TenseChips />
          </Section>

          <Section title="Card types">
            <div className="space-y-2">
              {DIRECTIONS.map((d) => {
                const on = s.directions.includes(d.value);
                return (
                  <button
                    key={d.value}
                    onClick={() => {
                      const next = on ? s.directions.filter((x) => x !== d.value) : [...s.directions, d.value];
                      if (next.length) updateSettings({ directions: next });
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left ring-1 ${on ? 'bg-teal-50 ring-teal-600 dark:bg-teal-950/40' : 'ring-slate-300 dark:ring-slate-700'}`}
                  >
                    <span className="font-medium">{d.label}</span>
                    <span className="text-sm text-slate-500">{d.hint}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Answer style">
            <ChipGroup
              multi={false}
              value={[s.answerStyle]}
              onChange={([v]) => updateSettings({ answerStyle: v })}
              options={[
                { value: 'typed', label: '⌨️ Type' },
                { value: 'flip', label: '🔄 Flip & self-grade' },
                { value: 'choice', label: '🔘 Multiple choice' },
              ]}
            />
            <p className="text-sm text-slate-500">Recognition cards are always multiple choice.</p>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Persons">
            <ChipGroup
              value={s.persons}
              onChange={(v) => v.length && updateSettings({ persons: (v as Person[]).sort() })}
              options={PERSON_ES.map((p, i) => ({ value: i as Person, label: p }))}
            />
            <p className="text-sm text-slate-500">LatAm Spanish: ustedes replaces vosotros.</p>
          </Section>

          <Section title={`Verbs (${pool.length})`}>
            <ChipGroup
              multi={false}
              value={[s.verbFilter]}
              onChange={([v]) => updateSettings({ verbFilter: v })}
              options={[
                { value: 'all', label: 'All' },
                { value: 'irregular', label: 'Irregular & stem-changing' },
                { value: 'regular', label: 'Regular' },
                { value: 'reflexive', label: 'Reflexive' },
                { value: 'recent', label: 'Recently added' },
              ]}
            />
            <div className="label pt-2">Categories {s.categories.length === 0 && '(all)'}</div>
            <ChipGroup
              value={s.categories}
              onChange={(v) => updateSettings({ categories: v })}
              options={CATEGORIES.map((c) => ({ value: c.id, label: `${c.icon} ${c.es}` }))}
            />
          </Section>

          <Section title="Irregular warnings">
            <WarningSettings />
          </Section>

          <Section title="Session">
            <NumberRow label="Cards per session" value={s.sessionLength} min={5} max={100} step={5} onChange={(n) => updateSettings({ sessionLength: n })} />
            <NumberRow label="New cards per day" value={s.newPerDay} min={0} max={100} step={5} onChange={(n) => updateSettings({ newPerDay: n })} />
          </Section>
        </div>
      </div>

      <div className="pb-safe sticky bottom-20 flex gap-2 rounded-2xl bg-slate-50/90 py-2 backdrop-blur dark:bg-slate-950/90">
        <button className="btn-primary flex-1 text-lg" onClick={() => start('normal')} disabled={info.due + Math.min(info.fresh, s.newPerDay) === 0}>
          Empezar · {info.due} due · {Math.min(info.fresh, Math.max(0, s.newPerDay - newCardsToday(stats)))} new
        </button>
        <button className="btn-ghost" onClick={() => start('extra')} disabled={info.total === 0}>Libre</button>
      </div>
    </div>
  );
}

export function NumberRow({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <button className="btn-ghost !px-3 !py-1" onClick={() => onChange(Math.max(min, value - step))}>−</button>
        <span className="w-10 text-center font-semibold tabular-nums">{value}</span>
        <button className="btn-ghost !px-3 !py-1" onClick={() => onChange(Math.min(max, value + step))}>+</button>
      </div>
    </div>
  );
}
