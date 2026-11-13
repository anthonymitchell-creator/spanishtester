// A short scaffolded lesson the first time a verb appears:
//   1. Meet it (stem + ending, meaning, type)
//   2. Per tense (max 3): see the pattern (stem vs ending, what breaks the rule), then
//      a guided drill: pick the ending → type the whole form (hint available).
import { useEffect, useMemo, useRef, useState } from 'react';
import { alternatives, explain, verbLevel } from '../../engine/classify';
import { englishPrompt } from '../../engine/english';
import { checkSpanish } from '../../engine/match';
import { conjOf, endingSets, regularStem, segment, segmentable, type Segment } from '../../engine/segment';
import { PERSON_ES_SHORT, TENSE_BY_ID } from '../../engine/tenses';
import type { Person, TenseId, VerbEntry } from '../../engine/types';
import { isReflexive } from '../../data/catalogue';
import { useStore } from '../../store';
import { AccentBar, LEVEL_UI, LevelBadge, SpeakButton } from '../../ui/common';
import { buzz } from '../../ui/haptics';
import { useLang, useT } from '../../ui/i18n';
import { personsFor } from './cards';

type Step = { kind: 'meet' } | { kind: 'pattern'; tense: TenseId } | { kind: 'drill'; tense: TenseId } | { kind: 'done' };

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Coloured form: pronoun · stem · ending. Parts that break the pattern take the level colour. */
export function SegForm({ seg, blankEnding, className = '' }: { seg: Segment; blankEnding?: boolean; className?: string }) {
  const broken = seg.level !== 'regular';
  const stemCls = broken ? LEVEL_UI[seg.level].text : 'text-slate-700 dark:text-slate-200';
  return (
    <span className={className} lang="es">
      {seg.pre && <span className="text-slate-400">{seg.pre}</span>}
      <span className={stemCls}>{seg.stem}</span>
      {seg.end && (blankEnding ? <span className="text-slate-400">___</span> : <span className="font-semibold text-teal-600 dark:text-teal-400">{seg.end}</span>)}
    </span>
  );
}

export function IntroLesson({ verb, onDone, onSkip }: { verb: VerbEntry; onDone(): void; onSkip(): void }) {
  const settings = useStore((s) => s.settings);
  const t = useT();
  const steps = useMemo<Step[]>(() => {
    let tenses = settings.tenses.filter((x) => segmentable(x) && personsFor(verb, x, settings).length > 0).slice(0, 3);
    if (!tenses.length) tenses = ['pres'];
    return [{ kind: 'meet' }, ...tenses.flatMap((x): Step[] => [{ kind: 'pattern', tense: x }, { kind: 'drill', tense: x }]), { kind: 'done' }];
  }, [verb, settings]);
  const [i, setI] = useState(0);
  const step = steps[i];
  const next = () => setI((x) => Math.min(x + 1, steps.length - 1));

  return (
    <div className="pt-safe flex h-full flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">🎓 {t.newVerb}</span>
        <div className="flex flex-1 gap-1">
          {steps.map((_, k) => (
            <div key={k} className={`h-1.5 flex-1 rounded-full ${k <= i ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-800'}`} />
          ))}
        </div>
        {step.kind !== 'done' && <button className="text-sm text-slate-500" onClick={onSkip}>{t.skipLesson}</button>}
      </header>
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 pb-8">
        {step.kind === 'meet' && <Meet verb={verb} onNext={next} />}
        {step.kind === 'pattern' && <Pattern verb={verb} tense={step.tense} onNext={next} />}
        {step.kind === 'drill' && <Drill key={step.tense} verb={verb} tense={step.tense} onDone={next} />}
        {step.kind === 'done' && (
          <div className="card space-y-4 py-8 text-center">
            <div className="text-5xl">🎉</div>
            <p className="text-lg">{t.lessonDone(verb.inf)}</p>
            <button className="btn-primary w-full text-lg" onClick={onDone}>{t.startPractising}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Meet({ verb, onNext }: { verb: VerbEntry; onNext(): void }) {
  const t = useT();
  const conj = conjOf(verb.inf);
  const stem = regularStem(verb.inf);
  const refl = isReflexive(verb.inf);
  const level = verbLevel(verb);
  return (
    <div className="card space-y-5 py-6 text-center">
      <div className="flex items-center justify-center gap-1">
        <div className="text-4xl font-bold" lang="es">{verb.inf}</div>
        <SpeakButton text={verb.inf} />
      </div>
      <div className="text-lg text-slate-600 dark:text-slate-300">{verb.en.join(' · ')}</div>
      {stem && <div className="flex items-end justify-center gap-1 text-3xl" lang="es">
        <div className="flex flex-col items-center">
          <span className="rounded-lg bg-slate-100 px-3 py-1 font-semibold dark:bg-slate-800">{stem}</span>
          <span className="mt-1 text-xs uppercase tracking-wide text-slate-500">{t.stem}</span>
        </div>
        <span className="pb-6 text-slate-400">+</span>
        <div className="flex flex-col items-center">
          <span className="rounded-lg bg-teal-50 px-3 py-1 font-semibold text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">{conj}{refl ? 'se' : ''}</span>
          <span className="mt-1 text-xs uppercase tracking-wide text-slate-500">{t.ending}</span>
        </div>
      </div>}
      <div className="space-y-2">
        <LevelBadge level={level} />
        <p className="text-slate-600 dark:text-slate-300">{t.typeLine(level, conj)}</p>
        {refl && <p className="text-sm text-slate-500">{t.reflexiveNote}</p>}
        {verb.note && <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">💡 {verb.note}</p>}
      </div>
      <button className="btn-primary w-full" onClick={onNext}>{t.meetNext}</button>
    </div>
  );
}

function Pattern({ verb, tense, onNext }: { verb: VerbEntry; tense: TenseId; onNext(): void }) {
  const t = useT();
  const lang = useLang();
  const settings = useStore((s) => s.settings);
  const info = TENSE_BY_ID[tense];
  const persons = personsFor(verb, tense, settings);
  const rows = persons.map((p) => ({ p, seg: segment(verb, tense, p)!, ex: explain(verb, tense, p) }));
  const notes = [...new Set(rows.flatMap((r) => r.ex.notes))];
  const endings = endingSets(conjOf(verb.inf), tense)[0] ?? [];
  const allRegular = rows.every((r) => r.seg.level === 'regular');

  return (
    <div className="card space-y-4">
      <div>
        <div className="label">{t.howItConjugates}</div>
        <h2 className="text-2xl font-semibold">{lang === 'es' ? info.es : info.en} <span className="text-base font-normal text-slate-500">· {lang === 'es' ? info.en : info.es}</span></h2>
      </div>
      <table className="w-full text-xl">
        <tbody>
          {rows.map(({ p, seg, ex }) => (
            <tr key={p} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
              <td className="w-28 py-2 text-sm text-slate-500">{PERSON_ES_SHORT[p]}</td>
              <td className="py-2">
                <SegForm seg={seg} />
                {seg.level !== 'regular' && ex.regular && ex.regular !== seg.form && (
                  <span className="ml-2 text-sm text-slate-400 line-through">{ex.regular}</span>
                )}
              </td>
              <td className="w-10 text-right"><SpeakButton text={seg.form} className="!p-1 text-base" /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-sm text-slate-500">
        {t.regularEndings} (-{conjOf(verb.inf)}): <span className="font-medium text-teal-600 dark:text-teal-400">{[...new Set(endings)].map((e) => `-${e}`).join(' · ')}</span>
      </div>
      <div className="text-xs text-slate-400">{t.colourKey}</div>
      {allRegular ? (
        <p className="text-emerald-700 dark:text-emerald-400">✓ {t.allRegular}</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          {notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
      <button className="btn-primary w-full" onClick={onNext}>{t.practiseIt}</button>
    </div>
  );
}

function Drill({ verb, tense, onDone }: { verb: VerbEntry; tense: TenseId; onDone(): void }) {
  const t = useT();
  const settings = useStore((s) => s.settings);
  const persons = useMemo(() => personsFor(verb, tense, settings), [verb, tense, settings]);
  const [phase, setPhase] = useState<'choose' | 'type'>('choose');
  const [queue, setQueue] = useState<Person[]>(() => shuffle(persons));
  const [retries, setRetries] = useState<Record<number, number>>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; picked?: string } | null>(null);
  const [value, setValue] = useState('');
  const [hint, setHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const p = queue[0];
  const seg = p != null ? segment(verb, tense, p) : null;

  useEffect(() => {
    if (phase === 'type') requestAnimationFrame(() => inputRef.current?.focus());
  }, [phase, p]);

  const advance = (ok: boolean) => {
    const rest = queue.slice(1);
    const r = retries[p] ?? 0;
    const nextQ = !ok && r < 2 ? [...rest, p] : rest;
    if (!ok) setRetries({ ...retries, [p]: r + 1 });
    setFeedback(null);
    setValue('');
    setHint(false);
    if (nextQ.length) { setQueue(nextQ); return; }
    if (phase === 'choose') {
      setPhase('type');
      setQueue(shuffle(persons).slice(0, Math.min(3, persons.length)));
      setRetries({});
    } else onDone();
  };

  const options = useMemo(() => {
    if (!seg) return [];
    if (seg.end) return shuffle(seg.endings).map((e) => ({ label: `-${e}`, value: e, correct: e === seg.end }));
    const forms = [...new Set(persons.map((q) => segment(verb, tense, q)!.form))];
    return shuffle(forms.filter((f) => f !== seg.form)).slice(0, 3).concat(seg.form).map((f) => ({ label: f, value: f, correct: f === seg.form }));
  }, [seg?.form, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!seg || p == null) return null;
  const prompt = englishPrompt(verb.en[0], tense, p, verb.enx);
  const info = TENSE_BY_ID[tense];

  const pick = (o: { value: string; correct: boolean }) => {
    if (feedback) return;
    setFeedback({ ok: o.correct, picked: o.value });
    buzz(o.correct ? 'ok' : 'bad', settings.haptics);
    if (o.correct) setTimeout(() => advance(true), 650);
  };

  const submit = () => {
    if (feedback) return advance(feedback.ok);
    if (!value.trim()) return;
    const r = checkSpanish(value, [seg.form, ...alternatives(verb.inf, tense, p)], 'lenient');
    setFeedback({ ok: r.pass });
    buzz(r.pass ? 'ok' : 'bad', settings.haptics);
  };

  return (
    <div className="space-y-4">
      <div className="card space-y-3 py-6 text-center">
        <div className="label">{phase === 'choose' ? (seg.end ? t.pickEnding : t.pickForm) : t.nowType}</div>
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{info.es}</span>
          {info.personal && <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{PERSON_ES_SHORT[p]}</span>}
        </div>
        <div className="text-xl text-slate-600 dark:text-slate-300">{prompt}</div>
        {phase === 'choose' && seg.end && <SegForm seg={seg} blankEnding={!feedback} className="block text-4xl font-semibold" />}
        {phase === 'type' && feedback && <SegForm seg={seg} className="block text-3xl font-semibold" />}
        {phase === 'type' && !feedback && hint && (
          <div className="text-2xl text-slate-400" lang="es">{seg.pre}{seg.stem}{seg.end ? '…' : ''}</div>
        )}
      </div>

      {phase === 'choose' ? (
        <div className={`grid gap-2 ${seg.end ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {options.map((o) => {
            const cls = !feedback ? 'ring-slate-300 dark:ring-slate-700'
              : o.correct ? 'bg-emerald-50 ring-emerald-500 dark:bg-emerald-950/40'
              : feedback.picked === o.value ? 'bg-rose-50 ring-rose-500 dark:bg-rose-950/40' : 'opacity-50 ring-slate-300 dark:ring-slate-700';
            return (
              <button key={o.value} disabled={!!feedback} onClick={() => pick(o)} className={`rounded-xl px-3 py-3 text-xl ring-1 ${cls}`} lang="es">
                {o.label}
              </button>
            );
          })}
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-2">
          <input
            ref={inputRef}
            className={`input ${feedback ? (feedback.ok ? '!ring-emerald-500' : '!ring-rose-500') : ''}`}
            value={value}
            readOnly={!!feedback}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t.typeSpanish}
            lang="es"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
          />
          {!feedback && <AccentBar inputRef={inputRef} onInsert={setValue} />}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">{feedback ? t.next : t.check}</button>
            {!feedback && !hint && <button type="button" className="btn-ghost" onClick={() => setHint(true)}>💡 {t.hint}</button>}
          </div>
        </form>
      )}

      {feedback && !feedback.ok && (
        <div className="card space-y-2">
          <div className="flex items-center gap-1 text-2xl">
            <SegForm seg={seg} className="font-semibold" />
            <SpeakButton text={seg.form} />
          </div>
          <div className="text-sm text-slate-500">{t.tryAgainLater}</div>
          {phase === 'choose' && <button className="btn-primary w-full" onClick={() => advance(false)}>{t.next}</button>}
        </div>
      )}
    </div>
  );
}
