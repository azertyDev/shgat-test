import type { Chegara, FaylTuri } from './types';

import { z } from 'zod';
import dayjs from 'dayjs';

import { validateChegara } from './chegara';
import { FAYL_TURLARI, HUJJAT_TURLARI } from './types';

// Xabarlar lotinda; kirill rejimida `tr()` orqali o'giriladi.

export const MAX_FAYL_HAJMI = 20 * 1024 * 1024;
const FAYL_MIME = ['application/pdf', 'image/jpeg', 'image/png'];

export const bugun = () => dayjs().format('YYYY-MM-DD');

const faylSchema = (majburiy: boolean) =>
  z.custom<File | null>().superRefine((f, ctx) => {
    if (!f) {
      if (majburiy) ctx.addIssue({ code: 'custom', message: 'Fayl majburiy' });
      return;
    }
    if (f.size > MAX_FAYL_HAJMI) ctx.addIssue({ code: 'custom', message: 'Fayl hajmi 20 MB dan oshmasin' });
    if (!FAYL_MIME.includes(f.type) && !/\.(pdf|jpe?g|png)$/i.test(f.name))
      ctx.addIssue({ code: 'custom', message: 'Faqat PDF, JPG yoki PNG fayl' });
  });

export const arizaFormSchema = (fayllarMajburiy: boolean) =>
  z.object({
    hujjat_nomi: z.string().trim().min(1, "Bo'sh bo'lmasin").max(255, '255 belgidan oshmasin'),
    hujjat_turi: z.string().refine((v) => (HUJJAT_TURLARI as readonly string[]).includes(v), 'Hujjat turini tanlang'),
    soato_kodi: z.string().regex(/^\d{7}$/, 'Hududni tanlang'),
    tasdiq_sanasi: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Sanani kiriting')
      .refine((s) => s <= bugun(), "Kelajakdagi sana bo'lmasin"),
    tasdiq_hujjati: z.string().trim().min(1, "Bo'sh bo'lmasin").max(100, '100 belgidan oshmasin'),
    chegara: z.custom<Chegara | null>().superRefine((g, ctx) => {
      const x = g ? validateChegara(g) : 'Chegarani chizing yoki GeoJSON yuklang';
      if (x) ctx.addIssue({ code: 'custom', message: x });
    }),
    ...(Object.fromEntries(FAYL_TURLARI.map((t) => [t, faylSchema(fayllarMajburiy)])) as Record<
      FaylTuri,
      ReturnType<typeof faylSchema>
    >),
  });

export type ArizaFormValues = {
  hujjat_nomi: string;
  hujjat_turi: string;
  soato_kodi: string;
  tasdiq_sanasi: string;
  tasdiq_hujjati: string;
  chegara: Chegara | null;
} & Record<FaylTuri, File | null>;

/** {tur}-{soato}-{yil} — faqat ko'rsatish uchun; haqiqiy ID'ni server tasdiqlashda beradi. */
export function bolajakId(v: Pick<ArizaFormValues, 'hujjat_turi' | 'soato_kodi' | 'tasdiq_sanasi'>) {
  const yil = /^\d{4}/.exec(v.tasdiq_sanasi)?.[0];
  return v.hujjat_turi && v.soato_kodi && yil ? `${v.hujjat_turi}-${v.soato_kodi}-${yil}` : '';
}

export function formDataga(v: ArizaFormValues): FormData {
  const fd = new FormData();
  const { chegara, hujjat_nomi, hujjat_turi, soato_kodi, tasdiq_sanasi, tasdiq_hujjati } = v;
  fd.append('data', JSON.stringify({ hujjat_nomi, hujjat_turi, soato_kodi, tasdiq_sanasi, tasdiq_hujjati, chegara }));
  for (const t of FAYL_TURLARI) {
    const f = v[t];
    if (f) fd.append(t, f);
  }
  return fd;
}
