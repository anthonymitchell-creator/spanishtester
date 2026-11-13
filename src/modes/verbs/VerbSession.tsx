import { useEffect, useMemo, useRef, useState } from 'react';
import { explain } from '../../engine/classify';
import type { Verdict } from '../../engine/match';
import { introducedSet, sessionContext, useStore } from '../../store';
import { segment } from '../../engine/segment';
import { IntroLesson } from './IntroLesson';
import type { Grade } from '../../srs/scheduler';
import { AccentBar, LEVEL_UI, LevelBadge, SpeakButton, TenseTable } from '../../ui/common';
import { buzz } from '../../ui/haptics';
import { speak } from '../../ui/speech';
import { useT } from '../../ui/i18n';
import {
  acceptedAnswers, answerLang, buildSession, cardLevel, check, choicesFor, displayAnswer, promptOf, showWarning, spanishForm,
  type Choice, type VerbCard,
} from './cards';

interface Result {
  card: VerbCard;
  verdict: Verdict;
  pass: boolean;
  given: string;
  grade: Grade;
}

interface Props {
  cards: VerbCard[];
  review?: boolean;
  onExit(): void;
  onRestart(cards: VerbCard[], review?: boolean): void;
}

export function VerbSession({ cards, review, onExit, onRestart }: Props) {
  const { settings, verbs, record, introduced, srs, markIntroduced } = useStore();
  const t = useT();
  const [hinted, setHinted] = useState(false);
  const [queue, setQueue] = useState<VerbCard[]>(cards);
  const [i, setI] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [pending, setPending] = useState<Omit<Result, 'grade'> | null>(null);
  const [revealed, setRevealed] = useState(false); // flip mode
  const [value, setValue] = useState('');
  const startedAt = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  const card = queue[i];
  const done = i >= queue.length;
  const style = card?.dir === 'recog' ? 'choice' : settings.answerStyle;
  const lang = card ? answerLang(card) : 'es';
  const answered = !!pending || (style === 'flip' && revealed);
  const choices = useMemo<Choice[]>(() => (card && style === 'choice' ? choicesFor(card, verbs, settings) : []), [card?.key, style]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    startedAt.current = Date.now();
    if (style === 'typed') requestAnimationFrame(() => inputRef.current?.focus());
  }, [card?.key, style]);

  useEffect(() => {
    if (answered && card && settings.ttsAuto) speak(spanishForm(card), { voiceURI: settings.voiceURI, rate: settings.speechRate });
    if (answered && style !== 'typed') requestAnimationFrame(() => continueRef.current?.focus());
  }, [answered]); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) return <Summary results={results} review={review} onExit={onExit} onRestart={onRestart} />;

  // First time this verb shows up: teach it before testing it.
  if (!review && settings.introLessons && card.isNew && !introducedSet(introduced, srs).has(card.verb.inf)) {
    const meet = () => markIntroduced(card.verb.inf);
    return <IntroLesson key={card.verb.inf} verb={card.verb} onDone={meet} onSkip={meet} />;
  }

  const prompt = promptOf(card);
  const warn = showWarning(card, settings);
  // Hint for typed Spanish answers: reveal the stem (e.g. "tien…").
  // (Only when the form splits into stem + ending; otherwise the hint would give the answer away.)
  const seg0 = lang === 'es' && card.dir === 'en-es' ? segment(card.verb, card.tense, card.person) : null;
  const hintSeg = seg0?.end ? seg0 : null;

  const submitTyped = () => {
    if (pending || !value.trim()) return;
    const r = check(card, value, verbs, settings.strictness);
    setPending({ card, verdict: r.verdict, pass: r.pass, given: value });
    buzz(r.pass ? 'ok' : 'bad', settings.haptics);
  };

  const pickChoice = (c: Choice) => {
    if (pending) return;
    setPending({ card, verdict: c.correct ? 'correct' : 'wrong', pass: c.correct, given: c.label });
    buzz(c.correct ? 'ok' : 'bad', settings.haptics);
  };

  const finish = (grade: Grade, pass: boolean, verdict: Verdict, given: string) => {
    const res: Result = { card, verdict, pass, given, grade };
    const firstAttempt = !results.some((r) => r.card.srsId === card.srsId);
    record({
      srsId: card.srsId, grade, pass, tense: card.tense, level: cardLevel(card), inf: card.verb.inf,
      person: card.person, ms: Date.now() - startedAt.current, updateSrs: !review && firstAttempt,
    });
    setResults((rs) => [...rs, res]);
    if (!pass) {
      // Try again a few cards later (once per card per session).
      const retries = queue.filter((q) => q.srsId === card.srsId).length;
      if (retries < 3) {
        const pos = Math.min(queue.length, i + 3 + Math.floor(Math.random() * 3));
        const again = { ...card, key: `${card.key}+r${retries}` };
        setQueue((q) => [...q.slice(0, pos), again, ...q.slice(pos)]);
      }
    }
    // Reset answer state in the same render as advancing, so the next card never flashes old feedback.
    setPending(null);
    setRevealed(false);
    setValue('');
    setHinted(false);
    setI((x) => x + 1);
  };

  const continueAfter = (override?: boolean) => {
    if (!pending) return;
    const pass = override ? true : pending.pass;
    // A hint or a missing accent still passes, but the card comes back sooner (hard).
    const grade: Grade = !pass ? 0 : override ? 2 : pending.verdict === 'accent' || hinted ? 1 : 2;
    finish(grade, pass, override ? 'correct' : pending.verdict, pending.given);
  };

  const progress = Math.round((i / queue.length) * 100);

  return (
    <div className="pt-safe flex h-full flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
        <button className="btn-ghost !px-3 !py-2" onClick={() => (results.length === 0 || confirm(t.endConfirm)) && setI(queue.length)} aria-label={t.endSession}>✕</button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="w-14 text-right text-sm tabular-nums text-slate-500">{i + 1}/{queue.length}</span>
      </header>

      <div className="mx-auto grid w-full max-w-5xl flex-1 gap-4 overflow-y-auto px-4 pb-6 md:grid-cols-2 md:items-start">
        {/* Card */}
        <div className="space-y-4">
          <div className="card space-y-4 py-6 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              {card.isNew && !review && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">{t.badgeNew}</span>}
              {review && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">{t.badgeReview}</span>}
              {prompt.tenseLabel && (
                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium dark:bg-slate-800">
                  {prompt.tenseLabel}
                  {prompt.tenseHint && <span className="ml-1 text-slate-500">· {prompt.tenseHint}</span>}
                </span>
              )}
              {prompt.personChip && <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{prompt.personChip}</span>}
              {warn && <LevelBadge level={warn} />}
            </div>
            <div className="flex items-center justify-center gap-1">
              <div lang={prompt.mainLang} className="text-3xl font-semibold leading-tight sm:text-4xl">{prompt.main}</div>
              {prompt.mainLang === 'es' && <SpeakButton text={prompt.main} />}
            </div>
            {prompt.sub && <div className="text-slate-500 dark:text-slate-400">{prompt.sub}</div>}
            {card.dir === 'recog' && <div className="text-sm text-slate-500">{t.whichAnalysis}</div>}
            {card.verb.unverified && <div className="text-xs text-amber-600">{t.unverifiedCard}</div>}
          </div>

          {/* Answer area */}
          {style === 'typed' && (
            <form
              onSubmit={(e) => { e.preventDefault(); if (pending) continueAfter(); else submitTyped(); }}
              className="space-y-2"
            >
              <input
                ref={inputRef}
                className={`input ${pending ? (pending.pass ? (pending.verdict === 'accent' ? '!ring-amber-500' : '!ring-emerald-500') : '!ring-rose-500') : ''}`}
                value={value}
                readOnly={!!pending}
                onChange={(e) => setValue(e.target.value)}
                placeholder={lang === 'es' ? t.typeSpanish : t.typeEnglish}
                lang={lang === 'es' ? 'es' : 'en'}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint={pending ? 'next' : 'done'}
              />
              {lang === 'es' && !pending && hintSeg && hinted && (
                <div className="text-center text-xl text-slate-400" lang="es">💡 {hintSeg.pre}{hintSeg.stem}{hintSeg.end ? '…' : ''}</div>
              )}
              {lang === 'es' && !pending && <AccentBar inputRef={inputRef} onInsert={setValue} />}
              {!pending ? (
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1" disabled={!value.trim()}>{t.check}</button>
                  {hintSeg && !hinted && (
                    <button type="button" className="btn-ghost" onClick={() => { setHinted(true); inputRef.current?.focus(); }}>💡 {t.hint}</button>
                  )}
                  <button type="button" className="btn-ghost" onClick={() => setPending({ card, verdict: 'wrong', pass: false, given: '' })}>{t.dontKnow}</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1">{t.continue}</button>
                  {!pending.pass && pending.given && (
                    <button type="button" className="btn-ghost" onClick={() => continueAfter(true)} title={t.iWasRightHint}>{t.iWasRight}</button>
                  )}
                </div>
              )}
            </form>
          )}

          {style === 'flip' && (
            !revealed ? (
              <button className="btn-primary w-full text-lg" onClick={() => setRevealed(true)}>{t.showAnswer}</button>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {([[t.gAgain, 0, 'bg-rose-600'], [t.gHard, 1, 'bg-amber-600'], [t.gGood, 2, 'bg-teal-700'], [t.gEasy, 3, 'bg-sky-700']] as const).map(([label, g, cls], k) => (
                  <button
                    key={label}
                    ref={k === 2 ? continueRef : undefined}
                    className={`btn ${cls} text-white`}
                    onClick={() => { buzz(g === 0 ? 'bad' : 'ok', settings.haptics); finish(g, g > 0, g > 0 ? 'correct' : 'wrong', ''); }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )
          )}

          {style === 'choice' && (
            <div className="space-y-2">
              {choices.map((c) => {
                const picked = pending?.given === c.label;
                const cls = !pending ? 'ring-slate-300 dark:ring-slate-700' : c.correct ? 'bg-emerald-50 ring-emerald-500 dark:bg-emerald-950/40' : picked ? 'bg-rose-50 ring-rose-500 dark:bg-rose-950/40' : 'opacity-50 ring-slate-300 dark:ring-slate-700';
                return (
                  <button key={c.label} disabled={!!pending} onClick={() => pickChoice(c)} className={`w-full rounded-xl px-4 py-3 text-left text-lg ring-1 ${cls}`}>
                    {c.label}
                  </button>
                );
              })}
              {pending && <button ref={continueRef} className="btn-primary w-full" onClick={() => continueAfter()}>{t.continue}</button>}
            </div>
          )}
        </div>

        {/* Feedback (right pane when unfolded, below when folded) */}
        {answered && <Feedback card={card} pending={pending} showDetailAlways={settings.warnings.enabled} verbs={verbs} />}
      </div>
    </div>
  );
}

function Feedback({ card, pending, showDetailAlways, verbs }: { card: VerbCard; pending: Omit<Result, 'grade'> | null; showDetailAlways: boolean; verbs: ReturnType<typeof useStore.getState>['verbs'] }) {
  const t = useT();
  const isConj = card.dir !== 'inf';
  const ex = isConj ? explain(card.verb, card.tense, card.person) : null;
  const wrong = pending && !pending.pass;
  const alts = acceptedAnswers(card, verbs).filter((a) => answerLang(card) === 'es' && a !== spanishForm(card));
  const banner = !pending
    ? null
    : pending.verdict === 'correct'
      ? { cls: 'bg-emerald-600', text: t.correct }
      : pending.verdict === 'accent'
        ? { cls: 'bg-amber-600', text: pending.pass ? t.almostAccent : t.accentStrict }
        : { cls: 'bg-rose-600', text: pending.given ? t.notQuite : t.answer };

  return (
    <div className="card space-y-4">
      {banner && <div className={`rounded-xl px-4 py-2 font-semibold text-white ${banner.cls}`}>{banner.text}</div>}
      <div>
        <div className="label">{t.answer}</div>
        <div className="flex items-center gap-1">
          <div className="text-2xl font-semibold" lang={answerLang(card) === 'es' ? 'es' : 'en'}>
            {card.dir === 'recog' ? `${card.verb.inf}` : displayAnswer(card)}
          </div>
          <SpeakButton text={spanishForm(card)} />
        </div>
        {card.dir !== 'es-en' && card.dir !== 'inf' && <div className="text-slate-500">{card.verb.inf}: {card.verb.en.join(', ')}</div>}
        {card.dir === 'es-en' && <div className="text-slate-500">{card.verb.inf}: {card.verb.en.join(', ')}</div>}
        {alts.length > 0 && <div className="text-sm text-slate-500">{t.alsoAccepted} {alts.join(', ')}</div>}
        {pending?.given && !pending.pass && <div className="mt-1 text-sm text-rose-600 dark:text-rose-400">{t.youWrote} {pending.given}</div>}
      </div>

      {card.verb.note && <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">💡 {card.verb.note}</div>}

      {ex && ex.level !== 'regular' && (showDetailAlways || wrong) && (
        <div className="space-y-2">
          <LevelBadge level={ex.level} />
          {ex.regular && ex.regular !== spanishForm(card) && (
            <div className="text-sm">
              {t.regularWouldGive} <span className="line-through opacity-70">{ex.regular}</span> → <span className={LEVEL_UI[ex.level].text}>{spanishForm(card)}</span>
            </div>
          )}
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
            {ex.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </div>
      )}

      {isConj && (
        <div>
          <div className="label mb-1">{card.verb.inf}</div>
          <TenseTable verb={card.verb} tense={card.tense} highlight={card.person} />
        </div>
      )}
    </div>
  );
}

function Summary({ results, review, onExit, onRestart }: { results: Result[]; review?: boolean; onExit(): void; onRestart(c: VerbCard[], review?: boolean): void }) {
  const store = useStore();
  const { settings, verbs, srs } = store;
  const t = useT();
  const first = new Map<string, Result>();
  for (const r of results) if (!first.has(r.card.srsId)) first.set(r.card.srsId, r);
  const firsts = [...first.values()];
  const ok = firsts.filter((r) => r.pass).length;
  const missed = firsts.filter((r) => !r.pass);
  const pct = firsts.length ? Math.round((ok / firsts.length) * 100) : 0;

  const drill = () => onRestart(missed.map((r, k) => ({ ...r.card, key: `${r.card.srsId}#rev${k}` })), true);
  const more = () => {
    const ctx = sessionContext(useStore.getState());
    let cards = buildSession(verbs, settings, srs, ctx.newToday, 'normal', ctx.met, ctx.newVerbsLeft);
    if (!cards.length) cards = buildSession(verbs, settings, srs, 0, 'extra', ctx.met);
    onRestart(cards);
  };

  return (
    <div className="pt-safe mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="card space-y-2 text-center">
        <div className="text-5xl">{pct >= 90 ? '🎉' : pct >= 70 ? '💪' : '📚'}</div>
        <h1 className="text-2xl font-bold">{review ? t.reviewDone : t.sessionDone}</h1>
        <p className="text-slate-500">{t.firstTry(ok, firsts.length, pct)}</p>
      </div>
      {missed.length > 0 && (
        <div className="card space-y-2">
          <div className="label">{t.toReview}</div>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {missed.map((r) => (
              <li key={r.card.key} className="flex items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{promptOf(r.card).main}</span>
                  <span className="text-slate-500"> → {displayAnswer(r.card)}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-500">{r.card.dir === 'inf' ? 'inf.' : promptOf(r.card).tenseLabel}</span>
              </li>
            ))}
          </ul>
          <button className="btn-primary w-full" onClick={drill}>{t.drillAgain(missed.length)}</button>
        </div>
      )}
      <div className="flex gap-2">
        <button className="btn-ghost flex-1" onClick={onExit}>{t.done}</button>
        <button className="btn-ghost flex-1" onClick={more}>{t.keepGoing}</button>
      </div>
    </div>
  );
}
