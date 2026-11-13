import { useMemo, useState } from 'react';
import { analyze, verbLevel } from '../engine/classify';
import { KNOWN_COMPOUNDS } from '../engine/irregulars';
import { splitReflexive } from '../engine/conjugate';
import { fold } from '../engine/text';
import type { PatternTag, VerbEntry } from '../engine/types';
import { CATEGORIES, CATEGORY_BY_ID, isBundled } from '../data/catalogue';
import { useStore, type VerbRequest } from '../store';
import { ChipGroup, FullTable, Legend, LevelBadge, Section, SpeakButton, TenseTable } from './common';

export function VerbsScreen() {
  const [tab, setTab] = useState<'list' | 'requests'>('list');
  const requests = useStore((s) => s.requests);
  return (
    <div className="space-y-4 py-4">
      <div className="flex gap-2">
        <button className={tab === 'list' ? 'chip-on' : 'chip-off'} onClick={() => setTab('list')}>📚 Catálogo</button>
        <button className={tab === 'requests' ? 'chip-on' : 'chip-off'} onClick={() => setTab('requests')}>
          📮 Pedidos {requests.length > 0 && <span className="ml-1 rounded-full bg-rose-600 px-1.5 text-xs text-white">{requests.length}</span>}
        </button>
      </div>
      {tab === 'list' ? <Catalogue /> : <Requests />}
    </div>
  );
}

function Catalogue() {
  const verbs = useStore((s) => s.verbs);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string[]>([]);
  const [open, setOpen] = useState<VerbEntry | null>(null);
  const [adding, setAdding] = useState(false);

  const list = useMemo(() => {
    const nq = fold(q.trim().toLowerCase());
    return verbs.filter((v) => {
      if (cat.length && !v.cat.some((c) => cat.includes(c))) return false;
      if (!nq) return true;
      return fold(v.inf).includes(nq) || v.en.some((g) => g.toLowerCase().includes(nq));
    });
  }, [verbs, q, cat]);

  if (open) return <VerbDetail verb={open} onClose={() => setOpen(null)} />;
  if (adding) return <AddVerb onClose={() => setAdding(false)} />;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className="input" placeholder="Search Spanish or English…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary shrink-0" onClick={() => setAdding(true)}>＋</button>
      </div>
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2 pb-1">
          {CATEGORIES.map((c) => (
            <button key={c.id} className={cat.includes(c.id) ? 'chip-on' : 'chip-off'} onClick={() => setCat(cat.includes(c.id) ? cat.filter((x) => x !== c.id) : [...cat, c.id])}>
              {c.icon} {c.es}
            </button>
          ))}
        </div>
      </div>
      <div className="text-sm text-slate-500">{list.length} verbs</div>
      <ul className="card divide-y divide-slate-200 !p-0 dark:divide-slate-800">
        {list.map((v) => (
          <li key={v.inf}>
            <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={() => setOpen(v)}>
              <span className="min-w-0">
                <span className="font-medium">{v.inf}</span>
                {v.unverified && <span className="ml-1 text-xs text-amber-600">⚠ unverified</span>}
                <span className="block truncate text-sm text-slate-500">{v.en.join(', ')}</span>
              </span>
              <LevelBadge level={verbLevel(v)} small />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VerbDetail({ verb, onClose }: { verb: VerbEntry; onClose(): void }) {
  const removeCustomVerb = useStore((s) => s.removeCustomVerb);
  const t = analyze(verb).table;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button className="btn-ghost !px-3 !py-2" onClick={onClose}>←</button>
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <h1 className="text-2xl font-bold">{verb.inf}</h1>
            <SpeakButton text={verb.inf} />
          </div>
          <div className="text-slate-500">{verb.en.join(', ')}</div>
        </div>
        <LevelBadge level={verbLevel(verb)} />
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {verb.cat.map((c) => <span key={c} className="chip-off">{CATEGORY_BY_ID[c]?.icon} {CATEGORY_BY_ID[c]?.es ?? c}</span>)}
        <span className="chip-off">gerundio: {t.ger}</span>
        <span className="chip-off">participio: {t.part}</span>
      </div>
      {verb.note && <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">💡 {verb.note}</div>}
      {verb.unverified && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Added on this device and not yet verified. It's included when you copy your requests, so it can be checked in a Claude Code session.
        </div>
      )}
      <Legend />
      <div className="card">
        <FullTable verb={verb} tenses={['pres', 'pret', 'impf', 'fut', 'cond', 'perf', 'plup', 'subj', 'impsubj', 'imp', 'impneg']} />
      </div>
      {!isBundled(verb.inf) && (
        <button className="btn-ghost w-full text-rose-600" onClick={() => { if (confirm(`Remove ${verb.inf}?`)) { removeCustomVerb(verb.inf); onClose(); } }}>
          Remove this verb
        </button>
      )}
    </div>
  );
}

const STEM_OPTIONS: { value: PatternTag | 'none'; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'e-ie', label: 'e → ie' },
  { value: 'o-ue', label: 'o → ue' },
  { value: 'e-i', label: 'e → i' },
  { value: 'u-ue', label: 'u → ue' },
];

function AddVerb({ onClose }: { onClose(): void }) {
  const { addCustomVerb, verbs } = useStore();
  const [inf, setInf] = useState('');
  const [en, setEn] = useState('');
  const [cats, setCats] = useState<string[]>([]);
  const [stem, setStem] = useState<PatternTag | 'none'>('none');
  const [zc, setZc] = useState<boolean | null>(null);
  const [accent, setAccent] = useState(false);

  const clean = inf.trim().toLowerCase();
  const valid = /^[a-záéíóúüñ]+(ar|er|ir|ír)(se)?$/.test(clean);
  const core = splitReflexive(clean).core;
  const zcAuto = /[aeiou]c(er|ir)$/.test(core) && !/(hacer|decir|cocer|mecer)$/.test(core);
  const useZc = zc ?? zcAuto;
  const base = KNOWN_COMPOUNDS[core];
  const exists = verbs.some((v) => v.inf === clean);

  const entry: VerbEntry | null = valid
    ? {
        inf: clean,
        en: en.split(/[,;]/).map((g) => g.trim()).filter(Boolean).map((g) => (g.startsWith('to ') ? g : `to ${g}`)),
        cat: cats,
        tags: [...(stem !== 'none' ? [stem] : []), ...(useZc ? (['zc'] as PatternTag[]) : []), ...(accent ? (['accent'] as PatternTag[]) : [])],
        ...(base ? { base } : {}),
        added: new Date().toISOString().slice(0, 10),
        unverified: true,
      }
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button className="btn-ghost !px-3 !py-2" onClick={onClose}>←</button>
        <h1 className="text-2xl font-bold">Add a verb</h1>
      </div>
      <p className="text-sm text-slate-500">
        Quick add on the phone. It's marked <em>unverified</em> until it's checked in a Claude Code session. To ask for a verb you don't know yet, use <b>Pedidos</b> instead.
      </p>
      <Section title="Verb">
        <input className="input" placeholder="infinitive, e.g. deambular" value={inf} onChange={(e) => setInf(e.target.value)} autoCapitalize="none" lang="es" />
        <input className="input" placeholder="English, e.g. to wander, to roam" value={en} onChange={(e) => setEn(e.target.value)} />
        {exists && <p className="text-sm text-amber-600">That verb is already in your catalogue.</p>}
      </Section>
      <Section title="Pattern (if you know it)">
        <div className="label">Stem change</div>
        <ChipGroup multi={false} value={[stem]} onChange={([v]) => setStem(v)} options={STEM_OPTIONS} />
        <label className="flex items-center gap-2"><input type="checkbox" checked={useZc} onChange={(e) => setZc(e.target.checked)} /> yo form in -zco (conozco)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={accent} onChange={(e) => setAccent(e.target.checked)} /> stressed í/ú (envío, continúo)</label>
        {base && <p className="text-sm text-slate-500">Conjugated like <b>{base}</b>.</p>}
      </Section>
      <Section title="Categories">
        <ChipGroup value={cats} onChange={setCats} options={CATEGORIES.map((c) => ({ value: c.id, label: `${c.icon} ${c.es}` }))} />
      </Section>
      {entry && (
        <Section title="Preview">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><div className="mb-1 text-sm font-medium">Presente</div><TenseTable verb={entry} tense="pres" /></div>
            <div><div className="mb-1 text-sm font-medium">Pretérito</div><TenseTable verb={entry} tense="pret" /></div>
          </div>
        </Section>
      )}
      <button
        className="btn-primary w-full"
        disabled={!entry || !entry.en.length || exists}
        onClick={() => { if (entry) { addCustomVerb({ ...entry, cat: entry.cat.length ? entry.cat : ['basics'] }); onClose(); } }}
      >
        Add to my verbs
      </button>
    </div>
  );
}

export function requestsText(requests: VerbRequest[], custom: VerbEntry[]): string {
  const verbsR = requests.filter((r) => r.kind === 'verb');
  const cats = requests.filter((r) => r.kind === 'category');
  const lines = [`Práctica: verb requests (${new Date().toISOString().slice(0, 10)})`, ''];
  if (verbsR.length) lines.push('Add these verbs (English → please confirm the LatAm Spanish verb):', ...verbsR.map((r) => `- ${r.text}`), '');
  if (cats.length) lines.push('Suggest verbs for these categories:', ...cats.map((r) => `- ${r.text}`), '');
  const unv = custom.filter((v) => v.unverified);
  if (unv.length) {
    lines.push('Verbs I added on my phone (please verify and add to verbs.json):');
    for (const v of unv) lines.push(`- ${v.inf} = ${v.en.join(', ')} [cat: ${v.cat.join(',')}; tags: ${(v.tags ?? []).join(',') || 'none'}${v.base ? `; base: ${v.base}` : ''}]`);
  }
  return lines.join('\n').trim();
}

function Requests() {
  const { requests, addRequest, removeRequest, clearRequests, customVerbs } = useStore();
  const [kind, setKind] = useState<VerbRequest['kind']>('verb');
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const unverified = customVerbs.filter((v) => v.unverified);
  const body = requestsText(requests, customVerbs);
  const hasAny = requests.length > 0 || unverified.length > 0;

  const copy = async () => {
    try {
      if (navigator.share && /Android/i.test(navigator.userAgent)) {
        await navigator.share({ title: 'Práctica verb requests', text: body });
      } else {
        await navigator.clipboard.writeText(body);
      }
      setCopied(true);
    } catch {
      try { await navigator.clipboard.writeText(body); setCopied(true); } catch { /* ignore */ }
    }
  };

  return (
    <div className="space-y-4">
      <Section title="New request">
        <ChipGroup
          multi={false}
          value={[kind]}
          onChange={([v]) => setKind(v)}
          options={[{ value: 'verb', label: '🔤 A verb (in English)' }, { value: 'category', label: '🗂️ A category' }]}
        />
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); addRequest(kind, text); setText(''); setCopied(false); }}>
          <input
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={kind === 'verb' ? 'e.g. to wander' : 'e.g. verbs for cooking'}
          />
          <button className="btn-primary shrink-0" disabled={!text.trim()}>Add</button>
        </form>
      </Section>

      <Section title={`Queue (${requests.length})`} right={requests.length > 0 && <button className="text-sm text-rose-600" onClick={() => confirm('Clear all requests?') && clearRequests()}>Clear</button>}>
        {requests.length === 0 && <p className="text-sm text-slate-500">Nothing queued. Add requests as you think of them.</p>}
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {requests.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2">
              <span>{r.kind === 'verb' ? '🔤' : '🗂️'} {r.text}</span>
              <button className="px-2 text-slate-400" onClick={() => removeRequest(r.id)} aria-label="Remove">✕</button>
            </li>
          ))}
        </ul>
        {unverified.length > 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-400">+ {unverified.length} verb(s) added on this device will be included for verification.</p>
        )}
      </Section>

      {hasAny && (
        <Section title="Send to Claude">
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800">{body}</pre>
          <button className="btn-primary w-full" onClick={copy}>{copied ? '✓ Copied / shared' : '📋 Copy or share requests'}</button>
          <p className="text-sm text-slate-500">
            Paste this into a Claude Code session in the <code>Spanish Tool</code> project. Claude confirms each verb, adds it, runs the checks and redeploys. New verbs arrive the next time you open the app. Clear the queue once they've been handled.
          </p>
        </Section>
      )}
    </div>
  );
}
