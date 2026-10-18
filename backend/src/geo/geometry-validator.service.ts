import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Boundary } from './boundary.validation.js';

const VALID = 'Valid Geometry';

/** PostGIS reason -> user-facing message (Uzbek). Location "[lon lat]" is kept for the user. */
export function describeInvalidGeometry(reason: string): string {
  const at = /\[([\d.\s-]+)\]/.exec(reason)?.[1];
  const where = at ? ` (nuqta: ${at})` : '';
  if (reason.startsWith('Self-intersection'))
    return `Chegara o'zini kesib o'tadi${where}`;
  if (reason.startsWith('Too few points'))
    return `Chegara halqasida yetarlicha alohida nuqta yo'q${where}`;
  if (reason.startsWith('Hole lies outside shell'))
    return `Ichki halqa tashqi chegaradan tashqarida${where}`;
  if (
    reason.startsWith('Nested shells') ||
    reason.startsWith('Interior is disconnected')
  )
    return `Chegara qismlari bir-birining ichida yoki ustma-ust${where}`;
  return `Chegara geometriyasi noto'g'ri: ${reason}`;
}

/**
 * Topology check that plain JS rules (closed rings, 4+ points, bounding box) cannot do: self-intersections,
 * zero-area rings, holes outside the shell, overlapping parts. Runs ST_IsValidReason in PostGIS.
 */
@Injectable()
export class GeometryValidator {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns a user-facing message, or null when PostGIS considers the geometry valid. */
  async invalidReason(boundary: Boundary): Promise<string | null> {
    const [row] = await this.prisma.$queryRaw<{ reason: string }[]>`
      SELECT postgis.ST_IsValidReason(postgis.ST_GeomFromGeoJSON(${JSON.stringify(boundary)})) AS reason`;
    return !row || row.reason === VALID
      ? null
      : describeInvalidGeometry(row.reason);
  }
}
