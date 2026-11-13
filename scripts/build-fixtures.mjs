// Converts the Fred Jehle verb database CSV (reference-data/, CC BY-NC-SA 3.0,
// https://github.com/ghidinelli/fred-jehle-spanish-verbs) into a compact test fixture.
// Used ONLY to validate the conjugation engine in tests; it is not shipped in the app.
// vosotros forms are dropped (LatAm Spanish).
//
// Usage: node scripts/build-fixtures.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'reference-data', 'jehle_verb_database.csv');
const out = path.join(root, 'tests', 'fixtures', 'jehle.json');

function parseCsv(t) {
  const rows = [];
  let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

const MAP = {
  'Indicativo|Presente': 'pres',
  'Indicativo|Pretérito': 'pret',
  'Indicativo|Imperfecto': 'impf',
  'Indicativo|Futuro': 'fut',
  'Indicativo|Condicional': 'cond',
  'Indicativo|Pretérito perfecto': 'perf',
  'Indicativo|Pluscuamperfecto': 'plup',
  'Subjuntivo|Presente': 'subj',
  'Subjuntivo|Imperfecto': 'impsubj',
  'Imperativo Afirmativo|Presente': 'imp',
  'Imperativo Negativo|Presente': 'impneg',
};

const rows = parseCsv(fs.readFileSync(src, 'utf8'));
rows.shift();
const db = {};
for (const r of rows) {
  if (r.length < 16) continue;
  const key = MAP[`${r[2]}|${r[4]}`];
  if (!key) continue;
  const inf = r[0];
  db[inf] ??= {};
  const forms = [r[7], r[8], r[9], r[10], r[12]].map((x) => (x.trim() === '' ? null : x.trim()));
  db[inf][key] = forms;
  db[inf].ger = r[13].trim();
  db[inf].part = r[15].trim();
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(db));
console.log(`Wrote ${Object.keys(db).length} verbs to ${path.relative(root, out)}`);
