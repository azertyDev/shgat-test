import { lugatniOgir, lotindanKirillga } from './kirill';

describe('lotindanKirillga', () => {
  it.each([
    ["O'zbekiston", 'Ўзбекистон'],
    ['Shahar bosh rejasi', 'Шаҳар бош режаси'],
    ["G'alaba choyxona", 'Ғалаба чойхона'],
    ['Yangi ariza yuborish', 'Янги ариза юбориш'],
    ['Ekin maydoni', 'Экин майдони'],
    ['Tekshiruvchi', 'Текширувчи'],
    ["ma'lumot", 'маълумот'],
    ['Choy va Shirin', 'Чой ва Ширин'],
  ])('%s → %s', (lotin, kirill) => {
    expect(lotindanKirillga(lotin)).toBe(kirill);
  });

  it("atamalar va o'zgaruvchilar saqlanadi", () => {
    expect(lotindanKirillga('ID raqam: {{id}}, PDF, GeoJSON, ArcGIS')).toBe('ID рақам: {{id}}, PDF, GeoJSON, ArcGIS');
  });

  it("raqam va kirill matn o'zgarmaydi", () => {
    expect(lotindanKirillga('БР-1703401-2026')).toBe('БР-1703401-2026');
  });

  it("lug'atni ichma-ich o'giradi", () => {
    expect(lugatniOgir({ a: 'Holat', b: { c: 'Rol' } })).toEqual({ a: 'Ҳолат', b: { c: 'Рол' } });
  });
});
