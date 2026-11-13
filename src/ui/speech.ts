// Text-to-speech with a Latin American Spanish voice where available.

const PREFERRED = ['es-MX', 'es-US', 'es-419', 'es-CO', 'es-AR', 'es-CL', 'es-PE'];

export function spanishVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'));
}

export function pickVoice(uri: string | null): SpeechSynthesisVoice | undefined {
  const vs = spanishVoices();
  if (uri) {
    const v = vs.find((x) => x.voiceURI === uri);
    if (v) return v;
  }
  for (const lang of PREFERRED) {
    const v = vs.find((x) => x.lang.replace('_', '-').toLowerCase() === lang.toLowerCase());
    if (v) return v;
  }
  return vs.find((x) => !/es-ES/i.test(x.lang)) ?? vs[0];
}

export function speak(text: string, opts: { voiceURI: string | null; rate: number }) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(opts.voiceURI);
  if (v) u.voice = v;
  u.lang = v?.lang ?? 'es-MX';
  u.rate = opts.rate;
  speechSynthesis.speak(u);
}

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
