/** Response bodies of docs/api.md (wire names of the task spec). */
import type { ApiStatus, UploadField } from '../api-contract.js';

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
