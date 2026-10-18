import { ishKuniQosh, toshkentSanasi } from './business-days.js';

describe('ishKuniQosh', () => {
  it.each([
    ['2026-10-19', '2026-10-22'], // dushanba → payshanba
    ['2026-10-16', '2026-10-21'], // juma → chorshanba
    ['2026-10-17', '2026-10-21'], // shanba → chorshanba
    ['2026-10-18', '2026-10-21'], // yakshanba → chorshanba
  ])('%s + 3 ish kuni = %s', (sana, kutilgan) => {
    expect(ishKuniQosh(sana, 3)).toBe(kutilgan);
  });
});

describe('toshkentSanasi', () => {
  it('UTC+5: 20:00 UTC Toshkentda ertangi kun', () => {
    expect(toshkentSanasi(new Date('2026-10-18T20:00:00Z'))).toBe('2026-10-19');
  });
});
