import { HttpException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ArcgisError, type ArcgisService } from '../arcgis/arcgis.service.js';
import { ApplicationsService } from './applications.service.js';

const application = {
  id: 1,
  documentName: 'Andijon shahri bosh rejasi',
  documentType: 'БР',
  soatoCode: '1703401',
  approvalDate: new Date('2026-03-12T00:00:00Z'),
  approvalDecree: '123-son qaror',
  boundary: { type: 'Polygon', coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.81], [72.3, 40.75]]] },
  status: 'SUBMITTED',
  registrationNumber: null,
  arcgisObjectId: null,
  arcgisAttemptAt: null as Date | null,
};

/** Resolves the HttpException a promise rejects with. */
const httpError = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return { status: (e as HttpException).getStatus(), body: (e as HttpException).getResponse() as any };
  }
  throw new Error('expected an error');
};

function setup(overrides: Partial<typeof application> = {}) {
  const prisma = {
    application: {
      findUnique: vi.fn(async ({ where }: any) => (where.id === 1 ? { ...application, ...overrides } : null)),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
  };
  const arcgis = { addFeature: vi.fn(async () => 555) };
  const service = new ApplicationsService(prisma as unknown as PrismaService, arcgis as unknown as ArcgisService);
  return { service, prisma, arcgis };
}

describe('ApplicationsService.approve', () => {
  it('builds the number, writes to ArcGIS, then changes the status', async () => {
    const { service, prisma, arcgis } = setup();
    await expect(service.approve(1)).resolves.toEqual({ id_raqam: 'БР-1703401-2026', arcgis_object_id: 555 });

    const [description, geometry, firstAttemptAt] = arcgis.addFeature.mock.calls[0] as unknown as [string, any, Date];
    expect(description).toBe('БР-1703401-2026 | Andijon shahri bosh rejasi');
    expect(geometry.spatialReference.wkid).toBe(102100);
    expect(prisma.application.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { arcgisAttemptAt: firstAttemptAt } });
    expect(prisma.application.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'SUBMITTED' },
      data: { status: 'REGISTERED', registrationNumber: 'БР-1703401-2026', arcgisObjectId: 555 },
    });
  });

  it('truncates the description to 75 characters', async () => {
    const { service, arcgis } = setup({ documentName: 'А'.repeat(200) });
    await service.approve(1);
    expect((arcgis.addFeature.mock.calls[0] as unknown as string[])[0]).toHaveLength(75);
  });

  it('returns 409 for a taken number without writing to ArcGIS', async () => {
    const { service, prisma, arcgis } = setup();
    prisma.application.findUnique.mockImplementation(async ({ where }: any) =>
      where.id === 1 ? application : where.registrationNumber ? { ...application, id: 7 } : null,
    );
    const error = await httpError(service.approve(1));
    expect(error.status).toBe(409);
    expect(error.body.xato).toContain('БР-1703401-2026');
    expect(arcgis.addFeature).not.toHaveBeenCalled();
  });

  it('returns 502 on an ArcGIS failure and keeps the status and number', async () => {
    const { service, prisma, arcgis } = setup();
    arcgis.addFeature.mockRejectedValueOnce(new ArcgisError('HTTP 503'));
    expect((await httpError(service.approve(1))).status).toBe(502);
    expect(prisma.application.updateMany).not.toHaveBeenCalled();
  });

  it('reuses the first attempt time on retry', async () => {
    const firstAttemptAt = new Date('2026-10-18T08:00:00Z');
    const { service, prisma, arcgis } = setup({ arcgisAttemptAt: firstAttemptAt });
    await service.approve(1);
    expect((arcgis.addFeature.mock.calls[0] as unknown as [string, any, Date])[2]).toBe(firstAttemptAt);
    expect(prisma.application.update).not.toHaveBeenCalled();
  });

  it('returns 409 when a concurrent approval hits the unique constraint', async () => {
    const { service, prisma } = setup();
    prisma.application.updateMany.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: 'test' }),
    );
    expect((await httpError(service.approve(1))).status).toBe(409);
  });

  it.each(['REGISTERED', 'RETURNED'])('returns 409 for status %s', async (status) => {
    const { service, arcgis } = setup({ status });
    expect((await httpError(service.approve(1))).status).toBe(409);
    expect(arcgis.addFeature).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown application', async () => {
    expect((await httpError(setup().service.approve(99))).status).toBe(404);
  });
});

describe('ApplicationsService.returnToApplicant', () => {
  it.each([undefined, {}, { sabab: '   ' }])('requires a reason (%j) -> 422', async (body) => {
    const error = await httpError(setup().service.returnToApplicant(1, body));
    expect(error.status).toBe(422);
    expect(error.body.maydonlar.sabab).toBeDefined();
  });

  it('moves SUBMITTED to RETURNED', async () => {
    const { service, prisma } = setup();
    await expect(service.returnToApplicant(1, { sabab: " Chegara noto'g'ri " })).resolves.toEqual({ id: 1, holat: 'qaytarilgan' });
    expect(prisma.application.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'SUBMITTED' },
      data: { status: 'RETURNED', returnReason: "Chegara noto'g'ri" },
    });
  });
});

describe('ApplicationsService.create validation', () => {
  const pdf = (size = 100) => [{ size, buffer: Buffer.from('%PDF-1.7'), originalname: 'a.pdf' }] as any;
  const files = { asosiy_chizma: pdf(), tushuntirish_xati: pdf(), tasdiqlovchi_hujjat: pdf() };
  // request body uses the wire names of the API contract
  const payload = {
    hujjat_nomi: 'Andijon shahri bosh rejasi',
    hujjat_turi: 'БР',
    soato_kodi: '1703401',
    tasdiq_sanasi: '2026-03-12',
    tasdiq_hujjati: '123-son qaror',
    chegara: application.boundary,
  };

  it('unknown SOATO and a 25 MB file -> 422 with field names', async () => {
    const error = await httpError(
      setup().service.create(JSON.stringify({ ...payload, soato_kodi: '9999999' }), {
        ...files,
        tushuntirish_xati: pdf(25 * 1024 * 1024),
      }),
    );
    expect(error.status).toBe(422);
    expect(error.body.maydonlar).toEqual({
      soato_kodi: "SOATO ro'yxatida yo'q",
      tushuntirish_xati: 'Fayl hajmi 20 MB dan oshmasin',
    });
  });

  it('future date, unknown type, unclosed ring -> 422', async () => {
    const error = await httpError(
      setup().service.create(
        JSON.stringify({
          ...payload,
          hujjat_turi: 'XX',
          tasdiq_sanasi: '2999-01-01',
          chegara: { type: 'Polygon', coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.81]]] },
        }),
        files,
      ),
    );
    expect(Object.keys(error.body.maydonlar).sort()).toEqual(['chegara', 'hujjat_turi', 'tasdiq_sanasi']);
  });

  it('invalid JSON and no files -> 422', async () => {
    const error = await httpError(setup().service.create('{bad', {}));
    expect(Object.keys(error.body.maydonlar).sort()).toEqual(['asosiy_chizma', 'data', 'tasdiqlovchi_hujjat', 'tushuntirish_xati']);
  });
});

describe('ApplicationsService.list validation', () => {
  it.each(['toString', 'constructor', 'SUBMITTED'])('rejects status filter %s with 422', async (holat) => {
    expect((await httpError(setup().service.list({ holat }))).status).toBe(422);
  });
});
