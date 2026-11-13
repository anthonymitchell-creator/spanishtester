// Dev tool: print full conjugation tables. Usage: npx vite-node scripts/show.ts reunirse impedir
import { conjugate } from '../src/engine/conjugate';
import { levelOf } from '../src/engine/classify';
import verbs from '../src/data/verbs.json';
import type { Person, VerbEntry } from '../src/engine/types';
const mark = { regular: '', spelling: '¹', stem: '²', irregular: '³' } as const;
for (const inf of process.argv.slice(2)) {
  const e = (verbs as VerbEntry[]).find((v) => v.inf === inf) ?? { inf };
  const t = conjugate(e);
  console.log(`\n== ${inf}`);
  for (const k of ['pres', 'pret', 'impf', 'fut', 'subj', 'impsubj', 'imp', 'impneg'] as const)
    console.log(k.padEnd(8), t[k].map((f, i) => (f ?? '-') + mark[levelOf(e, k, i as Person)]).join(', '));
  console.log('ger/part', t.ger, t.part, '| perf', t.perf[2]);
}
