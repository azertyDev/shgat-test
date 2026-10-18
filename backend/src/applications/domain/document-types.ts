/** Document type codes of the task spec (section 2), used as plain codes. */
export const DOCUMENT_TYPES = ['БСХ', 'ҲРС', 'ТРЛ', 'БР', 'БРЛ', 'ҚР', 'ЛШ'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
