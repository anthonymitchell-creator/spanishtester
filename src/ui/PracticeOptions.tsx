import { TENSES } from '../engine/tenses';
import type { TenseId } from '../engine/types';
import { useStore } from '../store';
import { LEVEL_UI, Toggle } from './common';

const GROUP_LABEL = { indicativo: 'Indicativo', subjuntivo: 'Subjuntivo', imperativo: 'Imperativo', 'no personal': 'Formas no personales' };

export function TenseChips() {
  const { settings: s, updateSettings } = useStore();
  const groups = ['indicativo', 'subjuntivo', 'imperativo', 'no personal'] as const;
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g}>
          <div className="mb-1 text-xs text-slate-500">{GROUP_LABEL[g]}</div>
          <div className="flex flex-wrap gap-2">
            {TENSES.filter((t) => t.mood === g).map((t) => {
              const on = s.tenses.includes(t.id);
              return (
                <button
                  key={t.id}
                  className={on ? 'chip-on' : 'chip-off'}
                  title={`${t.en}: ${t.hint}`}
                  onClick={() => {
                    const next = on ? s.tenses.filter((x) => x !== t.id) : [...s.tenses, t.id];
                    if (next.length) updateSettings({ tenses: TENSES.map((x) => x.id).filter((id) => next.includes(id)) as TenseId[] });
                  }}
                >
                  {t.es}
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
  const w = s.warnings;
  const set = (p: Partial<typeof w>) => updateSettings({ warnings: { ...w, ...p } });
  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-800">
      <Toggle
        on={w.enabled}
        onChange={(v) => set({ enabled: v })}
        label="Warn before I answer"
        hint="Flags forms that break the -ar/-er/-ir pattern. Explanations always show after a mistake."
      />
      {w.enabled && (
        <>
          <Toggle on={w.irregular} onChange={(v) => set({ irregular: v })} label={<>{LEVEL_UI.irregular.dot} Irregular <span className="text-sm text-slate-500">tuve, hice, voy</span></>} />
          <Toggle on={w.stem} onChange={(v) => set({ stem: v })} label={<>{LEVEL_UI.stem.dot} Stem change <span className="text-sm text-slate-500">duermo, pidió, conozco</span></>} />
          <Toggle on={w.spelling} onChange={(v) => set({ spelling: v })} label={<>{LEVEL_UI.spelling.dot} Spelling change <span className="text-sm text-slate-500">busqué, llegué</span></>} />
        </>
      )}
    </div>
  );
}
