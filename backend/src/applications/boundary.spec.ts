import { signedArea, toEsriPolygon, toWebMercator, validateChegara, type Chegara } from './boundary.js';

const andijon: Chegara = {
  type: 'Polygon',
  coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.81], [72.3, 40.75]]],
};

describe('validateChegara', () => {
  it("to'g'ri Polygon va MultiPolygon o'tadi", () => {
    expect(validateChegara(andijon)).toBeNull();
    expect(validateChegara({ type: 'MultiPolygon', coordinates: [andijon.coordinates] })).toBeNull();
  });

  it.each([
    ['tur noto\'g\'ri', { type: 'Point', coordinates: [72.3, 40.75] }, 'Polygon yoki MultiPolygon'],
    ['obyekt emas', 'abc', 'GeoJSON obyekt'],
    ['yopilmagan halqa', { type: 'Polygon', coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.81]]] }, 'yopilmagan'],
    ['3 nuqta', { type: 'Polygon', coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.3, 40.75]]] }, 'kamida 4'],
    ['Parij', { type: 'Polygon', coordinates: [[[2.29, 48.85], [2.4, 48.85], [2.4, 48.9], [2.29, 48.85]]] }, 'tashqarida'],
    ['son emas', { type: 'Polygon', coordinates: [[['a', 1], [1, 1], [1, 2], ['a', 1]]] }, 'sonlar'],
  ])('%s → xato', (_, g, xabar) => {
    expect(validateChegara(g)).toContain(xabar);
  });
});

describe('toWebMercator', () => {
  it('ArcGIS serveri qaytargan qiymatlarga mos', () => {
    const [x, y] = toWebMercator([72.3, 40.75]);
    expect(x).toBeCloseTo(8048399.184, 2);
    expect(y).toBeCloseTo(4975536.361, 2);
  });

  it('0,0 → 0,0', () => {
    const [x, y] = toWebMercator([0, 0]);
    expect(x).toBe(0);
    expect(y).toBeCloseTo(0, 6);
  });
});

describe('toEsriPolygon', () => {
  it('tashqi halqani soat mili bo\'yicha qiladi (GeoJSON — teskari)', () => {
    expect(signedArea(andijon.coordinates[0] as [number, number][])).toBeGreaterThan(0); // kirish: CCW
    const esri = toEsriPolygon(andijon);
    expect(esri.spatialReference.wkid).toBe(102100);
    expect(esri.rings).toHaveLength(1);
    expect(signedArea(esri.rings[0])).toBeLessThan(0); // chiqish: CW
  });

  it("allaqachon CW halqani o'zgartirmaydi, teshikni CCW qiladi", () => {
    const outerCw: [number, number][] = [[72.3, 40.75], [72.3, 40.81], [72.4, 40.81], [72.4, 40.75], [72.3, 40.75]];
    const holeCw: [number, number][] = [[72.33, 40.77], [72.33, 40.79], [72.37, 40.79], [72.37, 40.77], [72.33, 40.77]];
    const esri = toEsriPolygon({ type: 'Polygon', coordinates: [outerCw, holeCw] });
    expect(esri.rings[0][1]).toEqual(toWebMercator(outerCw[1]));
    expect(signedArea(esri.rings[0])).toBeLessThan(0);
    expect(signedArea(esri.rings[1])).toBeGreaterThan(0);
  });

  it('MultiPolygon halqalarini bitta rings ro\'yxatiga yig\'adi', () => {
    const esri = toEsriPolygon({ type: 'MultiPolygon', coordinates: [andijon.coordinates, andijon.coordinates] });
    expect(esri.rings).toHaveLength(2);
    esri.rings.forEach((r) => expect(signedArea(r)).toBeLessThan(0));
  });
});
