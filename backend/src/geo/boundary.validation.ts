export type Position = [number, number];
export type Ring = Position[];

/** GeoJSON geometry accepted as a document boundary. */
export type Boundary =
  | { type: 'Polygon'; coordinates: Ring[] }
  | { type: 'MultiPolygon'; coordinates: Ring[][] };

// Uzbekistan bounding box (task spec, section 4.1)
const LON_RANGE = [55.9, 73.2];
const LAT_RANGE = [37.1, 45.6];

const isPosition = (p: unknown): p is Position =>
  Array.isArray(p) &&
  p.length >= 2 &&
  Number.isFinite(p[0]) &&
  Number.isFinite(p[1]);

/** Returns a user-facing error message, or null when the boundary is valid. */
export function validateBoundary(g: unknown): string | null {
  if (!g || typeof g !== 'object')
    return "Chegara GeoJSON obyekt bo'lishi kerak";
  const { type, coordinates } = g as { type?: unknown; coordinates?: unknown };
  if (type !== 'Polygon' && type !== 'MultiPolygon')
    return "Chegara turi Polygon yoki MultiPolygon bo'lishi kerak";
  if (!Array.isArray(coordinates) || coordinates.length === 0)
    return "Koordinatalar bo'sh";

  const polygons = (
    type === 'Polygon' ? [coordinates] : coordinates
  ) as unknown[];
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || polygon.length === 0)
      return "Poligonda halqa yo'q";
    for (const ring of polygon) {
      if (!Array.isArray(ring) || !ring.every(isPosition))
        return "Koordinatalar [uzunlik, kenglik] sonlar juftligi bo'lishi kerak";
      if (ring.length < 4) return "Halqada kamida 4 nuqta bo'lishi kerak";
      const [first, last] = [ring[0], ring[ring.length - 1]];
      if (first[0] !== last[0] || first[1] !== last[1])
        return "Halqa yopilmagan: birinchi va oxirgi nuqta bir xil bo'lishi kerak";
      if (
        ring.some(
          ([lon, lat]) =>
            lon < LON_RANGE[0] ||
            lon > LON_RANGE[1] ||
            lat < LAT_RANGE[0] ||
            lat > LAT_RANGE[1],
        )
      )
        return "Chegara O'zbekiston hududidan tashqarida";
    }
  }
  return null;
}
