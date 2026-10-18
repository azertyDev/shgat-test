import type { Chegara } from './types';

// Backend qoidalari bilan bir xil (backend/src/arizalar/chegara.ts): foydalanuvchi xatoni yuborishdan oldin ko'radi.

const LON = [55.9, 73.2];
const LAT = [37.1, 45.6];

const isPosition = (p: unknown): p is [number, number] =>
  Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);

export const TASHQARIDA = "Chegara O'zbekiston hududidan tashqarida";

export function validateChegara(g: unknown): string | null {
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
      if (ring.some(([lon, lat]) => lon < LON[0] || lon > LON[1] || lat < LAT[0] || lat > LAT[1])) return TASHQARIDA;
    }
  }
  return null;
}

type GeoObyekt = { type?: string; geometry?: GeoObyekt; features?: GeoObyekt[]; geometries?: GeoObyekt[]; coordinates?: unknown };

/** Geometry, Feature yoki FeatureCollection'dan poligon(lar)ni ajratadi. Bir nechta bo'lsa — MultiPolygon. */
export function geojsonDanChegara(obj: unknown): Chegara | null {
  const polygonlar: Chegara[] = [];
  const yigish = (o: GeoObyekt | undefined) => {
    if (!o || typeof o !== 'object') return;
    if (o.type === 'Polygon' || o.type === 'MultiPolygon') polygonlar.push(o as Chegara);
    else if (o.type === 'Feature') yigish(o.geometry);
    else if (o.type === 'FeatureCollection') o.features?.forEach(yigish);
    else if (o.type === 'GeometryCollection') o.geometries?.forEach(yigish);
  };
  yigish(obj as GeoObyekt);
  if (polygonlar.length <= 1) return polygonlar[0] ?? null;
  return {
    type: 'MultiPolygon',
    coordinates: polygonlar.flatMap((p) => (p.type === 'Polygon' ? [p.coordinates] : p.coordinates)),
  };
}

/** ArcGIS halqalari (gradusda) → GeoJSON Polygon: yaxlitlash va halqani yopish. */
export function halqalardanChegara(rings: number[][][]): Chegara {
  const r6 = (n: number) => Math.round(n * 1e6) / 1e6;
  return {
    type: 'Polygon',
    coordinates: rings.map((ring) => {
      const r = ring.map(([x, y]) => [r6(x), r6(y)] as [number, number]);
      const [a, b] = [r[0], r[r.length - 1]];
      return a[0] === b[0] && a[1] === b[1] ? r : [...r, a];
    }),
  };
}

/** GeoJSON → ArcGIS Polygon halqalari (spatialReference 4326). */
export const chegaraHalqalari = (g: Chegara): number[][][] =>
  g.type === 'Polygon' ? g.coordinates : g.coordinates.flat();
