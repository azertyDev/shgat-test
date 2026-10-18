import { ArcgisService, ArcgisXatosi } from './arcgis.service.js';
import { toEsriPolygon } from './chegara.js';

const geom = toEsriPolygon({
  type: 'Polygon',
  coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.81], [72.3, 40.75]]],
});
const javob = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe('ArcgisService.yoz', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const amal = (i: number) => String(fetchMock.mock.calls[i][0]).split('/').pop();

  it("obyekt yo'q bo'lsa applyEdits bilan qo'shadi va objectId qaytaradi", async () => {
    fetchMock
      .mockResolvedValueOnce(javob({ objectIds: null }))
      .mockResolvedValueOnce(javob({ addResults: [{ success: true, objectId: 42 }] }));

    await expect(new ArcgisService().yoz('БР-1703401-2026', 'БР-1703401-2026 | test', geom)).resolves.toBe(42);
    expect([amal(0), amal(1)]).toEqual(['query', 'applyEdits']);
    const body = fetchMock.mock.calls[1][1]!.body as URLSearchParams;
    expect(body.get('f')).toBe('json');
    const [add] = JSON.parse(body.get('adds')!);
    expect(add.attributes).toEqual({ description: 'БР-1703401-2026 | test', symbolid: 0 });
    expect(add.geometry.spatialReference.wkid).toBe(102100);
  });

  it('timeoutdan keyin qayta urinishda ikkinchi obyekt yaratmaydi', async () => {
    fetchMock
      .mockResolvedValueOnce(javob({ objectIds: null }))
      .mockRejectedValueOnce(new DOMException('timeout', 'TimeoutError')) // obyekt yaratildi, javob kelmadi
      .mockResolvedValueOnce(javob({ objectIds: [77] }));

    await expect(new ArcgisService().yoz('БР-1703401-2026', 'x', geom)).resolves.toBe(77);
    expect(fetchMock.mock.calls.map((_, i) => amal(i))).toEqual(['query', 'applyEdits', 'query']);
  });

  it('har urinish xato bersa ArcgisXatosi', async () => {
    fetchMock.mockImplementation(async () => javob({ error: { code: 500, message: 'Unable to complete operation.' } }));
    await expect(new ArcgisService().yoz('БР-1703401-2026', 'x', geom)).rejects.toBeInstanceOf(ArcgisXatosi);
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 + ARCGIS_RETRIES (2)
  });

  it('addResults success=false — xato', async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith('query')
        ? javob({ objectIds: null })
        : javob({ addResults: [{ success: false, error: { description: 'Geometry is invalid' } }] }),
    );
    await expect(new ArcgisService().yoz('БР-1703401-2026', 'x', geom)).rejects.toThrow('Geometry is invalid');
  });
});
