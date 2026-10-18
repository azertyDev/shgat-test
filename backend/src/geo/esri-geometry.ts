import type { Boundary, Position, Ring } from './boundary.validation.js';

/** Polygon in the format accepted by ArcGIS REST applyEdits (Web Mercator). */
export interface EsriPolygon {
  rings: Ring[];
  spatialReference: { wkid: 102100 };
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
  for (let i = 0; i < ring.length - 1; i++)
    s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
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
