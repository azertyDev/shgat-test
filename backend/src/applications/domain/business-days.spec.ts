import { addBusinessDays, tashkentDate } from './business-days.js';

describe('addBusinessDays', () => {
  it.each([
    ['2026-10-19', '2026-10-22'], // Monday -> Thursday
    ['2026-10-16', '2026-10-21'], // Friday -> Wednesday
    ['2026-10-17', '2026-10-21'], // Saturday -> Wednesday
    ['2026-10-18', '2026-10-21'], // Sunday -> Wednesday
  ])('%s + 3 business days = %s', (date, expected) => {
    expect(addBusinessDays(date, 3)).toBe(expected);
  });
});

describe('tashkentDate', () => {
  it('UTC+5: 20:00 UTC is already the next day in Tashkent', () => {
    expect(tashkentDate(new Date('2026-10-18T20:00:00Z'))).toBe('2026-10-19');
  });
});
