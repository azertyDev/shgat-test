import { today, applicationFormSchema, futureRegistrationNumber } from './form-schema';

const pdf = (size = 10, name = 'a.pdf') => {
  const f = new File(['%PDF-1.4'], name, { type: 'application/pdf' });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

const values = {
  documentName: 'Andijon shahri bosh rejasi',
  documentType: 'БР',
  soatoCode: '1703401',
  approvalDate: '2026-03-12',
  approvalDecree: '123-son qaror',
  boundary: {
    type: 'Polygon' as const,
    coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.75]] as [number, number][]],
  },
  mainDrawing: pdf(),
  explanatoryNote: pdf(),
  approvalDocument: pdf(),
};

const errorsOf = (v: unknown, filesRequired = true) => {
  const result = applicationFormSchema(filesRequired).safeParse(v);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
};

describe('applicationFormSchema', () => {
  it('accepts valid values', () => {
    expect(errorsOf(values)).toEqual({});
  });

  it('rejects a 25 MB file, a future date and a missing boundary', () => {
    expect(errorsOf({ ...values, explanatoryNote: pdf(25 * 1024 * 1024), approvalDate: '2999-01-01', boundary: null })).toEqual({
      explanatoryNote: 'Fayl hajmi 20 MB dan oshmasin',
      approvalDate: "Kelajakdagi sana bo'lmasin",
      boundary: 'Chegarani chizing yoki GeoJSON yuklang',
    });
  });

  it('makes files optional in edit mode', () => {
    const withoutFiles = { ...values, mainDrawing: null, explanatoryNote: null, approvalDocument: null };
    expect(Object.keys(errorsOf(withoutFiles, true))).toHaveLength(3);
    expect(errorsOf(withoutFiles, false)).toEqual({});
  });
});

describe('futureRegistrationNumber', () => {
  it('is built from type, SOATO code and the approval year', () => {
    expect(futureRegistrationNumber(values)).toBe('БР-1703401-2026');
    expect(futureRegistrationNumber({ ...values, soatoCode: '' })).toBe('');
  });
});

describe('today', () => {
  it('uses the Tashkent calendar day, not the browser zone', () => {
    // 20:00 UTC on Oct 18 is already Oct 19 in Tashkent (UTC+5)
    expect(today(new Date('2026-10-18T20:00:00Z'))).toBe('2026-10-19');
    expect(today(new Date('2026-10-18T18:59:00Z'))).toBe('2026-10-18');
  });

  it('rejects a date that is still in the future for Tashkent', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-18T10:00:00Z'));
    try {
      const result = applicationFormSchema(false).shape.approvalDate.safeParse('2026-10-19');
      expect(result.success).toBe(false);
      expect(applicationFormSchema(false).shape.approvalDate.safeParse('2026-10-18').success).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
