import { buildRegistrationNumber } from './registration-number.js';

describe('buildRegistrationNumber', () => {
  it('formats {type}-{soato}-{approval year}', () => {
    expect(
      buildRegistrationNumber(
        'БР',
        '1703401',
        new Date('2026-03-12T00:00:00Z'),
      ),
    ).toBe('БР-1703401-2026');
  });

  it('takes the year from the approval date, not the current year', () => {
    expect(
      buildRegistrationNumber(
        'ҲРС',
        '1706401',
        new Date('2019-12-31T00:00:00Z'),
      ),
    ).toBe('ҲРС-1706401-2019');
  });
});
