import type { ApplicationFormValues } from './form-schema';
import type {
  Role,
  Boundary,
  Approval,
  FileField,
  ListQuery,
  SoatoRegion,
  Application,
  ApplicationPage,
  ApplicationStatus,
  ApplicationSummary,
} from './types';

import { FILE_FIELDS } from './types';

/**
 * Wire format of the backend API, fixed by the task specification (section 5, docs/api.md).
 * The API is in Uzbek; this is the only module that knows those names. Everything else uses the
 * English models from ./types.
 */

// ----------------------------------------------------------------------

const invert = <K extends string, V extends string>(o: Record<K, V>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k])) as Record<V, K>;

export const ROLE_HEADER: Record<Role, string> = { APPLICANT: 'ariza_beruvchi', REVIEWER: 'tekshiruvchi' };

const STATUS_TO_API = {
  SUBMITTED: 'yuborilgan',
  REGISTERED: 'hisobga_olingan',
  RETURNED: 'qaytarilgan',
} as const satisfies Record<ApplicationStatus, string>;
type ApiStatus = (typeof STATUS_TO_API)[ApplicationStatus];
const STATUS_FROM_API = invert(STATUS_TO_API);

const FILE_FIELD_TO_API = {
  mainDrawing: 'asosiy_chizma',
  explanatoryNote: 'tushuntirish_xati',
  approvalDocument: 'tasdiqlovchi_hujjat',
} as const satisfies Record<FileField, string>;
const FILE_FIELD_FROM_API = invert(FILE_FIELD_TO_API);

/** Form field -> wire field; also used to put 422 errors next to the right form field. */
const FORM_FIELD_TO_API = {
  documentName: 'hujjat_nomi',
  documentType: 'hujjat_turi',
  soatoCode: 'soato_kodi',
  approvalDate: 'tasdiq_sanasi',
  approvalDecree: 'tasdiq_hujjati',
  boundary: 'chegara',
  ...FILE_FIELD_TO_API,
} as const;
const FORM_FIELD_FROM_API: Record<string, string> = invert(FORM_FIELD_TO_API);

// ---- response bodies ------------------------------------------------------

type SummaryDto = {
  id: number;
  id_raqam: string | null;
  hujjat_nomi: string;
  hujjat_turi: string;
  soato_kodi: string;
  hudud_nomi: string | null;
  holat: ApiStatus;
  yuborilgan_vaqt: string;
  muddat: string | null;
};

type DetailsDto = SummaryDto & {
  tasdiq_sanasi: string;
  tasdiq_hujjati: string;
  chegara: Boundary;
  arcgis_object_id: number | null;
  qaytarish_sababi: string | null;
  fayllar: { tur: (typeof FILE_FIELD_TO_API)[FileField]; nomi: string; mime: string; hajm: number; url: string }[];
};

export type PageDto = { items: SummaryDto[]; jami: number };
export type SoatoDto = { kod: string; nomi: string };
export type StatusDto = { id: number; holat: ApiStatus };
export type ApprovalDto = { id_raqam: string; arcgis_object_id: number };
export type ErrorDto = { xato?: string; maydonlar?: Record<string, string>; kod?: string };

/** Machine-readable error codes (`kod`) the UI reacts to. */
export type ApiErrorCode = 'DUPLICATE_NUMBER';
const ERROR_CODE_FROM_API: Record<string, ApiErrorCode> = { id_takrori: 'DUPLICATE_NUMBER' };

const fromSummaryDto = (d: SummaryDto): ApplicationSummary => ({
  id: d.id,
  registrationNumber: d.id_raqam,
  documentName: d.hujjat_nomi,
  documentType: d.hujjat_turi,
  soatoCode: d.soato_kodi,
  regionName: d.hudud_nomi,
  status: STATUS_FROM_API[d.holat],
  submittedAt: d.yuborilgan_vaqt,
  reviewDeadline: d.muddat,
});

export const fromDetailsDto = (d: DetailsDto): Application => ({
  ...fromSummaryDto(d),
  approvalDate: d.tasdiq_sanasi,
  approvalDecree: d.tasdiq_hujjati,
  boundary: d.chegara,
  arcgisObjectId: d.arcgis_object_id,
  returnReason: d.qaytarish_sababi,
  files: d.fayllar.map((f) => ({
    field: FILE_FIELD_FROM_API[f.tur],
    name: f.nomi,
    mimeType: f.mime,
    size: f.hajm,
    url: f.url,
  })),
});

export const fromPageDto = (d: PageDto): ApplicationPage => ({ items: d.items.map(fromSummaryDto), total: d.jami });
export const fromSoatoDto = (d: SoatoDto[]): SoatoRegion[] => d.map((r) => ({ code: r.kod, name: r.nomi }));
export const fromStatusDto = (d: StatusDto) => ({ id: d.id, status: STATUS_FROM_API[d.holat] });
export const fromApprovalDto = (d: ApprovalDto): Approval => ({
  registrationNumber: d.id_raqam,
  arcgisObjectId: d.arcgis_object_id,
});

/** 422 field errors keyed by form field names (unknown keys such as `data` are kept as is). */
export const fromErrorFields = (fields: Record<string, string> = {}) =>
  Object.fromEntries(Object.entries(fields).map(([k, v]) => [FORM_FIELD_FROM_API[k] ?? k, v]));

/** Unified error body {"xato", "maydonlar"} -> message and form-field errors. */
export function fromErrorDto(body: unknown, status: number) {
  const b = body as ErrorDto | null;
  return {
    message: b?.xato ?? `HTTP ${status}`,
    fieldErrors: b?.maydonlar && fromErrorFields(b.maydonlar),
    code: b?.kod ? ERROR_CODE_FROM_API[b.kod] : undefined,
  };
}

// ---- requests -------------------------------------------------------------

export function toListParams(q: ListQuery): string {
  const params = {
    holat: q.status && STATUS_TO_API[q.status],
    hujjat_turi: q.documentType,
    soato_kodi: q.soatoCode,
    sahifa: q.page,
    hajm: q.pageSize,
  };
  return new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)])
  ).toString();
}

/** multipart body: `data` (JSON with wire names) + the selected files. */
export function toPayload(v: ApplicationFormValues): FormData {
  const body = new FormData();
  body.append(
    'data',
    JSON.stringify({
      [FORM_FIELD_TO_API.documentName]: v.documentName,
      [FORM_FIELD_TO_API.documentType]: v.documentType,
      [FORM_FIELD_TO_API.soatoCode]: v.soatoCode,
      [FORM_FIELD_TO_API.approvalDate]: v.approvalDate,
      [FORM_FIELD_TO_API.approvalDecree]: v.approvalDecree,
      [FORM_FIELD_TO_API.boundary]: v.boundary,
    })
  );
  for (const field of FILE_FIELDS) {
    const file = v[field];
    if (file) body.append(FILE_FIELD_TO_API[field], file);
  }
  return body;
}

export const toReturnBody = (reason: string) => JSON.stringify({ sabab: reason });

export const toTokenRequest = (role: Role) => JSON.stringify({ rol: ROLE_HEADER[role] });
