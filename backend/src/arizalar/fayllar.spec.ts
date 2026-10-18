import { aniqlaFaylTuri, MAX_FAYL_HAJMI, tekshirFayl } from './fayllar.js';

const pdf = Buffer.from('%PDF-1.7\n...');
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0]);

describe('fayllar', () => {
  it("turni baytlardan aniqlaydi", () => {
    expect(aniqlaFaylTuri(pdf)?.ext).toBe('pdf');
    expect(aniqlaFaylTuri(png)?.ext).toBe('png');
    expect(aniqlaFaylTuri(jpg)?.ext).toBe('jpg');
    expect(aniqlaFaylTuri(Buffer.from('MZ executable'))).toBeNull();
  });

  it('hajm, tur va majburiylikni tekshiradi', () => {
    expect(tekshirFayl({ size: pdf.length, buffer: pdf }, true)).toBeNull();
    expect(tekshirFayl({ size: 25 * 1024 * 1024, buffer: pdf }, true)).toContain('20 MB');
    expect(tekshirFayl({ size: MAX_FAYL_HAJMI, buffer: pdf }, true)).toBeNull();
    expect(tekshirFayl({ size: 10, buffer: Buffer.from('<html>') }, true)).toContain('PDF, JPG yoki PNG');
    expect(tekshirFayl(undefined, true)).toBe('Fayl majburiy');
    expect(tekshirFayl(undefined, false)).toBeNull();
  });
});
