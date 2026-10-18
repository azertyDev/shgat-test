/**
 * Wire-level names fixed by the task specification (section 5, docs/api.md).
 * The API is in Uzbek and must not change; everything inside the service uses the English names.
 */

/** Multipart field names of the three required documents. */
export const UPLOAD_FIELDS = ['asosiy_chizma', 'tushuntirish_xati', 'tasdiqlovchi_hujjat'] as const;
export type UploadField = (typeof UPLOAD_FIELDS)[number];
