import { TENSES } from '../engine/tenses';
import type { TenseId } from '../engine/types';
import { useStore } from '../store';
import { LEVEL_UI, Toggle } from './common';
import { useLang, useT } from './i18n';

export function TenseChips() {
  const { settings: s, updateSettings } = useStore();
  const t = useT();
  const lang = useLang();
  const groups = [
    ['indicativo', t.groupIndicative],
    ['subjuntivo', t.groupSubjunctive],
    ['imperativo', t.groupImperative],
    ['no personal', t.groupNonFinite],
  ] as const;
  return (
    <div className="space-y-3">
      {groups.map(([g, label]) => (
        <div key={g}>
          <div className="mb-1 text-xs text-slate-500">{label}</div>
          <div className="flex flex-wrap gap-2">
            {TENSES.filter((x) => x.mood === g).map((x) => {
              const on = s.tenses.includes(x.id);
              return (
                <button
                  key={x.id}
                  className={on ? 'chip-on' : 'chip-off'}
                  title={`${lang === 'es' ? x.en : x.es}: ${x.hint}`}
                  onClick={() => {
                    const next = on ? s.tenses.filter((y) => y !== x.id) : [...s.tenses, x.id];
                    if (next.length) updateSettings({ tenses: TENSES.map((y) => y.id).filter((id) => next.includes(id)) as TenseId[] });
                  }}
                >
                  {lang === 'es' ? x.es : x.en}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function WarningSettings() {
  const { settings: s, updateSettings } = useStore();
  const t = useT();
  const w = s.warnings;
  const set = (p: Partial<typeof w>) => updateSettings({ warnings: { ...w, ...p } });
  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-800">
      <Toggle on={w.enabled} onChange={(v) => set({ enabled: v })} label={t.warnBefore} hint={t.warnHint} />
      {w.enabled && (
        <>
          <Toggle on={w.irregular} onChange={(v) => set({ irregular: v })} label={<>{LEVEL_UI.irregular.dot} {t.lvIrregular} <span className="text-sm text-slate-500">tuve, hice, voy</span></>} />
          <Toggle on={w.stem} onChange={(v) => set({ stem: v })} label={<>{LEVEL_UI.stem.dot} {t.lvStem} <span className="text-sm text-slate-500">duermo, pidió, conozco</span></>} />
          <Toggle on={w.spelling} onChange={(v) => set({ spelling: v })} label={<>{LEVEL_UI.spelling.dot} {t.lvSpelling} <span className="text-sm text-slate-500">busqué, llegué</span></>} />
        </>
      )}
    </div>
  );
}
