/** Response bodies of docs/api.md (wire names of the task spec). */
import type { ApiStatus, UploadField } from '../api-contract.js';

export interface StatusDto {
  id: number;
  holat: ApiStatus;
}

/** Fields of the task spec (section 4.1) in its order, then the additions of docs/api.md. */
export interface ApplicationSummaryDto {
  id: number;
  hujjat_nomi: string;
  hujjat_turi: string;
  soato_kodi: string;
  tasdiq_sanasi: string;
  tasdiq_hujjati: string;
  chegara: unknown;
  id_raqam: string | null;
  holat: ApiStatus;
  arcgis_object_id: number | null;
  // additions: region name, submission time and review deadline (only while it waits for review)
  hudud_nomi: string | null;
  yuborilgan_vaqt: Date;
  muddat: string | null;
}

export interface ApplicationDetailsDto extends ApplicationSummaryDto {
  qaytarish_sababi: string | null;
  fayllar: {
    tur: UploadField;
    nomi: string;
    mime: string;
    hajm: number;
    url: string;
  }[];
}

export interface ApprovalDto {
  id_raqam: string;
  arcgis_object_id: number;
}
