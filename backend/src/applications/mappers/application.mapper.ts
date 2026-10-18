import type {
  Application,
  ApplicationFile,
  ApplicationStatus,
} from '../../generated/prisma/client.js';
import { FILE_KIND_TO_FIELD, STATUS_TO_API } from '../api-contract.js';
import { addBusinessDays, tashkentDate } from '../domain/business-days.js';
import type {
  ApplicationDetailsDto,
  ApplicationSummaryDto,
  StatusDto,
} from '../dto/application-response.dto.js';

const REVIEW_BUSINESS_DAYS = 3;

export const toStatusDto = (
  id: number,
  status: ApplicationStatus,
): StatusDto => ({ id, holat: STATUS_TO_API[status] });

/** Resolves a SOATO code to its region name. */
export type RegionNameResolver = (code: string) => string | null;

export const toSummaryDto = (
  a: Application,
  regionName: RegionNameResolver,
): ApplicationSummaryDto => ({
  id: a.id,
  id_raqam: a.registrationNumber,
  hujjat_nomi: a.documentName,
  hujjat_turi: a.documentType,
  soato_kodi: a.soatoCode,
  hudud_nomi: regionName(a.soatoCode),
  holat: STATUS_TO_API[a.status],
  yuborilgan_vaqt: a.submittedAt,
  muddat:
    a.status === 'SUBMITTED'
      ? addBusinessDays(tashkentDate(a.submittedAt), REVIEW_BUSINESS_DAYS)
      : null,
  chegara: a.boundary,
});

export const toDetailsDto = (
  a: Application & { files: ApplicationFile[] },
  regionName: RegionNameResolver,
): ApplicationDetailsDto => ({
  ...toSummaryDto(a, regionName),
  tasdiq_sanasi: a.approvalDate.toISOString().slice(0, 10),
  tasdiq_hujjati: a.approvalDecree,
  arcgis_object_id: a.arcgisObjectId,
  qaytarish_sababi: a.returnReason,
  fayllar: a.files.map((f) => {
    const field = FILE_KIND_TO_FIELD[f.kind];
    return {
      tur: field,
      nomi: f.originalName,
      mime: f.mimeType,
      hajm: f.size,
      url: `/api/arizalar/${a.id}/fayllar/${field}`,
    };
  }),
});
