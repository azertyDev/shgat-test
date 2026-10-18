type Position = [number, number];
type Ring = Position[];

export type Chegara =
  | { type: 'Polygon'; coordinates: Ring[] }
  | { type: 'MultiPolygon'; coordinates: Ring[][] };

export interface EsriPolygon {
  rings: Ring[];
  spatialReference: { wkid: 102100 };
}

// O'zbekiston hududi (topshiriq 4.1)
const LON = [55.9, 73.2];
const LAT = [37.1, 45.6];

const isPosition = (p: unknown): p is Position =>
  Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);

/** Xato matnini qaytaradi yoki chegara to'g'ri bo'lsa null. */
export function validateChegara(g: unknown): string | null {
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
      if (ring.some(([lon, lat]) => lon < LON[0] || lon > LON[1] || lat < LAT[0] || lat > LAT[1]))
        return 'Chegara O\'zbekiston hududidan tashqarida';
    }
  }
  return null;
}

const R = 6378137;

/** WGS-84 (4326) → Web Mercator (3857), metrlarda. */
export function toWebMercator([lon, lat]: Position): Position {
  return [
    (lon * Math.PI * R) / 180,
    R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
  ];
}

/** Shoelace: musbat — soat miliga teskari, manfiy — soat mili bo'yicha (y yuqoriga). */
export function signedArea(ring: Ring): number {
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return s / 2;
}

/**
 * GeoJSON → Esri JSON. Esri'da tashqi halqa soat mili bo'yicha, ichki (teshik) — teskari;
 * GeoJSON (RFC 7946) aksincha, lekin fayllar har doim ham qoidaga amal qilmaydi, shuning uchun yo'nalish hisoblanadi.
 */
export function toEsriPolygon(g: Chegara): EsriPolygon {
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
