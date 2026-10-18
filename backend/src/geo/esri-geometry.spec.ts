import type { Boundary } from './boundary.validation.js';
import { signedArea, toEsriPolygon, toWebMercator } from './esri-geometry.js';

const andijan: Boundary = {
  type: 'Polygon',
  coordinates: [
    [
      [72.3, 40.75],
      [72.4, 40.75],
      [72.4, 40.81],
      [72.3, 40.81],
      [72.3, 40.75],
    ],
  ],
};

describe('toWebMercator', () => {
  it('matches the values returned by the ArcGIS server', () => {
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
  it('makes the outer ring clockwise (GeoJSON uses the opposite)', () => {
    expect(
      signedArea(andijan.coordinates[0] as [number, number][]),
    ).toBeGreaterThan(0); // input: CCW
    const esri = toEsriPolygon(andijan);
    expect(esri.spatialReference.wkid).toBe(102100);
    expect(esri.rings).toHaveLength(1);
    expect(signedArea(esri.rings[0])).toBeLessThan(0); // output: CW
  });

  it('keeps an already clockwise ring and makes the hole counter-clockwise', () => {
    const outerCw: [number, number][] = [
      [72.3, 40.75],
      [72.3, 40.81],
      [72.4, 40.81],
      [72.4, 40.75],
      [72.3, 40.75],
    ];
    const holeCw: [number, number][] = [
      [72.33, 40.77],
      [72.33, 40.79],
      [72.37, 40.79],
      [72.37, 40.77],
      [72.33, 40.77],
    ];
    const esri = toEsriPolygon({
      type: 'Polygon',
      coordinates: [outerCw, holeCw],
    });
    expect(esri.rings[0][1]).toEqual(toWebMercator(outerCw[1]));
    expect(signedArea(esri.rings[0])).toBeLessThan(0);
    expect(signedArea(esri.rings[1])).toBeGreaterThan(0);
  });

  it('collects MultiPolygon rings into a single rings array', () => {
    const esri = toEsriPolygon({
      type: 'MultiPolygon',
      coordinates: [andijan.coordinates, andijan.coordinates],
    });
    expect(esri.rings).toHaveLength(2);
    esri.rings.forEach((r) => expect(signedArea(r)).toBeLessThan(0));
  });
});
