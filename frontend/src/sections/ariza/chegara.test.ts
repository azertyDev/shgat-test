import { TASHQARIDA, validateChegara, geojsonDanChegara, halqalardanChegara } from './chegara';

const kvadrat = [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.81], [72.3, 40.75]]];

describe('chegara', () => {
  it("O'zbekistondan tashqari poligon — ogohlantirish", () => {
    expect(validateChegara({ type: 'Polygon', coordinates: kvadrat })).toBeNull();
    expect(
      validateChegara({ type: 'Polygon', coordinates: [[[2.29, 48.85], [2.4, 48.85], [2.4, 48.9], [2.29, 48.85]]] })
    ).toBe(TASHQARIDA);
  });

  it('Feature va FeatureCollection dan geometriya ajratadi', () => {
    const polygon = { type: 'Polygon', coordinates: kvadrat };
    expect(geojsonDanChegara({ type: 'Feature', properties: {}, geometry: polygon })).toEqual(polygon);
    expect(
      geojsonDanChegara({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: polygon },
          { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] } },
          { type: 'Feature', geometry: polygon },
        ],
      })
    ).toEqual({ type: 'MultiPolygon', coordinates: [kvadrat, kvadrat] });
    expect(geojsonDanChegara({ type: 'Point', coordinates: [1, 2] })).toBeNull();
  });

  it('ArcGIS halqasini yopadi va yaxlitlaydi', () => {
    expect(halqalardanChegara([[[72.1234567, 40.1], [72.2, 40.1], [72.2, 40.2]]])).toEqual({
      type: 'Polygon',
      coordinates: [[[72.123457, 40.1], [72.2, 40.1], [72.2, 40.2], [72.123457, 40.1]]],
    });
  });
});
