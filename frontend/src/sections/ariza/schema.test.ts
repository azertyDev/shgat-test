import { bolajakId, formDataga, arizaFormSchema } from './schema';

const pdf = (size = 10, name = 'a.pdf') => {
  const f = new File(['%PDF-1.4'], name, { type: 'application/pdf' });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

const qiymat = {
  hujjat_nomi: 'Andijon shahri bosh rejasi',
  hujjat_turi: 'БР',
  soato_kodi: '1703401',
  tasdiq_sanasi: '2026-03-12',
  tasdiq_hujjati: '123-son qaror',
  chegara: { type: 'Polygon' as const, coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.75]] as [number, number][]] },
  asosiy_chizma: pdf(),
  tushuntirish_xati: pdf(),
  tasdiqlovchi_hujjat: pdf(),
};

const xatolar = (v: unknown, majburiy = true) => {
  const r = arizaFormSchema(majburiy).safeParse(v);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
};

describe('arizaFormSchema', () => {
  it("to'g'ri qiymat o'tadi", () => {
    expect(xatolar(qiymat)).toEqual({});
  });

  it('25 MB fayl, kelajakdagi sana, chegarasiz — rad etiladi', () => {
    expect(xatolar({ ...qiymat, tushuntirish_xati: pdf(25 * 1024 * 1024), tasdiq_sanasi: '2999-01-01', chegara: null })).toEqual({
      tushuntirish_xati: 'Fayl hajmi 20 MB dan oshmasin',
      tasdiq_sanasi: "Kelajakdagi sana bo'lmasin",
      chegara: 'Chegarani chizing yoki GeoJSON yuklang',
    });
  });

  it('tahrirda fayllar ixtiyoriy', () => {
    const v = { ...qiymat, asosiy_chizma: null, tushuntirish_xati: null, tasdiqlovchi_hujjat: null };
    expect(Object.keys(xatolar(v, true))).toHaveLength(3);
    expect(xatolar(v, false)).toEqual({});
  });
});

describe('bolajakId', () => {
  it('tur, SOATO va sana yilidan tuziladi', () => {
    expect(bolajakId(qiymat)).toBe('БР-1703401-2026');
    expect(bolajakId({ ...qiymat, soato_kodi: '' })).toBe('');
  });
});

describe('formDataga', () => {
  it("data JSON va faqat tanlangan fayllar", () => {
    const fd = formDataga({ ...qiymat, tasdiqlovchi_hujjat: null });
    expect(JSON.parse(fd.get('data') as string)).toMatchObject({ hujjat_turi: 'БР', chegara: qiymat.chegara });
    expect(fd.get('asosiy_chizma')).toBeInstanceOf(File);
    expect(fd.has('tasdiqlovchi_hujjat')).toBe(false);
  });
});
