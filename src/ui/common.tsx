import type { ReactNode, RefObject } from 'react';
import { analyze, levelOf } from '../engine/classify';
import { formOf } from '../engine/conjugate';
import { PERSON_ES_SHORT, TENSES, TENSE_BY_ID } from '../engine/tenses';
import type { Level, Person, TenseId, VerbEntry } from '../engine/types';
import { useStore } from '../store';
import { canSpeak, speak } from './speech';
import { useLang, useT, type Dict } from './i18n';

const LEVEL_KEY: Record<Level, keyof Dict> = { regular: 'lvRegular', spelling: 'lvSpelling', stem: 'lvStem', irregular: 'lvIrregular' };
function useLevelLabel() {
  const t = useT();
  return (l: Level) => t[LEVEL_KEY[l]] as string;
}

export const LEVEL_UI: Record<Level, { label: string; dot: string; cls: string; text: string }> = {
  regular: { label: 'Regular', dot: '🟢', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', text: '' },
  spelling: { label: 'Spelling change', dot: '🟡', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', text: 'text-amber-600 dark:text-amber-400' },
  stem: { label: 'Stem change', dot: '🟠', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300', text: 'text-orange-600 dark:text-orange-400' },
  irregular: { label: 'Irregular', dot: '🔴', cls: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300', text: 'text-rose-600 dark:text-rose-400 font-semibold' },
};

export function LevelBadge({ level, small }: { level: Level; small?: boolean }) {
  const u = LEVEL_UI[level];
  const label = useLevelLabel();
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${u.cls} ${small ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'}`}>
      {u.dot} {label(level)}
    </span>
  );
}

export function SpeakButton({ text, className = '' }: { text: string; className?: string }) {
  const { voiceURI, speechRate } = useStore((s) => s.settings);
  if (!canSpeak()) return null;
  return (
    <button
      type="button"
      aria-label={`Pronounce ${text}`}
      onClick={(e) => { e.stopPropagation(); speak(text, { voiceURI, rate: speechRate }); }}
      className={`rounded-full p-2 text-xl hover:bg-slate-200 dark:hover:bg-slate-800 ${className}`}
    >
      🔊
    </button>
  );
}

export function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block">{label}</span>
        {hint && <span className="block text-sm text-slate-500 dark:text-slate-400">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${on ? 'left-[1.4rem]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

export function ChipGroup<T extends string | number>({
  options, value, onChange, multi = true,
}: {
  options: { value: T; label: ReactNode }[];
  value: T[];
  onChange: (v: T[]) => void;
  multi?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={String(o.value)}
            type="button"
            className={on ? 'chip-on' : 'chip-off'}
            onClick={() => {
              if (!multi) return onChange([o.value]);
              onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value]);
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Section({ title, children, right }: { title: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="label">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

const ACCENTS = ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'];

/** Accent keys that insert at the cursor without closing the soft keyboard. */
export function AccentBar({ inputRef, onInsert }: { inputRef: RefObject<HTMLInputElement>; onInsert: (v: string) => void }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto py-1">
      {ACCENTS.map((ch) => (
        <button
          key={ch}
          type="button"
          tabIndex={-1}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            const el = inputRef.current;
            if (!el) return;
            const s = el.selectionStart ?? el.value.length;
            const e = el.selectionEnd ?? el.value.length;
            const v = el.value.slice(0, s) + ch + el.value.slice(e);
            onInsert(v);
            requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + 1, s + 1); });
          }}
          className="min-w-[2.6rem] rounded-lg bg-slate-200 px-2 py-2 text-lg font-medium dark:bg-slate-800"
        >
          {ch}
        </button>
      ))}
    </div>
  );
}

/** One tense row for a verb, with irregular forms coloured and the asked person highlighted. */
export function TenseTable({ verb, tense, highlight }: { verb: VerbEntry; tense: TenseId; highlight?: Person }) {
  const t = analyze(verb).table;
  const info = TENSE_BY_ID[tense];
  if (!info.personal) {
    const f = formOf(t, tense, 0)!;
    const l = levelOf(verb, tense, 0);
    return (
      <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800">
        <span className="text-sm text-slate-500">{info.es}</span>
        <span className={LEVEL_UI[l].text}>{f}</span>
      </div>
    );
  }
  return (
    <table className="w-full text-[15px]">
      <tbody>
        {([0, 1, 2, 3, 4] as Person[]).map((p) => {
          const f = formOf(t, tense, p);
          if (f == null) return null;
          const l = levelOf(verb, tense, p);
          const hl = p === highlight;
          return (
            <tr key={p} className={hl ? 'bg-teal-50 dark:bg-teal-950/50' : ''}>
              <td className="w-28 py-1 pl-2 pr-3 text-sm text-slate-500 dark:text-slate-400">{PERSON_ES_SHORT[p]}</td>
              <td className={`py-1 ${LEVEL_UI[l].text} ${hl ? 'font-semibold' : ''}`}>{f}</td>
              <td className="w-10 text-right"><SpeakButton text={f} className="!p-1 text-base" /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function FullTable({ verb, tenses }: { verb: VerbEntry; tenses?: TenseId[] }) {
  const es = useLang() === 'es';
  const list = TENSES.filter((t) => !tenses || tenses.includes(t.id));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {list.map((x) => (
        <div key={x.id}>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="font-medium">{es ? x.es : x.en}</span>
            <span className="text-xs text-slate-500">{es ? x.en : x.es}</span>
          </div>
          <TenseTable verb={verb} tense={x.id} />
        </div>
      ))}
    </div>
  );
}

export function Legend() {
  const label = useLevelLabel();
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {(['spelling', 'stem', 'irregular'] as Level[]).map((l) => (
        <span key={l} className={LEVEL_UI[l].text}>{LEVEL_UI[l].dot} {label(l)}</span>
      ))}
    </div>
  );
}
