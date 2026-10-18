import { toPayload, toListParams, fromDetailsDto, fromErrorFields } from './api-contract';

const boundary = { type: 'Polygon' as const, coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.75]] as [number, number][]] };
const file = new File(['%PDF-1.4'], 'a.pdf', { type: 'application/pdf' });

describe('api contract', () => {
  it('builds the multipart body with wire names and only the selected files', () => {
    const body = toPayload({
      documentName: 'Andijon shahri bosh rejasi',
      documentType: 'БР',
      soatoCode: '1703401',
      approvalDate: '2026-03-12',
      approvalDecree: '123-son qaror',
      boundary,
      mainDrawing: file,
      explanatoryNote: null,
      approvalDocument: null,
    });
    expect(JSON.parse(body.get('data') as string)).toEqual({
      hujjat_nomi: 'Andijon shahri bosh rejasi',
      hujjat_turi: 'БР',
      soato_kodi: '1703401',
      tasdiq_sanasi: '2026-03-12',
      tasdiq_hujjati: '123-son qaror',
      chegara: boundary,
    });
    expect(body.get('asosiy_chizma')).toBeInstanceOf(File);
    expect(body.has('tushuntirish_xati')).toBe(false);
  });

  it('maps list filters to wire query parameters', () => {
    expect(toListParams({ status: 'REGISTERED', documentType: 'БР', page: 2, pageSize: 10 })).toBe(
      'holat=hisobga_olingan&hujjat_turi=%D0%91%D0%A0&sahifa=2&hajm=10'
    );
  });

  it('maps the details response to the English model', () => {
    const app = fromDetailsDto({
      id: 1,
      id_raqam: 'БР-1703401-2026',
      hujjat_nomi: 'x',
      hujjat_turi: 'БР',
      soato_kodi: '1703401',
      hudud_nomi: 'Andijon shahri',
      holat: 'hisobga_olingan',
      yuborilgan_vaqt: '2026-10-18T08:00:00Z',
      muddat: null,
      tasdiq_sanasi: '2026-03-12',
      tasdiq_hujjati: '1',
      chegara: boundary,
      arcgis_object_id: 3049,
      qaytarish_sababi: null,
      fayllar: [{ tur: 'asosiy_chizma', nomi: 'a.pdf', mime: 'application/pdf', hajm: 15, url: '/api/arizalar/1/fayllar/asosiy_chizma' }],
    });
    expect(app).toMatchObject({ status: 'REGISTERED', registrationNumber: 'БР-1703401-2026', arcgisObjectId: 3049 });
    expect(app.files[0]).toMatchObject({ field: 'mainDrawing', name: 'a.pdf', size: 15 });
  });

  it('maps 422 field errors back to form field names', () => {
    expect(fromErrorFields({ soato_kodi: 'x', asosiy_chizma: 'y', data: 'z' })).toEqual({
      soatoCode: 'x',
      mainDrawing: 'y',
      data: 'z',
    });
  });
});
