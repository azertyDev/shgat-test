import { latinToCyrillic, transliterateDictionary } from './transliterate';

describe('latinToCyrillic', () => {
  it.each([
    ["O'zbekiston", 'Ўзбекистон'],
    ['Shahar bosh rejasi', 'Шаҳар бош режаси'],
    ["G'alaba choyxona", 'Ғалаба чойхона'],
    ['Yangi ariza yuborish', 'Янги ариза юбориш'],
    ['Ekin maydoni', 'Экин майдони'],
    ['Tekshiruvchi', 'Текширувчи'],
    ["ma'lumot", 'маълумот'],
    ['Choy va Shirin', 'Чой ва Ширин'],
  ])('%s -> %s', (latin, cyrillic) => {
    expect(latinToCyrillic(latin)).toBe(cyrillic);
  });

  it('keeps terms and placeholders', () => {
    expect(latinToCyrillic('ID raqam: {{id}}, PDF, GeoJSON, ArcGIS')).toBe('ID рақам: {{id}}, PDF, GeoJSON, ArcGIS');
  });

  it('leaves digits and Cyrillic text unchanged', () => {
    expect(latinToCyrillic('БР-1703401-2026')).toBe('БР-1703401-2026');
  });

  it('transliterates a nested dictionary', () => {
    expect(transliterateDictionary({ a: 'Holat', b: { c: 'Rol' } })).toEqual({ a: 'Ҳолат', b: { c: 'Рол' } });
  });
});
