export const FAYL_TURLARI = ['asosiy_chizma', 'tushuntirish_xati', 'tasdiqlovchi_hujjat'] as const;
export type FaylTuri = (typeof FAYL_TURLARI)[number];
export const MAX_FAYL_HAJMI = 20 * 1024 * 1024;

const IMZOLAR: { ext: string; mime: string; bytes: number[] }[] = [
  { ext: 'pdf', mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { ext: 'png', mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { ext: 'jpg', mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
];

/** Fayl turini mijoz yuborgan mime'ga emas, birinchi baytlarga qarab aniqlaydi. */
export function aniqlaFaylTuri(buf: Buffer): { ext: string; mime: string } | null {
  const imzo = IMZOLAR.find((s) => s.bytes.every((b, i) => buf[i] === b));
  return imzo ? { ext: imzo.ext, mime: imzo.mime } : null;
}

export function tekshirFayl(f: { size: number; buffer: Buffer } | undefined, majburiy: boolean): string | null {
  if (!f) return majburiy ? 'Fayl majburiy' : null;
  if (f.size > MAX_FAYL_HAJMI) return 'Fayl hajmi 20 MB dan oshmasin';
  if (!aniqlaFaylTuri(f.buffer)) return 'Faqat PDF, JPG yoki PNG fayl';
  return null;
}
