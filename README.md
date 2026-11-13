# Práctica

A Latin American Spanish practice app for Android phones (built for the Galaxy Fold). It installs as a home-screen app, works offline, and keeps your progress on the device.

**Verb mode**
- Four card types: EN→ES ("we will eat" → *comeremos*), ES→EN, infinitives (to remember ↔ *recordar*) and recognition (*fuimos* → ir · pretérito · nosotros).
- 13 tenses, toggleable: indicative, subjunctive, commands, gerund and participle. No vosotros.
- Three answer styles: typed (with an accent key bar and lenient accent checking), flip-and-grade, or multiple choice.
- Irregular-verb warnings at three levels (🟡 spelling, 🟠 stem change, 🔴 irregular), each switchable. After answering you see what the regular pattern would have given, and why.
- Spaced repetition with a daily new-card limit; mistakes are re-queued and can be drilled again at the end.
- About 315 verbs in 13 categories, with LatAm usage notes. Pronunciation uses an es-MX/es-US voice.
- Stats, a streak counter and backup export/import.
- Two-pane layout when the Fold is open.

**Adding verbs:** in the app, open Verbos → Pedidos, type "to wander" or a category, then tap *Copy or share* and paste the text into a Claude Code session in this folder. See `CLAUDE.md` for the full workflow.

## Install on the phone
1. Open the GitHub Pages URL in Chrome on the phone.
2. Choose ⋮ → **Add to Home screen** (or **Install app**).
3. For pronunciation, install a Spanish (Mexico or US) voice: Settings → Accessibility → Text-to-speech.

## Develop
```
npm install
npm run dev      # also reachable from the phone on your Wi-Fi at http://<pc-ip>:5173
npm test
npm run build
```

Conjugations are validated against Fred Jehle's Conjugated Spanish Verb Database (CC BY-NC-SA 3.0), which is used as a test fixture only.
