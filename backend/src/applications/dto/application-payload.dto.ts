import { z } from 'zod';
import { Boundary, validateBoundary } from '../../geo/boundary.validation.js';
import { DOCUMENT_TYPES } from '../domain/document-types.js';
import { tashkentDate } from '../domain/business-days.js';

const required = { error: 'Majburiy maydon' };

/**
 * Rules of the task spec (section 4.1) for the multipart `data` field. Keys are the wire names, so
 * validation errors come back with the field names the client sent; the output is the internal shape.
 * Server-owned fields (id_raqam, holat, ...) are not part of the object and are dropped.
 */
export const createApplicationPayloadSchema = (
  isKnownSoatoCode: (code: string) => boolean,
) =>
  z
    .object({
      hujjat_nomi: z
        .string(required)
        .trim()
        .min(1, "Bo'sh bo'lmasin")
        .max(255, '255 belgidan oshmasin'),
      hujjat_turi: z.enum(DOCUMENT_TYPES, {
        error: `Turlardan biri: ${DOCUMENT_TYPES.join(', ')}`,
      }),
      soato_kodi: z
        .string(required)
        .regex(/^\d{7}$/, "7 ta raqam bo'lishi kerak")
        .refine(isKnownSoatoCode, "SOATO ro'yxatida yo'q"),
      tasdiq_sanasi: z.iso
        .date({ error: "Sana YYYY-MM-DD formatida bo'lishi kerak" })
        .refine((s) => s <= tashkentDate(), "Kelajakdagi sana bo'lmasin"),
      tasdiq_hujjati: z
        .string(required)
        .trim()
        .min(1, "Bo'sh bo'lmasin")
        .max(100, '100 belgidan oshmasin'),
      chegara: z.custom<Boundary>().superRefine((g, ctx) => {
        const error = validateBoundary(g);
        if (error) ctx.addIssue({ code: 'custom', message: error });
      }),
    })
    .transform((d) => ({
      documentName: d.hujjat_nomi,
      documentType: d.hujjat_turi,
      soatoCode: d.soato_kodi,
      approvalDate: d.tasdiq_sanasi,
      approvalDecree: d.tasdiq_hujjati,
      boundary: d.chegara,
    }));

export type ApplicationInput = z.output<
  ReturnType<typeof createApplicationPayloadSchema>
>;
