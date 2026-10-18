import { validateBoundary, boundaryFromRings, OUTSIDE_UZBEKISTAN, boundaryFromGeoJson } from './boundary';

const square = [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.81], [72.3, 40.75]]];

describe('boundary', () => {
  it('warns about a polygon outside Uzbekistan', () => {
    expect(validateBoundary({ type: 'Polygon', coordinates: square })).toBeNull();
    expect(
      validateBoundary({ type: 'Polygon', coordinates: [[[2.29, 48.85], [2.4, 48.85], [2.4, 48.9], [2.29, 48.85]]] })
    ).toBe(OUTSIDE_UZBEKISTAN);
  });

  it('extracts geometry from a Feature and a FeatureCollection', () => {
    const polygon = { type: 'Polygon', coordinates: square };
    expect(boundaryFromGeoJson({ type: 'Feature', properties: {}, geometry: polygon })).toEqual(polygon);
    expect(
      boundaryFromGeoJson({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: polygon },
          { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] } },
          { type: 'Feature', geometry: polygon },
        ],
      })
    ).toEqual({ type: 'MultiPolygon', coordinates: [square, square] });
    expect(boundaryFromGeoJson({ type: 'Point', coordinates: [1, 2] })).toBeNull();
  });

  it('closes and rounds an ArcGIS ring', () => {
    expect(boundaryFromRings([[[72.1234567, 40.1], [72.2, 40.1], [72.2, 40.2]]])).toEqual({
      type: 'Polygon',
      coordinates: [[[72.123457, 40.1], [72.2, 40.1], [72.2, 40.2], [72.123457, 40.1]]],
    });
  });
});
