type Position = [number, number];
type Ring = Position[];

/** GeoJSON geometry accepted as a document boundary. */
export type Boundary =
  | { type: 'Polygon'; coordinates: Ring[] }
  | { type: 'MultiPolygon'; coordinates: Ring[][] };

export interface EsriPolygon {
  rings: Ring[];
  spatialReference: { wkid: 102100 };
}

// Uzbekistan bounding box (task spec, section 4.1)
const LON_RANGE = [55.9, 73.2];
const LAT_RANGE = [37.1, 45.6];

const isPosition = (p: unknown): p is Position =>
  Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);

/** Returns a user-facing error message, or null when the boundary is valid. */
export function validateBoundary(g: unknown): string | null {
  if (!g || typeof g !== 'object') return 'Chegara GeoJSON obyekt bo\'lishi kerak';
  const { type, coordinates } = g as { type?: unknown; coordinates?: unknown };
  if (type !== 'Polygon' && type !== 'MultiPolygon') return 'Chegara turi Polygon yoki MultiPolygon bo\'lishi kerak';
  if (!Array.isArray(coordinates) || coordinates.length === 0) return 'Koordinatalar bo\'sh';

  const polygons = (type === 'Polygon' ? [coordinates] : coordinates) as unknown[];
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || polygon.length === 0) return 'Poligonda halqa yo\'q';
    for (const ring of polygon) {
      if (!Array.isArray(ring) || !ring.every(isPosition)) return 'Koordinatalar [uzunlik, kenglik] sonlar juftligi bo\'lishi kerak';
      if (ring.length < 4) return 'Halqada kamida 4 nuqta bo\'lishi kerak';
      const [first, last] = [ring[0], ring[ring.length - 1]];
      if (first[0] !== last[0] || first[1] !== last[1]) return 'Halqa yopilmagan: birinchi va oxirgi nuqta bir xil bo\'lishi kerak';
      if (ring.some(([lon, lat]) => lon < LON_RANGE[0] || lon > LON_RANGE[1] || lat < LAT_RANGE[0] || lat > LAT_RANGE[1]))
        return 'Chegara O\'zbekiston hududidan tashqarida';
    }
  }
  return null;
}

const EARTH_RADIUS = 6378137;

/** WGS-84 (4326) -> Web Mercator (3857), in metres. */
export function toWebMercator([lon, lat]: Position): Position {
  return [
    (lon * Math.PI * EARTH_RADIUS) / 180,
    EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
  ];
}

/** Shoelace formula: positive for counter-clockwise, negative for clockwise rings (y axis up). */
export function signedArea(ring: Ring): number {
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return s / 2;
}

/**
 * GeoJSON -> Esri JSON. Esri wants outer rings clockwise and holes counter-clockwise; GeoJSON (RFC 7946)
 * is the other way round, but real files do not always follow it, so the orientation is computed.
 */
export function toEsriPolygon(g: Boundary): EsriPolygon {
  const polygons = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  const rings = polygons.flatMap((polygon) =>
    polygon.map((ring, i) => {
      const projected = ring.map(toWebMercator);
      const clockwise = signedArea(projected) < 0;
      return clockwise === (i === 0) ? projected : projected.reverse();
    }),
  );
  return { rings, spatialReference: { wkid: 102100 } };
}
