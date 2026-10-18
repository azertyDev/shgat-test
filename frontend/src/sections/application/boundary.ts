import type { Boundary } from './types';

// Same rules as the backend (backend/src/applications/boundary.ts), so the user sees errors before sending.

const LON_RANGE = [55.9, 73.2];
const LAT_RANGE = [37.1, 45.6];

const isPosition = (p: unknown): p is [number, number] =>
  Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);

export const OUTSIDE_UZBEKISTAN = "Chegara O'zbekiston hududidan tashqarida";

/** Returns a user-facing error message, or null when the boundary is valid. */
export function validateBoundary(g: unknown): string | null {
  if (!g || typeof g !== 'object') return "Chegara GeoJSON obyekt bo'lishi kerak";
  const { type, coordinates } = g as { type?: unknown; coordinates?: unknown };
  if (type !== 'Polygon' && type !== 'MultiPolygon') return "Chegara turi Polygon yoki MultiPolygon bo'lishi kerak";
  if (!Array.isArray(coordinates) || coordinates.length === 0) return "Koordinatalar bo'sh";
  const polygons = (type === 'Polygon' ? [coordinates] : coordinates) as unknown[];
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || polygon.length === 0) return "Poligonda halqa yo'q";
    for (const ring of polygon) {
      if (!Array.isArray(ring) || !ring.every(isPosition))
        return "Koordinatalar [uzunlik, kenglik] sonlar juftligi bo'lishi kerak";
      if (ring.length < 4) return "Halqada kamida 4 nuqta bo'lishi kerak";
      const [first, last] = [ring[0], ring[ring.length - 1]];
      if (first[0] !== last[0] || first[1] !== last[1]) return 'Halqa yopilmagan';
      if (ring.some(([lon, lat]) => lon < LON_RANGE[0] || lon > LON_RANGE[1] || lat < LAT_RANGE[0] || lat > LAT_RANGE[1]))
        return OUTSIDE_UZBEKISTAN;
    }
  }
  return null;
}

type GeoJsonObject = {
  type?: string;
  geometry?: GeoJsonObject;
  features?: GeoJsonObject[];
  geometries?: GeoJsonObject[];
  coordinates?: unknown;
};

/** Extracts polygon(s) from a Geometry, Feature or FeatureCollection. Several polygons become a MultiPolygon. */
export function boundaryFromGeoJson(obj: unknown): Boundary | null {
  const polygons: Boundary[] = [];
  const collect = (o: GeoJsonObject | undefined) => {
    if (!o || typeof o !== 'object') return;
    if (o.type === 'Polygon' || o.type === 'MultiPolygon') polygons.push(o as Boundary);
    else if (o.type === 'Feature') collect(o.geometry);
    else if (o.type === 'FeatureCollection') o.features?.forEach(collect);
    else if (o.type === 'GeometryCollection') o.geometries?.forEach(collect);
  };
  collect(obj as GeoJsonObject);
  if (polygons.length <= 1) return polygons[0] ?? null;
  return {
    type: 'MultiPolygon',
    coordinates: polygons.flatMap((p) => (p.type === 'Polygon' ? [p.coordinates] : p.coordinates)),
  };
}

/** ArcGIS rings (in degrees) -> GeoJSON Polygon: rounds coordinates and closes the rings. */
export function boundaryFromRings(rings: number[][][]): Boundary {
  const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
  return {
    type: 'Polygon',
    coordinates: rings.map((ring) => {
      const r = ring.map(([x, y]) => [round6(x), round6(y)] as [number, number]);
      const [first, last] = [r[0], r[r.length - 1]];
      return first[0] === last[0] && first[1] === last[1] ? r : [...r, first];
    }),
  };
}

/** GeoJSON -> ArcGIS Polygon rings (spatialReference 4326). */
export const boundaryRings = (g: Boundary): number[][][] =>
  g.type === 'Polygon' ? g.coordinates : g.coordinates.flat();
