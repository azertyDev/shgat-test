import {
  checkUploadedFile,
  detectFileType,
  MAX_FILE_SIZE,
} from './file-type.js';

const pdf = Buffer.from('%PDF-1.7\n...');
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0]);

describe('file type', () => {
  it('detects the type from the file signature', () => {
    expect(detectFileType(pdf)?.ext).toBe('pdf');
    expect(detectFileType(png)?.ext).toBe('png');
    expect(detectFileType(jpg)?.ext).toBe('jpg');
    expect(detectFileType(Buffer.from('MZ executable'))).toBeNull();
  });

  it('checks size, type and presence', () => {
    expect(checkUploadedFile({ size: pdf.length, head: pdf }, true)).toBeNull();
    expect(
      checkUploadedFile({ size: 25 * 1024 * 1024, head: pdf }, true),
    ).toContain('20 MB');
    expect(
      checkUploadedFile({ size: MAX_FILE_SIZE, head: pdf }, true),
    ).toBeNull();
    expect(
      checkUploadedFile({ size: 10, head: Buffer.from('<html>') }, true),
    ).toContain('PDF, JPG yoki PNG');
    expect(checkUploadedFile(undefined, true)).toBe('Fayl majburiy');
    expect(checkUploadedFile(undefined, false)).toBeNull();
  });
});
