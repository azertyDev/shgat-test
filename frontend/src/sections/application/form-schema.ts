import type { Boundary, FileField } from './types';

import { z } from 'zod';
import dayjs from 'dayjs';

import { validateBoundary } from './boundary';
import { FILE_FIELDS, DOCUMENT_TYPES } from './types';

// Messages are in Uzbek Latin; the Cyrillic UI converts them with localize().

export const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export const today = () => dayjs().format('YYYY-MM-DD');

const fileSchema = (required: boolean) =>
  z.custom<File | null>().superRefine((f, ctx) => {
    if (!f) {
      if (required) ctx.addIssue({ code: 'custom', message: 'Fayl majburiy' });
      return;
    }
    if (f.size > MAX_FILE_SIZE) ctx.addIssue({ code: 'custom', message: 'Fayl hajmi 20 MB dan oshmasin' });
    if (!ALLOWED_MIME_TYPES.includes(f.type) && !/\.(pdf|jpe?g|png)$/i.test(f.name))
      ctx.addIssue({ code: 'custom', message: 'Faqat PDF, JPG yoki PNG fayl' });
  });

export const applicationFormSchema = (filesRequired: boolean) =>
  z.object({
    documentName: z.string().trim().min(1, "Bo'sh bo'lmasin").max(255, '255 belgidan oshmasin'),
    documentType: z.string().refine((v) => (DOCUMENT_TYPES as readonly string[]).includes(v), 'Hujjat turini tanlang'),
    soatoCode: z.string().regex(/^\d{7}$/, 'Hududni tanlang'),
    approvalDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Sanani kiriting')
      .refine((s) => s <= today(), "Kelajakdagi sana bo'lmasin"),
    approvalDecree: z.string().trim().min(1, "Bo'sh bo'lmasin").max(100, '100 belgidan oshmasin'),
    boundary: z.custom<Boundary | null>().superRefine((g, ctx) => {
      const error = g ? validateBoundary(g) : 'Chegarani chizing yoki GeoJSON yuklang';
      if (error) ctx.addIssue({ code: 'custom', message: error });
    }),
    ...(Object.fromEntries(FILE_FIELDS.map((f) => [f, fileSchema(filesRequired)])) as Record<
      FileField,
      ReturnType<typeof fileSchema>
    >),
  });

export type ApplicationFormValues = {
  documentName: string;
  documentType: string;
  soatoCode: string;
  approvalDate: string;
  approvalDecree: string;
  boundary: Boundary | null;
} & Record<FileField, File | null>;

/** {type}-{soato}-{year}, preview only: the real number is assigned by the server on approval. */
export function futureRegistrationNumber(
  v: Pick<ApplicationFormValues, 'documentType' | 'soatoCode' | 'approvalDate'>
) {
  const year = /^\d{4}/.exec(v.approvalDate)?.[0];
  return v.documentType && v.soatoCode && year ? `${v.documentType}-${v.soatoCode}-${year}` : '';
}
