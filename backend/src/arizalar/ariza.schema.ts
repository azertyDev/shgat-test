import { z } from 'zod';
import { SOATO } from '../soato/soato.js';
import { Chegara, validateChegara } from './chegara.js';
import { toshkentSanasi } from './muddat.js';

export const HUJJAT_TURLARI = ['БСХ', 'ҲРС', 'ТРЛ', 'БР', 'БРЛ', 'ҚР', 'ЛШ'] as const;

const SOATO_KODLARI = new Set(SOATO.map((s) => s.kod));
const majburiy = { error: 'Majburiy maydon' };

/** 4.1-bo'lim qoidalari. id_raqam, holat kabi server maydonlari z.object tomonidan tashlab yuboriladi. */
export const arizaSchema = z.object({
  hujjat_nomi: z.string(majburiy).trim().min(1, "Bo'sh bo'lmasin").max(255, '255 belgidan oshmasin'),
  hujjat_turi: z.enum(HUJJAT_TURLARI, { error: `Turlardan biri: ${HUJJAT_TURLARI.join(', ')}` }),
  soato_kodi: z
    .string(majburiy)
    .regex(/^\d{7}$/, "7 ta raqam bo'lishi kerak")
    .refine((k) => SOATO_KODLARI.has(k), "SOATO ro'yxatida yo'q"),
  tasdiq_sanasi: z.iso
    .date({ error: "Sana YYYY-MM-DD formatida bo'lishi kerak" })
    .refine((s) => s <= toshkentSanasi(), "Kelajakdagi sana bo'lmasin"),
  tasdiq_hujjati: z.string(majburiy).trim().min(1, "Bo'sh bo'lmasin").max(100, '100 belgidan oshmasin'),
  chegara: z.custom<Chegara>().superRefine((g, ctx) => {
    const x = validateChegara(g);
    if (x) ctx.addIssue({ code: 'custom', message: x });
  }),
});

export type ArizaData = z.infer<typeof arizaSchema>;
