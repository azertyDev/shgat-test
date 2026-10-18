import { validateBoundary, type Boundary } from './boundary.validation.js';

const andijan: Boundary = {
  type: 'Polygon',
  coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.81], [72.3, 40.75]]],
};

describe('validateBoundary', () => {
  it('accepts a valid Polygon and MultiPolygon', () => {
    expect(validateBoundary(andijan)).toBeNull();
    expect(validateBoundary({ type: 'MultiPolygon', coordinates: [andijan.coordinates] })).toBeNull();
  });

  it.each([
    ['wrong type', { type: 'Point', coordinates: [72.3, 40.75] }, 'Polygon yoki MultiPolygon'],
    ['not an object', 'abc', 'GeoJSON obyekt'],
    ['unclosed ring', { type: 'Polygon', coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.81]]] }, 'yopilmagan'],
    ['3 points', { type: 'Polygon', coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.3, 40.75]]] }, 'kamida 4'],
    ['Paris', { type: 'Polygon', coordinates: [[[2.29, 48.85], [2.4, 48.85], [2.4, 48.9], [2.29, 48.85]]] }, 'tashqarida'],
    ['not a number', { type: 'Polygon', coordinates: [[['a', 1], [1, 1], [1, 2], ['a', 1]]] }, 'sonlar'],
  ])('%s -> error', (_, g, message) => {
    expect(validateBoundary(g)).toContain(message);
  });
});
