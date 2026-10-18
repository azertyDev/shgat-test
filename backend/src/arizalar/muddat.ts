/** Toshkent vaqti bo'yicha sana, YYYY-MM-DD. */
export const toshkentSanasi = (d: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(d);

/** Sanaga n ish kuni qo'shadi (shanba-yakshanbasiz). Bayram kunlari hisobga olinmaydi. */
export function ishKuniQosh(sana: string, n: number): string {
  const d = new Date(`${sana}T00:00:00Z`);
  while (n > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const kun = d.getUTCDay();
    if (kun !== 0 && kun !== 6) n--;
  }
  return d.toISOString().slice(0, 10);
}
