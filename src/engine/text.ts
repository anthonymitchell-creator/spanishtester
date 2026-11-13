// Spanish orthography helpers: accents, syllable nuclei and stress.

const ACCENT_MAP: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u' };
const ADD_ACCENT: Record<string, string> = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' };

export function stripAccents(s: string): string {
  return s.replace(/[áéíóúü]/g, (c) => ACCENT_MAP[c]);
}

/** Strip accents AND ñ → n (for lenient answer comparison). */
export function fold(s: string): string {
  return stripAccents(s).replace(/ñ/g, 'n');
}

export function accentChar(c: string): string {
  return ADD_ACCENT[c] ?? c;
}

const VOWELS = 'aeiouáéíóúü';
const STRONG = 'aeoáéóíú'; // accented weak vowels behave as strong (hiatus)

function isVowelAt(w: string, i: number): boolean {
  const c = w[i];
  if (!VOWELS.includes(c)) {
    return c === 'y' && i === w.length - 1 && i > 0 && VOWELS.includes(w[i - 1]);
  }
  // silent u in que/qui/gue/gui
  if (c === 'u' && i > 0 && (w[i - 1] === 'q' || w[i - 1] === 'g') && i + 1 < w.length && 'eiéí'.includes(w[i + 1])) {
    return false;
  }
  return true;
}

/** Syllable nuclei as arrays of character indexes. */
export function nuclei(w: string): number[][] {
  const res: number[][] = [];
  let i = 0;
  while (i < w.length) {
    if (!isVowelAt(w, i)) { i++; continue; }
    const group: number[] = [];
    let j = i;
    while (j < w.length && isVowelAt(w, j)) { group.push(j); j++; }
    let cur = [group[0]];
    for (let k = 1; k < group.length; k++) {
      const a = w[group[k - 1]], b = w[group[k]];
      if (STRONG.includes(a) && STRONG.includes(b)) { res.push(cur); cur = [group[k]]; }
      else cur.push(group[k]);
    }
    res.push(cur);
    i = j;
  }
  return res;
}

/** Index of the stressed nucleus. */
export function stressIndex(w: string): number {
  const ns = nuclei(w);
  for (let k = 0; k < ns.length; k++) if (ns[k].some((i) => 'áéíóú'.includes(w[i]))) return k;
  if (ns.length <= 1) return 0;
  return /[aeiouns]$/.test(w) ? ns.length - 2 : ns.length - 1;
}

/** Put a written accent on nucleus k (on its strong vowel, else its last vowel). */
export function accentNucleus(w: string, k: number): string {
  const ns = nuclei(w);
  const n = ns[k];
  if (!n || n.some((i) => 'áéíóú'.includes(w[i]))) return w;
  const pos = n.find((i) => 'aeo'.includes(w[i])) ?? n[n.length - 1];
  return w.slice(0, pos) + accentChar(w[pos]) + w.slice(pos + 1);
}

/** Accent the last vowel of a stem (habla → hablá, for -ramos). */
export function accentLastVowel(s: string): string {
  for (let i = s.length - 1; i >= 0; i--) {
    if ('aeiou'.includes(s[i])) return s.slice(0, i) + accentChar(s[i]) + s.slice(i + 1);
    if ('áéíóú'.includes(s[i])) return s;
  }
  return s;
}

/** Attach enclitic pronoun(s), keeping the stress where it was (levanta + te → levántate). */
export function attachEnclitic(base: string, clitic: string): string {
  const k = stressIndex(base);
  const b = base.replace(/[áéó]/g, (c) => ACCENT_MAP[c]);
  const w = b + clitic;
  return stressIndex(w) === k ? w : accentNucleus(w, k);
}

/** Prepend a prefix; a monosyllable ending in vowel/n/s gains an accent (ten → mantén, rio → sonrió). */
export function prefixForm(prefix: string, form: string): string {
  if (!prefix) return form;
  const ns = nuclei(form);
  if (/[aeiouáéíóú]/.test(prefix) && ns.length === 1 && /[aeiouns]$/.test(form) && !/[áéíóú]/.test(form)) {
    return prefix + accentNucleus(form, 0);
  }
  return prefix + form;
}
