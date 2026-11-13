import { useEffect, useRef, useState } from 'react';
import { exportAll, importAll, resetAll, type Backup } from '../storage/db';
import { useStore, type Settings } from '../store';
import { ChipGroup, Section, Toggle } from './common';
import { TenseChips, WarningSettings } from './PracticeOptions';
import { NumberRow } from '../modes/verbs/VerbSetup';
import { canSpeak, pickVoice, speak, spanishVoices } from './speech';

export function SettingsScreen() {
  const { settings: s, updateSettings, replaceAll, init } = useStore();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

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
    setMsg('Backup downloaded.');
  };

  const doImport = async (f: File) => {
    try {
      const b = JSON.parse(await f.text()) as Backup;
      if (!confirm('Replace all progress on this device with this backup?')) return;
      await importAll(b);
      replaceAll(b.data as Parameters<typeof replaceAll>[0]);
      setMsg('Backup restored.');
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`);
    }
  };

  const current = pickVoice(s.voiceURI);

  return (
    <div className="space-y-4 py-4">
      <h1 className="text-2xl font-bold">Ajustes</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <Section title="Default tenses"><TenseChips /></Section>
          <Section title="Irregular verb warnings"><WarningSettings /></Section>
          <Section title="Answer checking">
            <div className="label">Accents (á, ñ…)</div>
            <ChipGroup<Settings['strictness']>
              multi={false}
              value={[s.strictness]}
              onChange={([v]) => updateSettings({ strictness: v })}
              options={[
                { value: 'strict', label: 'Strict (missing = wrong)' },
                { value: 'lenient', label: 'Lenient (flag it)' },
                { value: 'ignore', label: 'Ignore' },
              ]}
            />
          </Section>
          <Section title="Daily limits">
            <NumberRow label="Cards per session" value={s.sessionLength} min={5} max={100} step={5} onChange={(n) => updateSettings({ sessionLength: n })} />
            <NumberRow label="New cards per day" value={s.newPerDay} min={0} max={100} step={5} onChange={(n) => updateSettings({ newPerDay: n })} />
            <Toggle on={s.includeReflexive} onChange={(v) => updateSettings({ includeReflexive: v })} label="Include reflexive verbs" hint="levantarse, sentarse…" />
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Pronunciation">
            {!canSpeak() ? (
              <p className="text-sm text-slate-500">Text-to-speech isn't available in this browser.</p>
            ) : (
              <>
                <Toggle on={s.ttsAuto} onChange={(v) => updateSettings({ ttsAuto: v })} label="Speak the answer automatically" />
                <div className="label pt-2">Voice</div>
                <select
                  className="input !text-base"
                  value={s.voiceURI ?? ''}
                  onChange={(e) => updateSettings({ voiceURI: e.target.value || null })}
                >
                  <option value="">Auto (prefers es-MX / es-US){current && !s.voiceURI ? `: ${current.name}` : ''}</option>
                  {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                </select>
                {voices.length === 0 && <p className="text-sm text-slate-500">No Spanish voice found. On Android: Settings → Text-to-speech → install Spanish (Mexico or US).</p>}
                <div className="flex items-center gap-3">
                  <span className="text-sm">Speed</span>
                  <input type="range" min={0.6} max={1.2} step={0.05} value={s.speechRate} onChange={(e) => updateSettings({ speechRate: Number(e.target.value) })} className="flex-1 accent-teal-600" />
                  <button className="btn-ghost !px-3 !py-1" onClick={() => speak('¿Qué onda? Me levanto temprano.', { voiceURI: s.voiceURI, rate: s.speechRate })}>Test</button>
                </div>
              </>
            )}
          </Section>

          <Section title="App">
            <Toggle on={s.haptics} onChange={(v) => updateSettings({ haptics: v })} label="Vibrate on answers" />
            <div className="label pt-2">Theme</div>
            <ChipGroup<Settings['theme']>
              multi={false}
              value={[s.theme]}
              onChange={([v]) => updateSettings({ theme: v })}
              options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
            />
          </Section>

          <Section title="Your data">
            <p className="text-sm text-slate-500">Progress is stored only on this device. Export a backup now and then; browsers can clear site data.</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={doExport}>⬇️ Export backup</button>
              <button className="btn-ghost" onClick={() => fileRef.current?.click()}>⬆️ Import backup</button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
              <button
                className="btn-ghost text-rose-600"
                onClick={async () => { if (confirm('Erase ALL progress, settings and requests on this device?')) { await resetAll(); await init(); setMsg('Everything reset.'); } }}
              >
                Reset everything
              </button>
            </div>
            {msg && <p className="text-sm text-teal-700 dark:text-teal-400">{msg}</p>}
          </Section>

          <p className="px-1 text-xs text-slate-400">
            Práctica v{__APP_VERSION__} · Español latinoamericano (sin vosotros). Conjugations checked against Fred Jehle's verb database (CC BY-NC-SA).
          </p>
        </div>
      </div>
    </div>
  );
}
