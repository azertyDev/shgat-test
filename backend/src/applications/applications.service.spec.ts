import { HttpException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ArcgisError, type ArcgisService } from '../arcgis/arcgis.service.js';
import { SoatoService } from '../soato/soato.service.js';
import { FileStorageService } from '../storage/file-storage.service.js';
import { ApplicationsService } from './applications.service.js';

const application = {
  id: 1,
  documentName: 'Andijon shahri bosh rejasi',
  documentType: 'БР',
  soatoCode: '1703401',
  approvalDate: new Date('2026-03-12T00:00:00Z'),
  approvalDecree: '123-son qaror',
  boundary: {
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
  },
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
    return {
      status: (e as HttpException).getStatus(),
      body: (e as HttpException).getResponse() as any,
    };
  }
  throw new Error('expected an error');
};

function setup(overrides: Partial<typeof application> = {}) {
  const prisma = {
    application: {
      findUnique: vi.fn(async ({ where }: any) =>
        where.id === 1 ? { ...application, ...overrides } : null,
      ),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 1 })),
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
    },
    applicationFile: {
      findUnique: vi.fn(async (): Promise<any> => ({
        kind: 'MAIN_DRAWING',
        storagePath: 'main_drawing-old.pdf',
        mimeType: 'application/pdf',
      })),
      upsert: vi.fn(async () => ({})),
    },
    // array form for list(), callback form (interactive transaction) for create/resubmit
    $transaction: vi.fn(async (arg: any): Promise<any> =>
      typeof arg === 'function' ? arg(prisma) : Promise.all(arg),
    ),
  };
  const arcgis = {
    addFeature: vi.fn(async () => 555),
    deleteFeature: vi.fn(async () => undefined),
  };
  const storage = {
    save: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    exists: vi.fn(async () => false),
    absolutePath: (p: string) => `/uploads/${p}`,
  };
  const service = new ApplicationsService(
    prisma as unknown as PrismaService,
    arcgis as unknown as ArcgisService,
    new SoatoService(),
    storage as unknown as FileStorageService,
  );
  return { service, prisma, arcgis, storage };
}

describe('ApplicationsService.approve', () => {
  it('builds the number, writes to ArcGIS, then changes the status', async () => {
    const { service, prisma, arcgis } = setup();
    await expect(service.approve(1)).resolves.toEqual({
      id_raqam: 'БР-1703401-2026',
      arcgis_object_id: 555,
    });

    const [description, geometry, firstAttemptAt, isRetry] = arcgis.addFeature
      .mock.calls[0] as unknown as [string, any, Date, boolean];
    expect(isRetry).toBe(false);
    expect(description).toBe('БР-1703401-2026 | Andijon shahri bosh rejasi');
    expect(geometry.spatialReference.wkid).toBe(102100);
    expect(prisma.application.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { arcgisAttemptAt: firstAttemptAt },
    });
    expect(prisma.application.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'SUBMITTED' },
      data: {
        status: 'REGISTERED',
        registrationNumber: 'БР-1703401-2026',
        arcgisObjectId: 555,
      },
    });
  });

  it('truncates the description to 75 characters', async () => {
    const { service, arcgis } = setup({ documentName: 'А'.repeat(200) });
    await service.approve(1);
    expect(
      (arcgis.addFeature.mock.calls[0] as unknown as string[])[0],
    ).toHaveLength(75);
  });

  it('returns 409 for a taken number without writing to ArcGIS', async () => {
    const { service, prisma, arcgis } = setup();
    prisma.application.findUnique.mockImplementation(async ({ where }: any) =>
      where.id === 1
        ? application
        : where.registrationNumber
          ? { ...application, id: 7 }
          : null,
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
    const { service, prisma, arcgis } = setup({
      arcgisAttemptAt: firstAttemptAt,
    });
    await service.approve(1);
    const [, , attemptAt, isRetry] = arcgis.addFeature.mock
      .calls[0] as unknown as [string, any, Date, boolean];
    expect(attemptAt).toBe(firstAttemptAt);
    expect(isRetry).toBe(true);
    expect(prisma.application.update).not.toHaveBeenCalled();
  });

  it('returns 409 on a unique-constraint race and removes the written feature', async () => {
    const { service, prisma, arcgis } = setup();
    prisma.application.updateMany.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    expect((await httpError(service.approve(1))).status).toBe(409);
    expect(arcgis.deleteFeature).toHaveBeenCalledWith(555);
  });

  it('removes the written feature when the status changed meanwhile (409)', async () => {
    const { service, prisma, arcgis } = setup();
    prisma.application.updateMany.mockResolvedValueOnce({ count: 0 });
    expect((await httpError(service.approve(1))).status).toBe(409);
    expect(arcgis.deleteFeature).toHaveBeenCalledWith(555);
  });

  it('keeps the original 409 when removing the feature fails', async () => {
    const { service, prisma, arcgis } = setup();
    prisma.application.updateMany.mockResolvedValueOnce({ count: 0 });
    arcgis.deleteFeature.mockRejectedValueOnce(new Error('HTTP 503'));
    expect((await httpError(service.approve(1))).status).toBe(409);
  });

  it('does not delete anything after a successful approval', async () => {
    const { service, arcgis } = setup();
    await service.approve(1);
    expect(arcgis.deleteFeature).not.toHaveBeenCalled();
  });

  it.each(['REGISTERED', 'RETURNED'])(
    'returns 409 for status %s',
    async (status) => {
      const { service, arcgis } = setup({ status });
      expect((await httpError(service.approve(1))).status).toBe(409);
      expect(arcgis.addFeature).not.toHaveBeenCalled();
    },
  );

  it('returns 404 for an unknown application', async () => {
    expect((await httpError(setup().service.approve(99))).status).toBe(404);
  });
});

describe('ApplicationsService.returnToApplicant', () => {
  it.each([undefined, {}, { sabab: '   ' }])(
    'requires a reason (%j) -> 422',
    async (body) => {
      const error = await httpError(setup().service.returnToApplicant(1, body));
      expect(error.status).toBe(422);
      expect(error.body.maydonlar.sabab).toBeDefined();
    },
  );

  it('moves SUBMITTED to RETURNED', async () => {
    const { service, prisma } = setup();
    await expect(
      service.returnToApplicant(1, { sabab: " Chegara noto'g'ri " }),
    ).resolves.toEqual({ id: 1, holat: 'qaytarilgan' });
    expect(prisma.application.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'SUBMITTED' },
      data: { status: 'RETURNED', returnReason: "Chegara noto'g'ri" },
    });
  });
});

describe('ApplicationsService.create validation', () => {
  const pdf = (size = 100) =>
    [{ size, buffer: Buffer.from('%PDF-1.7'), originalname: 'a.pdf' }] as any;
  const files = {
    asosiy_chizma: pdf(),
    tushuntirish_xati: pdf(),
    tasdiqlovchi_hujjat: pdf(),
  };
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
      setup().service.create(
        JSON.stringify({ ...payload, soato_kodi: '9999999' }),
        {
          ...files,
          tushuntirish_xati: pdf(25 * 1024 * 1024),
        },
      ),
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
          chegara: {
            type: 'Polygon',
            coordinates: [
              [
                [72.3, 40.75],
                [72.4, 40.75],
                [72.4, 40.81],
                [72.3, 40.81],
              ],
            ],
          },
        }),
        files,
      ),
    );
    expect(Object.keys(error.body.maydonlar).sort()).toEqual([
      'chegara',
      'hujjat_turi',
      'tasdiq_sanasi',
    ]);
  });

  it('invalid JSON and no files -> 422', async () => {
    const error = await httpError(setup().service.create('{bad', {}));
    expect(Object.keys(error.body.maydonlar).sort()).toEqual([
      'asosiy_chizma',
      'data',
      'tasdiqlovchi_hujjat',
      'tushuntirish_xati',
    ]);
  });
});

describe('ApplicationsService.list validation', () => {
  it('clamps a huge page number so skip stays a safe integer', async () => {
    const { service, prisma } = setup();
    await service.list({ sahifa: '99999999999999999999', hajm: '20' });
    const { skip } = (
      prisma.application.findMany.mock.calls[0] as unknown as [{ skip: number }]
    )[0];
    expect(Number.isSafeInteger(skip)).toBe(true);
    expect(skip).toBe((1_000_000 - 1) * 20);
  });

  it.each(['toString', 'constructor', 'SUBMITTED'])(
    'rejects status filter %s with 422',
    async (holat) => {
      expect((await httpError(setup().service.list({ holat }))).status).toBe(
        422,
      );
    },
  );
});

describe('ApplicationsService.getFile', () => {
  it('returns 404 when the stored file is missing on disk', async () => {
    const error = await httpError(setup().service.getFile(1, 'asosiy_chizma'));
    expect(error.status).toBe(404);
    expect(error.body).toEqual({ xato: 'Fayl topilmadi' });
  });

  it('returns 404 for an unknown file field', async () => {
    expect((await httpError(setup().service.getFile(1, 'boshqa'))).status).toBe(
      404,
    );
  });
});

describe('ApplicationsService file lifecycle', () => {
  const pdf = () =>
    [
      { size: 10, buffer: Buffer.from('%PDF-1.7'), originalname: 'a.pdf' },
    ] as any;
  const payload = JSON.stringify({
    hujjat_nomi: 'Andijon shahri bosh rejasi',
    hujjat_turi: 'БР',
    soato_kodi: '1703401',
    tasdiq_sanasi: '2026-03-12',
    tasdiq_hujjati: '123-son qaror',
    chegara: application.boundary,
  });
  const allFiles = () => ({
    asosiy_chizma: pdf(),
    tushuntirish_xati: pdf(),
    tasdiqlovchi_hujjat: pdf(),
  });
  const savedPaths = (storage: ReturnType<typeof setup>['storage']) =>
    storage.save.mock.calls.map((c) => (c as unknown as [string])[0]);

  it('create: writes files under unique names before the transaction and keeps them on success', async () => {
    const { service, prisma, storage } = setup();
    (prisma.application as any).create = vi.fn(async () => ({
      id: 9,
      status: 'SUBMITTED',
    }));
    prisma.applicationFile.findUnique.mockResolvedValue(null);

    await expect(service.create(payload, allFiles())).resolves.toEqual({
      id: 9,
      holat: 'yuborilgan',
    });
    const paths = savedPaths(storage);
    expect(paths).toHaveLength(3);
    expect(new Set(paths).size).toBe(3);
    expect(paths[0]).toMatch(/^main_drawing-[0-9a-f-]{36}\.pdf$/);
    expect(prisma.applicationFile.upsert).toHaveBeenCalledTimes(3);
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('create: removes the written files when the transaction fails', async () => {
    const { service, prisma, storage } = setup();
    (prisma.application as any).create = vi.fn(async () => {
      throw new Error('db down');
    });

    await expect(service.create(payload, allFiles())).rejects.toThrow(
      'db down',
    );
    expect(
      storage.remove.mock.calls
        .map((c) => (c as unknown as [string])[0])
        .sort(),
    ).toEqual(savedPaths(storage).sort());
  });

  it('create: removes already written files when a later write fails', async () => {
    const { service, storage, prisma } = setup();
    storage.save
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('ENOSPC'));

    await expect(service.create(payload, allFiles())).rejects.toThrow('ENOSPC');
    expect(storage.remove).toHaveBeenCalledWith(savedPaths(storage)[0]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('resubmit: removes the replaced file only after the commit', async () => {
    const { service, storage, prisma } = setup({ status: 'RETURNED' });

    await expect(
      service.resubmit(1, payload, { asosiy_chizma: pdf() }),
    ).resolves.toEqual({ id: 1, holat: 'yuborilgan' });
    expect(prisma.applicationFile.upsert).toHaveBeenCalledTimes(1);
    expect(storage.remove).toHaveBeenCalledWith('main_drawing-old.pdf');
    expect(storage.remove).not.toHaveBeenCalledWith(savedPaths(storage)[0]);
  });

  it('resubmit: on 409 removes the new file and keeps the old one', async () => {
    const { service, storage, prisma } = setup({ status: 'RETURNED' });
    prisma.application.updateMany.mockResolvedValueOnce({ count: 0 });

    expect(
      (await httpError(service.resubmit(1, payload, { asosiy_chizma: pdf() })))
        .status,
    ).toBe(409);
    expect(storage.remove).toHaveBeenCalledWith(savedPaths(storage)[0]);
    expect(storage.remove).not.toHaveBeenCalledWith('main_drawing-old.pdf');
  });
});
