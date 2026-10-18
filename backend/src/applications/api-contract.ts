/**
 * Wire-level names fixed by the task specification (section 5, docs/api.md).
 * The public API is in Uzbek and must not change; the rest of the code uses the English names
 * and converts at this boundary (see application.mapper.ts and application.schema.ts).
 */
import type { ApplicationStatus, FileKind } from '../generated/prisma/client.js';

/** Multipart field names of the three required documents. */
export const UPLOAD_FIELDS = ['asosiy_chizma', 'tushuntirish_xati', 'tasdiqlovchi_hujjat'] as const;
export type UploadField = (typeof UPLOAD_FIELDS)[number];

export const FILE_KIND_TO_FIELD: Record<FileKind, UploadField> = {
  MAIN_DRAWING: 'asosiy_chizma',
  EXPLANATORY_NOTE: 'tushuntirish_xati',
  APPROVAL_DOCUMENT: 'tasdiqlovchi_hujjat',
};

export const FIELD_TO_FILE_KIND = Object.fromEntries(
  Object.entries(FILE_KIND_TO_FIELD).map(([kind, field]) => [field, kind]),
) as Record<UploadField, FileKind>;

export const STATUS_TO_API = {
  SUBMITTED: 'yuborilgan',
  REGISTERED: 'hisobga_olingan',
  RETURNED: 'qaytarilgan',
} as const satisfies Record<ApplicationStatus, string>;

export type ApiStatus = (typeof STATUS_TO_API)[ApplicationStatus];
export const API_STATUSES = Object.values(STATUS_TO_API);

/** Own-property lookup, so values like "toString" are rejected instead of reaching Prisma. */
export function statusFromApi(value: string): ApplicationStatus | undefined {
  const entry = Object.entries(STATUS_TO_API).find(([, wire]) => wire === value);
  return entry?.[0] as ApplicationStatus | undefined;
}

export const isUploadField = (value: string): value is UploadField =>
  (UPLOAD_FIELDS as readonly string[]).includes(value);

// ---- response bodies -------------------------------------------------------

export interface StatusDto {
  id: number;
  holat: ApiStatus;
}

export interface ApplicationSummaryDto {
  id: number;
  id_raqam: string | null;
  hujjat_nomi: string;
  hujjat_turi: string;
  soato_kodi: string;
  hudud_nomi: string | null;
  holat: ApiStatus;
  yuborilgan_vaqt: Date;
  /** review deadline, only while the application waits for review */
  muddat: string | null;
}

export interface ApplicationDetailsDto extends ApplicationSummaryDto {
  tasdiq_sanasi: string;
  tasdiq_hujjati: string;
  chegara: unknown;
  arcgis_object_id: number | null;
  qaytarish_sababi: string | null;
  fayllar: { tur: UploadField; nomi: string; mime: string; hajm: number; url: string }[];
}

export interface ApprovalDto {
  id_raqam: string;
  arcgis_object_id: number;
}
