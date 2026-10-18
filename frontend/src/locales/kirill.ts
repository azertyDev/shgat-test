// O'zbek lotin yozuvidan kirill yozuviga o'girish (interfeys matnlari va server xabarlari uchun).

const TUTUQ = "['ʻ’‘`ʼ]";

const HARFLAR: Record<string, string> = {
  "o'": 'ў', "g'": 'ғ', sh: 'ш', ch: 'ч', yo: 'ё', yu: 'ю', ya: 'я', ye: 'е',
  a: 'а', b: 'б', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м',
  n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', x: 'х', y: 'й', z: 'з',
  "'": 'ъ',
};

const BOGIN = new RegExp(`o${TUTUQ}|g${TUTUQ}|sh|ch|yo|yu|ya|ye|[a-z]|${TUTUQ}`, 'gi');
const UNLI = /[aeiouаеиоуўэёюя]/i;

/** ID, PDF, GeoJSON, ArcGIS kabi atamalar (2+ katta harf) va {{o'zgaruvchi}}lar o'girilmaydi. */
const SAQLANADI = /\{\{[^}]*\}\}|[A-Za-z]*[A-Z][A-Za-z]*[A-Z][A-Za-z]*/g;

function soz(matn: string): string {
  return matn.replace(BOGIN, (b, offset: number, butun: string) => {
    const kalit = b.toLowerCase().replace(new RegExp(TUTUQ), "'");
    let k = HARFLAR[kalit] ?? b;
    // so'z boshida yoki unlidan keyin "e" → "э"
    if (kalit === 'e' && (offset === 0 || !/[a-zʻ'’‘`]/i.test(butun[offset - 1]) || UNLI.test(butun[offset - 1]))) k = 'э';
    // tutuq belgisi faqat harflar orasida ъ bo'ladi
    if (kalit === "'" && !(/[a-z]/i.test(butun[offset - 1] ?? '') && /[a-z]/i.test(butun[offset + 1] ?? ''))) return b;
    if (b === b.toUpperCase() && b !== b.toLowerCase()) return k.toUpperCase();
    if (b[0] !== b[0].toLowerCase()) return k[0].toUpperCase() + k.slice(1);
    return k;
  });
}

export function lotindanKirillga(matn: string): string {
  let natija = '';
  let oxiri = 0;
  for (const m of matn.matchAll(SAQLANADI)) {
    natija += soz(matn.slice(oxiri, m.index)) + m[0];
    oxiri = m.index + m[0].length;
  }
  return natija + soz(matn.slice(oxiri));
}

/** Lug'at obyektini (ichma-ich) kirillga o'giradi. */
export function lugatniOgir<T>(obj: T): T {
  if (typeof obj === 'string') return lotindanKirillga(obj) as T;
  if (obj && typeof obj === 'object')
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, lugatniOgir(v)])) as T;
  return obj;
}
