import { makeIdRaqam } from './registration-number.js';

describe('makeIdRaqam', () => {
  it('{tur}-{soato}-{tasdiq yili}', () => {
    expect(makeIdRaqam('БР', '1703401', new Date('2026-03-12T00:00:00Z'))).toBe('БР-1703401-2026');
  });

  it("yil tasdiq_sanasidan olinadi, joriy yildan emas", () => {
    expect(makeIdRaqam('ҲРС', '1706401', new Date('2019-12-31T00:00:00Z'))).toBe('ҲРС-1706401-2019');
  });
});
