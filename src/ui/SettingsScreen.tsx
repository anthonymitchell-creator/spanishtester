import { useEffect, useRef, useState } from 'react';
import { exportAll, importAll, resetAll, type Backup } from '../storage/db';
import { useStore, type Settings } from '../store';
import { ChipGroup, Section, Toggle } from './common';
import { TenseChips, WarningSettings } from './PracticeOptions';
import { NumberRow } from '../modes/verbs/VerbSetup';
import { canSpeak, pickVoice, speak, spanishVoices } from './speech';
import { useT } from './i18n';

export function SettingsScreen() {
  const { settings: s, updateSettings, replaceAll, init } = useStore();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const t = useT();

  useEffect(() => {
    if (!canSpeak()) return;
    const load = () => setVoices(spanishVoices());
    load();
    speechSynthesis.addEventListener('voiceschanged', load);
    return () => speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const doExport = async () => {
    const b = await exportAll();
    const blob = new Blob([JSON.stringify(b, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `practica-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg(t.backupDownloaded);
  };

  const doImport = async (f: File) => {
    try {
      const b = JSON.parse(await f.text()) as Backup;
      if (!confirm(t.importConfirm)) return;
      await importAll(b);
      replaceAll(b.data as Parameters<typeof replaceAll>[0]);
      setMsg(t.backupRestored);
    } catch (e) {
      setMsg(t.importFailed((e as Error).message));
    }
  };

  const current = pickVoice(s.voiceURI);

  return (
    <div className="space-y-4 py-4">
      <h1 className="text-2xl font-bold">{t.settings}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <Section title={t.language}>
            <ChipGroup<Settings['uiLang']>
              multi={false}
              value={[s.uiLang]}
              onChange={([v]) => updateSettings({ uiLang: v })}
              options={[{ value: 'en', label: 'English' }, { value: 'es', label: 'Español' }]}
            />
          </Section>
          <Section title={t.defaultTenses}><TenseChips /></Section>
          <Section title={t.irregularWarnings}><WarningSettings /></Section>
          <Section title={t.answerChecking}>
            <div className="label">{t.accents}</div>
            <ChipGroup<Settings['strictness']>
              multi={false}
              value={[s.strictness]}
              onChange={([v]) => updateSettings({ strictness: v })}
              options={[
                { value: 'strict', label: t.strict },
                { value: 'lenient', label: t.lenient },
                { value: 'ignore', label: t.ignore },
              ]}
            />
          </Section>
          <Section title={t.dailyLimits}>
            <NumberRow label={t.cardsPerSession} value={s.sessionLength} min={5} max={100} step={5} onChange={(n) => updateSettings({ sessionLength: n })} />
            <NumberRow label={t.newPerDay} value={s.newPerDay} min={0} max={100} step={5} onChange={(n) => updateSettings({ newPerDay: n })} />
            <Toggle on={s.includeReflexive} onChange={(v) => updateSettings({ includeReflexive: v })} label={t.includeReflexive} hint="levantarse, sentarse…" />
          </Section>
        </div>

        <div className="space-y-4">
          <Section title={t.pronunciation}>
            {!canSpeak() ? (
              <p className="text-sm text-slate-500">{t.noTts}</p>
            ) : (
              <>
                <Toggle on={s.ttsAuto} onChange={(v) => updateSettings({ ttsAuto: v })} label={t.autoSpeak} />
                <div className="label pt-2">{t.voice}</div>
                <select
                  className="input !text-base"
                  value={s.voiceURI ?? ''}
                  onChange={(e) => updateSettings({ voiceURI: e.target.value || null })}
                >
                  <option value="">{t.autoVoice}{current && !s.voiceURI ? `: ${current.name}` : ''}</option>
                  {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                </select>
                {voices.length === 0 && <p className="text-sm text-slate-500">{t.noVoice}</p>}
                <div className="flex items-center gap-3">
                  <span className="text-sm">{t.speed}</span>
                  <input type="range" min={0.6} max={1.2} step={0.05} value={s.speechRate} onChange={(e) => updateSettings({ speechRate: Number(e.target.value) })} className="flex-1 accent-teal-600" />
                  <button className="btn-ghost !px-3 !py-1" onClick={() => speak('¿Qué onda? Me levanto temprano.', { voiceURI: s.voiceURI, rate: s.speechRate })}>{t.test}</button>
                </div>
              </>
            )}
          </Section>

          <Section title={t.app}>
            <Toggle on={s.haptics} onChange={(v) => updateSettings({ haptics: v })} label={t.vibrate} />
            <div className="label pt-2">{t.theme}</div>
            <ChipGroup<Settings['theme']>
              multi={false}
              value={[s.theme]}
              onChange={([v]) => updateSettings({ theme: v })}
              options={[{ value: 'system', label: t.themeSystem }, { value: 'light', label: t.themeLight }, { value: 'dark', label: t.themeDark }]}
            />
          </Section>

          <Section title={t.yourData}>
            <p className="text-sm text-slate-500">{t.dataHint}</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={doExport}>{t.exportBackup}</button>
              <button className="btn-ghost" onClick={() => fileRef.current?.click()}>{t.importBackup}</button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
              <button
                className="btn-ghost text-rose-600"
                onClick={async () => { if (confirm(t.resetConfirm)) { await resetAll(); await init(); setMsg(t.everythingReset); } }}
              >
                {t.resetAll}
              </button>
            </div>
            {msg && <p className="text-sm text-teal-700 dark:text-teal-400">{msg}</p>}
          </Section>

          <p className="px-1 text-xs text-slate-400">
            Práctica v{__APP_VERSION__} · {t.footer}
          </p>
        </div>
      </div>
    </div>
  );
}
