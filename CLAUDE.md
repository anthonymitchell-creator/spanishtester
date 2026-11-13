# Práctica: Spanish practice PWA

Installable web app (React + TS + Vite + Tailwind, `vite-plugin-pwa`) for practising **Latin American Spanish** on Android (Galaxy Fold). Hosted on GitHub Pages; pushing to `main` runs the tests and redeploys (`.github/workflows/deploy.yml`). All user progress lives on the device (IndexedDB).

## Localisation rules (always)
- **No vosotros** anywhere. Persons: yo, tú, él/ella/usted, nosotros, ellos/ellas/ustedes.
- Prefer the LatAm word: manejar (not conducir) for driving, enojarse (not enfadarse), extrañar, apurarse, estacionar, rentar/alquilar, platicar (MX/CA), tomar for drinks. Never add peninsular-only or vulgar-in-LatAm verbs (e.g. **coger**).
- Imperfect subjunctive uses **-ra** forms. Spelling follows RAE 2010 (hui, guio, rio, crie: no accent on monosyllables).
- Put a short `note` on the verb when usage differs by region (e.g. "LatAm (Spain: aparcar).").

## Adding verbs (the main ongoing task)
The user collects requests on the phone (Verbos → Pedidos) and pastes text like this:
```
Add these verbs (English → please confirm the LatAm Spanish verb):
- to wander
Suggest verbs for these categories:
- verbs for cooking
Verbs I added on my phone (please verify and add to verbs.json):
- deambular = to wander [cat: travel; tags: none]
```
Procedure:
1. **Single English verb** → propose the most common LatAm verb and name alternatives with nuance ("to wander → deambular; also vagar, pasear (to stroll)"). **Category** → propose 8–15 useful verbs, skipping ones already in `src/data/verbs.json`. **Wait for the user to confirm** before editing.
2. Append entries to `src/data/verbs.json` (one per line). Schema (`VerbEntry` in `src/engine/types.ts`):
   - `inf` (with `se` if reflexive), `en` (glosses, primary first, each starting `"to "`; the first word gets conjugated, so "to look for" → "he looks for"; `one's`/`oneself` become my/myself etc.), `cat` (ids from `src/data/categories.json`; add a new category there if needed), `added: "YYYY-MM-DD"` (today; new verbs are introduced first).
   - `tags` for **stem changes only**: `e-ie`, `o-ue`, `u-ue`, `e-i`, `i-ie`, `accent` (envío/continúo/reúno), `zc` (conozco). Spelling changes (c→qu, g→gu, z→c, g→j, gu→g, c→z, -uir → y, leer → leyó, -ducir) are automatic; don't tag them.
   - `base` for compounds of irregular verbs: mantener → `tener`, suponer → `poner`, sonreír → `reír`, devolver → `volver`, atraer → `traer`, prevenir → `venir`, descubrir → `cubrir`.
   - A truly irregular new base goes in `src/engine/irregulars.ts` (only the parts that differ). One-off overrides go in the verb's `over` field.
   - `enx` overrides English parts of the first gloss word if the auto rules get it wrong (`{ "past": "...", "pp": "..." }`); irregular English verbs are listed in `src/engine/english.ts`.
   - `persons` for verbs that only make sense in some persons (llover → `[2]`, doler/costar → `[2,4]`).
3. Verify:
   - `npx vite-node scripts/check-verb.ts <inf> ...` compares with the Jehle reference fixture (if the verb is in it) and **suggests tags**.
   - `npx vite-node scripts/show.ts <inf> ...` prints the full table with irregularity marks (¹ spelling, ² stem, ³ irregular). Eyeball verbs not in the reference.
   - `npm test`: must pass (catalogue schema, reference conjugations, every card's displayed answer is accepted, multiple-choice sanity).
4. Commit and push to `main` (only when the user says to). The Pages deploy takes about 1 minute; the phone picks up the new version on its next launch (service worker auto-update). Verbs the user added on the phone are dropped from on-device storage automatically once they're in the bundled catalogue.

## Learning flow
- A verb the learner hasn't met (not in `introduced` and no SRS entries) gets a mini-lesson (`src/modes/verbs/IntroLesson.tsx`) the first time one of its cards comes up: meet (stem + ending), then per enabled tense (max 3) a pattern table (`src/engine/segment.ts` splits forms into pronoun/stem/ending) and a drill (pick the ending → type the form, with hint). Capped by `newVerbsPerDay` (default 5). Typed answers have a Hint (reveals the stem; a hinted pass is graded "hard").
- Newly added verbs (`added` date) are introduced first.

## Layout
- `src/engine/`: pure TS, no React. `conjugate.ts` (rule engine with layered rules: naive → ortho → tags → irregular), `classify.ts` (irregularity level by comparing layers; explanations), `english.ts` (English prompts and accepted answers), `match.ts` (answer checking), `irregulars.ts`, `text.ts` (accents/stress/enclitics).
- `src/modes/verbs/`: `cards.ts` (session building, prompts, answers, choices), `VerbSession.tsx`, `VerbSetup.tsx`.
- `src/modes/registry.ts`: list of practice modes. Future modes (nouns: gender/plural; sentences; listening) should reuse the store's SRS (`record()` with a mode-prefixed `srsId`), stats and settings.
- `src/store.ts`: Zustand store persisted to IndexedDB (`src/storage/db.ts`). `src/srs/scheduler.ts`: SM-2-style scheduling.
- `tests/fixtures/jehle.json`: built from Fred Jehle's verb DB (CC BY-NC-SA 3.0) with `node scripts/build-fixtures.mjs` (needs `reference-data/jehle_verb_database.csv`, git-ignored). Test fixture only; never ship it in the app.

## Commands
`npm run dev` (LAN-accessible, open on the phone at http://<pc-ip>:5173) · `npm test` · `npm run build` · `npm run preview`
