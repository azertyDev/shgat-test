import {
  ArcgisError,
  ArcgisService,
  toSqlTimestamp,
} from './arcgis.service.js';
import { toEsriPolygon } from '../geo/esri-geometry.js';

const geometry = toEsriPolygon({
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
});
const firstAttemptAt = new Date('2026-10-18T08:00:00Z');
const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200 });

describe('ArcgisService.addFeature', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const operation = (i: number) =>
    String(fetchMock.mock.calls[i][0]).split('/').pop();

  it('writes directly on a fresh first attempt, without searching the shared layer', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ addResults: [{ success: true, objectId: 42 }] }),
    );

    await expect(
      new ArcgisService().addFeature(
        'БР-1703401-2026 | test',
        geometry,
        firstAttemptAt,
        false,
      ),
    ).resolves.toBe(42);
    expect(fetchMock.mock.calls.map((_, i) => operation(i))).toEqual([
      'applyEdits',
    ]);
    const body = fetchMock.mock.calls[0][1]!.body as URLSearchParams;
    expect(body.get('f')).toBe('json');
    const [add] = JSON.parse(body.get('adds')!);
    expect(add.attributes).toEqual({
      description: 'БР-1703401-2026 | test',
      symbolid: 0,
    });
    expect(add.geometry.spatialReference.wkid).toBe(102100);
  });

  it('on a repeated approval searches first, by exact text and time, and reuses the found feature', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ objectIds: [42] }));

    await expect(
      new ArcgisService().addFeature(
        'БР-1703401-2026 | test',
        geometry,
        firstAttemptAt,
        true,
      ),
    ).resolves.toBe(42);
    expect(fetchMock.mock.calls.map((_, i) => operation(i))).toEqual(['query']);
    expect(
      (fetchMock.mock.calls[0][1]!.body as URLSearchParams).get('where'),
    ).toBe(
      "description = 'БР-1703401-2026 | test' AND created_date >= timestamp '2026-10-18 07:55:00'",
    );
  });

  it('does not create a second feature when retrying after a timeout', async () => {
    fetchMock
      .mockRejectedValueOnce(new DOMException('timeout', 'TimeoutError')) // feature created, response lost
      .mockResolvedValueOnce(jsonResponse({ objectIds: [77] }));

    await expect(
      new ArcgisService().addFeature('x', geometry, firstAttemptAt, false),
    ).resolves.toBe(77);
    expect(fetchMock.mock.calls.map((_, i) => operation(i))).toEqual([
      'applyEdits',
      'query',
    ]);
  });

  it('throws ArcgisError when every attempt fails', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse({
        error: { code: 500, message: 'Unable to complete operation.' },
      }),
    );
    await expect(
      new ArcgisService().addFeature('x', geometry, firstAttemptAt, false),
    ).rejects.toBeInstanceOf(ArcgisError);
    // 3 attempts (1 + ARCGIS_RETRIES); later ones fail already on the lookup
    expect(fetchMock.mock.calls.map((_, i) => operation(i))).toEqual([
      'applyEdits',
      'query',
      'query',
    ]);
  });

  it('treats addResults success=false as an error', async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith('query')
        ? jsonResponse({ objectIds: null })
        : jsonResponse({
            addResults: [
              { success: false, error: { description: 'Geometry is invalid' } },
            ],
          }),
    );
    await expect(
      new ArcgisService().addFeature('x', geometry, firstAttemptAt, false),
    ).rejects.toThrow('Geometry is invalid');
  });
});

describe('ArcgisService.deleteFeature', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('deletes by objectId via applyEdits', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ deleteResults: [{ objectId: 42, success: true }] }),
    );
    await new ArcgisService().deleteFeature(42);
    const body = fetchMock.mock.calls[0][1]!.body as URLSearchParams;
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/applyEdits$/);
    expect(body.get('deletes')).toBe('42');
  });

  it('throws when ArcGIS reports success=false', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ deleteResults: [{ success: false }] }),
    );
    await expect(new ArcgisService().deleteFeature(42)).rejects.toThrow();
  });
});

describe('toSqlTimestamp', () => {
  it('formats UTC with a 5 minute clock-skew allowance', () => {
    expect(toSqlTimestamp(new Date('2026-01-01T00:02:03.456Z'))).toBe(
      '2025-12-31 23:57:03',
    );
  });
});
