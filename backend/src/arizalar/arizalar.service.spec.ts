import { HttpException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma.service.js';
import { ArcgisXatosi, type ArcgisService } from './arcgis.service.js';
import { ArizalarService } from './arizalar.service.js';

const ariza = {
  id: 1,
  hujjat_nomi: 'Andijon shahri bosh rejasi',
  hujjat_turi: 'БР',
  soato_kodi: '1703401',
  tasdiq_sanasi: new Date('2026-03-12T00:00:00Z'),
  tasdiq_hujjati: '123-son qaror',
  chegara: { type: 'Polygon', coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.81], [72.3, 40.75]]] },
  holat: 'yuborilgan',
  id_raqam: null,
  arcgis_object_id: null,
};

const status = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return { status: (e as HttpException).getStatus(), body: (e as HttpException).getResponse() as any };
  }
  throw new Error('xato kutilgan edi');
};

function yarat(ustidan: Partial<typeof ariza> = {}) {
  const prisma = {
    ariza: {
      findUnique: vi.fn(async ({ where }: any) => (where.id === 1 ? { ...ariza, ...ustidan } : null)),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
  };
  const arcgis = { yoz: vi.fn(async () => 555) };
  const service = new ArizalarService(prisma as unknown as PrismaService, arcgis as unknown as ArcgisService);
  return { service, prisma, arcgis };
}

describe('ArizalarService.tasdiqla', () => {
  it('ID yaratadi, ArcGISga yozadi, keyin holatni o\'zgartiradi', async () => {
    const { service, prisma, arcgis } = yarat();
    await expect(service.tasdiqla(1)).resolves.toEqual({ id_raqam: 'БР-1703401-2026', arcgis_object_id: 555 });

    const [idRaqam, description, geometry] = arcgis.yoz.mock.calls[0] as unknown as [string, string, any];
    expect(idRaqam).toBe('БР-1703401-2026');
    expect(description).toBe('БР-1703401-2026 | Andijon shahri bosh rejasi');
    expect(geometry.spatialReference.wkid).toBe(102100);
    expect(prisma.ariza.updateMany).toHaveBeenCalledWith({
      where: { id: 1, holat: 'yuborilgan' },
      data: { holat: 'hisobga_olingan', id_raqam: 'БР-1703401-2026', arcgis_object_id: 555 },
    });
  });

  it('description 75 belgiga qisqartiriladi', async () => {
    const { service, arcgis } = yarat({ hujjat_nomi: 'А'.repeat(200) });
    await service.tasdiqla(1);
    expect((arcgis.yoz.mock.calls[0] as unknown as string[])[1]).toHaveLength(75);
  });

  it('ID band bo\'lsa — 409, ArcGISga yozilmaydi', async () => {
    const { service, prisma, arcgis } = yarat();
    prisma.ariza.findUnique.mockImplementation(async ({ where }: any) =>
      where.id === 1 ? ariza : where.id_raqam ? { ...ariza, id: 7 } : null,
    );
    const x = await status(service.tasdiqla(1));
    expect(x.status).toBe(409);
    expect(x.body.xato).toContain('БР-1703401-2026');
    expect(arcgis.yoz).not.toHaveBeenCalled();
  });

  it('ArcGIS xatosi — 502, holat va ID saqlanmaydi', async () => {
    const { service, prisma, arcgis } = yarat();
    arcgis.yoz.mockRejectedValueOnce(new ArcgisXatosi('HTTP 503'));
    expect((await status(service.tasdiqla(1))).status).toBe(502);
    expect(prisma.ariza.updateMany).not.toHaveBeenCalled();
  });

  it('parallel tasdiqlashda unique cheklov — 409', async () => {
    const { service, prisma } = yarat();
    prisma.ariza.updateMany.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: 'test' }),
    );
    expect((await status(service.tasdiqla(1))).status).toBe(409);
  });

  it.each(['hisobga_olingan', 'qaytarilgan'])("holat %s — 409", async (holat) => {
    const { service, arcgis } = yarat({ holat });
    expect((await status(service.tasdiqla(1))).status).toBe(409);
    expect(arcgis.yoz).not.toHaveBeenCalled();
  });

  it("ariza yo'q — 404", async () => {
    expect((await status(yarat().service.tasdiqla(99))).status).toBe(404);
  });
});

describe('ArizalarService.qaytar', () => {
  it.each([undefined, {}, { sabab: '   ' }])('sababsiz — 422 (%j)', async (body) => {
    const x = await status(yarat().service.qaytar(1, body));
    expect(x.status).toBe(422);
    expect(x.body.maydonlar.sabab).toBeDefined();
  });

  it('yuborilgan → qaytarilgan', async () => {
    const { service, prisma } = yarat();
    await expect(service.qaytar(1, { sabab: ' Chegara noto\'g\'ri ' })).resolves.toEqual({ id: 1, holat: 'qaytarilgan' });
    expect(prisma.ariza.updateMany).toHaveBeenCalledWith({
      where: { id: 1, holat: 'yuborilgan' },
      data: { holat: 'qaytarilgan', qaytarish_sababi: "Chegara noto'g'ri" },
    });
  });
});

describe('ArizalarService.yarat validatsiyasi', () => {
  const pdf = (size = 100) => [{ size, buffer: Buffer.from('%PDF-1.7'), originalname: 'a.pdf' }] as any;
  const fayllar = { asosiy_chizma: pdf(), tushuntirish_xati: pdf(), tasdiqlovchi_hujjat: pdf() };
  const data = { ...ariza, tasdiq_sanasi: '2026-03-12' };

  it("noto'g'ri SOATO va 25 MB fayl — 422, maydon nomlari bilan", async () => {
    const x = await status(
      yarat().service.yarat(JSON.stringify({ ...data, soato_kodi: '9999999' }), { ...fayllar, tushuntirish_xati: pdf(25 * 1024 * 1024) }),
    );
    expect(x.status).toBe(422);
    expect(x.body.maydonlar).toEqual({ soato_kodi: "SOATO ro'yxatida yo'q", tushuntirish_xati: 'Fayl hajmi 20 MB dan oshmasin' });
  });

  it('kelajakdagi sana, noma\'lum tur, yopilmagan halqa — 422', async () => {
    const x = await status(
      yarat().service.yarat(
        JSON.stringify({
          ...data,
          hujjat_turi: 'XX',
          tasdiq_sanasi: '2999-01-01',
          chegara: { type: 'Polygon', coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.81]]] },
        }),
        fayllar,
      ),
    );
    expect(Object.keys(x.body.maydonlar).sort()).toEqual(['chegara', 'hujjat_turi', 'tasdiq_sanasi']);
  });

  it("JSON emas va fayllarsiz — 422", async () => {
    const x = await status(yarat().service.yarat('{bad', {}));
    expect(Object.keys(x.body.maydonlar).sort()).toEqual(['asosiy_chizma', 'data', 'tasdiqlovchi_hujjat', 'tushuntirish_xati']);
  });
});
