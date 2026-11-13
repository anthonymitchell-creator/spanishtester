// Dev tool: compare the engine's output for verbs against the reference fixture,
// and suggest pattern tags that make a verb match.
// Usage: npx vite-node scripts/check-verb.ts tener pedir levantarse
//        npx vite-node scripts/check-verb.ts --all      (every verb in verbs.json)
import fs from 'node:fs';
import { conjugate } from '../src/engine/conjugate';
import type { PatternTag, Table, VerbEntry } from '../src/engine/types';
import verbs from '../src/data/verbs.json';

const ref: Record<string, Partial<Table>> = JSON.parse(fs.readFileSync('tests/fixtures/jehle.json', 'utf8'));
const catalogue = verbs as VerbEntry[];

const KEYS = ['pres', 'pret', 'impf', 'fut', 'cond', 'perf', 'plup', 'subj', 'impsubj', 'imp', 'impneg', 'ger', 'part'] as const;
const TAGSETS: PatternTag[][] = [[], ['e-ie'], ['o-ue'], ['e-i'], ['u-ue'], ['zc'], ['accent'], ['i-ie']];

function diff(entry: Pick<VerbEntry, 'inf' | 'tags' | 'base' | 'over'>): string[] {
  const r = ref[entry.inf];
  if (!r) return ['(not in reference)'];
  const t = conjugate(entry);
  const out: string[] = [];
  for (const k of KEYS) {
    const want = r[k as keyof Table];
    const got = t[k as keyof Table];
    if (want == null) continue;
    if (Array.isArray(want)) {
      want.forEach((w, i) => {
        const g = (got as (string | null)[])[i];
        if (w != null && g != null && w !== g) out.push(`${k}[${i}] want ${w} got ${g}`);
      });
    } else if (want !== got) out.push(`${k} want ${want} got ${got}`);
  }
  return out;
}

const args = process.argv.slice(2);
const list = args[0] === '--all' ? catalogue.map((v) => v.inf) : args;
let bad = 0;
for (const inf of list) {
  const entry = catalogue.find((v) => v.inf === inf) ?? { inf };
  const d = diff(entry);
  if (d.length === 0) { if (args[0] !== '--all') console.log(`✓ ${inf}`); continue; }
  if (d[0] === '(not in reference)') { console.log(`? ${inf} not in reference`); continue; }
  bad++;
  console.log(`✗ ${inf} [tags: ${(entry as VerbEntry).tags?.join(',') ?? ''}]`);
  d.slice(0, 8).forEach((x) => console.log('   ' + x));
  const fix = TAGSETS.find((ts) => diff({ ...entry, tags: ts }).length === 0);
  if (fix) console.log(`   → suggested tags: [${fix.join(', ')}]`);
}
if (args[0] === '--all') console.log(`${list.length - bad}/${list.length} verbs match or are unreferenced`);
