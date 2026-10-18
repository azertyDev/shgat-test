import type { PrismaService } from '../prisma/prisma.service.js';
import type { Boundary } from './boundary.validation.js';
import {
  describeInvalidGeometry,
  GeometryValidator,
} from './geometry-validator.service.js';

const square: Boundary = {
  type: 'Polygon',
  coordinates: [
    [
      [72.3, 40.75],
      [72.4, 40.75],
      [72.4, 40.81],
      [72.3, 40.81],
      [72.3, 40.75],
    ],
  ],
};

function validatorReturning(reason: string) {
  const $queryRaw = vi.fn(async () => [{ reason }]);
  return {
    validator: new GeometryValidator({ $queryRaw } as unknown as PrismaService),
    $queryRaw,
  };
}

describe('GeometryValidator', () => {
  it('returns null for a valid geometry', async () => {
    await expect(
      validatorReturning('Valid Geometry').validator.invalidReason(square),
    ).resolves.toBeNull();
  });

  it('passes the GeoJSON as a bound parameter, not as SQL text', async () => {
    const { validator, $queryRaw } = validatorReturning('Valid Geometry');
    await validator.invalidReason(square);
    const [strings, ...values] = $queryRaw.mock.calls[0] as unknown as [
      TemplateStringsArray,
      ...unknown[],
    ];
    expect(strings.join('?')).toContain(
      'postgis.ST_IsValidReason(postgis.ST_GeomFromGeoJSON(?))',
    );
    expect(values).toEqual([JSON.stringify(square)]);
  });

  it('explains a self-intersection', async () => {
    await expect(
      validatorReturning(
        'Self-intersection[72.35 40.78]',
      ).validator.invalidReason(square),
    ).resolves.toBe("Chegara o'zini kesib o'tadi (nuqta: 72.35 40.78)");
  });
});

describe('describeInvalidGeometry', () => {
  it.each([
    [
      'Too few points in geometry component[72.3 40.75]',
      "Chegara halqasida yetarlicha alohida nuqta yo'q (nuqta: 72.3 40.75)",
    ],
    [
      'Hole lies outside shell[72.5 40.9]',
      'Ichki halqa tashqi chegaradan tashqarida (nuqta: 72.5 40.9)',
    ],
    [
      'Nested shells[1 2]',
      'Chegara qismlari bir-birining ichida yoki ustma-ust (nuqta: 1 2)',
    ],
    [
      'Ring Self-intersection[1 2]',
      "Chegara geometriyasi noto'g'ri: Ring Self-intersection[1 2]",
    ],
  ])('%s', (reason, message) => {
    expect(describeInvalidGeometry(reason)).toBe(message);
  });
});
