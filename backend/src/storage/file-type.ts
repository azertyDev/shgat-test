export const MAX_FILE_SIZE = 20 * 1024 * 1024;

const SIGNATURES: { ext: string; mime: string; bytes: number[] }[] = [
  {
    ext: 'pdf',
    mime: 'application/pdf',
    bytes: [0x25, 0x50, 0x44, 0x46, 0x2d],
  }, // %PDF-
  {
    ext: 'png',
    mime: 'image/png',
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { ext: 'jpg', mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
];

/** Detects the file type from its leading bytes, not from the client-supplied mime type. */
export function detectFileType(
  buf: Buffer,
): { ext: string; mime: string } | null {
  const signature = SIGNATURES.find((s) =>
    s.bytes.every((b, i) => buf[i] === b),
  );
  return signature ? { ext: signature.ext, mime: signature.mime } : null;
}

/** Returns a user-facing error message, or null when the file is acceptable. */
export function checkUploadedFile(
  f: { size: number; head: Buffer } | undefined,
  required: boolean,
): string | null {
  if (!f) return required ? 'Fayl majburiy' : null;
  if (f.size > MAX_FILE_SIZE) return 'Fayl hajmi 20 MB dan oshmasin';
  if (!detectFileType(f.head)) return 'Faqat PDF, JPG yoki PNG fayl';
  return null;
}
