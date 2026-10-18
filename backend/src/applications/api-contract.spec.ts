import {
  fieldsToApi,
  fileKindFromApi,
  uploadsFromApi,
} from './api-contract.js';

describe('API contract conversions', () => {
  it('maps multipart files to kinds and drops empty fields', () => {
    const file = { path: 'tmp/1' } as Express.Multer.File;
    expect(
      uploadsFromApi({ asosiy_chizma: [file], tushuntirish_xati: [] }),
    ).toEqual({ MAIN_DRAWING: file });
  });

  it('knows only the three file names of the spec', () => {
    expect(fileKindFromApi('tasdiqlovchi_hujjat')).toBe('APPROVAL_DOCUMENT');
    expect(fileKindFromApi('toString')).toBeUndefined();
  });

  it('renames code field names to wire names and keeps the rest', () => {
    expect(
      fieldsToApi({ boundary: 'a', EXPLANATORY_NOTE: 'b', soato_kodi: 'c' }),
    ).toEqual({ chegara: 'a', tushuntirish_xati: 'b', soato_kodi: 'c' });
  });
});
