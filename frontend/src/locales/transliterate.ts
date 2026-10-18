// Uzbek Latin -> Cyrillic transliteration (UI texts and server messages).

const APOSTROPHE = "['ʻ’‘`ʼ]";

const LETTERS: Record<string, string> = {
  "o'": 'ў', "g'": 'ғ', sh: 'ш', ch: 'ч', yo: 'ё', yu: 'ю', ya: 'я', ye: 'е',
  a: 'а', b: 'б', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м',
  n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', x: 'х', y: 'й', z: 'з',
  "'": 'ъ',
};

const LETTER_PATTERN = new RegExp(`o${APOSTROPHE}|g${APOSTROPHE}|sh|ch|yo|yu|ya|ye|[a-z]|${APOSTROPHE}`, 'gi');
const VOWEL = /[aeiouаеиоуўэёюя]/i;

/** Terms with 2+ capitals (ID, PDF, GeoJSON, ArcGIS) and {{placeholders}} are kept as is. */
const KEPT_AS_IS = /\{\{[^}]*\}\}|[A-Za-z]*[A-Z][A-Za-z]*[A-Z][A-Za-z]*/g;

function transliterateChunk(text: string): string {
  return text.replace(LETTER_PATTERN, (match, offset: number, whole: string) => {
    const key = match.toLowerCase().replace(new RegExp(APOSTROPHE), "'");
    let letter = LETTERS[key] ?? match;
    // "e" at the start of a word or after a vowel becomes "э"
    if (key === 'e' && (offset === 0 || !/[a-zʻ'’‘`]/i.test(whole[offset - 1]) || VOWEL.test(whole[offset - 1]))) letter = 'э';
    // the apostrophe (tutuq belgisi) becomes ъ only between letters
    if (key === "'" && !(/[a-z]/i.test(whole[offset - 1] ?? '') && /[a-z]/i.test(whole[offset + 1] ?? ''))) return match;
    if (match === match.toUpperCase() && match !== match.toLowerCase()) return letter.toUpperCase();
    if (match[0] !== match[0].toLowerCase()) return letter[0].toUpperCase() + letter.slice(1);
    return letter;
  });
}

export function latinToCyrillic(text: string): string {
  let result = '';
  let last = 0;
  for (const m of text.matchAll(KEPT_AS_IS)) {
    result += transliterateChunk(text.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  return result + transliterateChunk(text.slice(last));
}

/** Transliterates every string of a (nested) dictionary object. */
export function transliterateDictionary<T>(obj: T): T {
  if (typeof obj === 'string') return latinToCyrillic(obj) as T;
  if (obj && typeof obj === 'object')
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, transliterateDictionary(v)])) as T;
  return obj;
}
