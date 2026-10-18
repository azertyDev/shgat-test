/** Calendar date in Tashkent, YYYY-MM-DD. */
export const tashkentDate = (d: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(d);

/** Adds n business days (Saturday and Sunday skipped). Public holidays are not taken into account. */
export function addBusinessDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  while (n > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) n--;
  }
  return d.toISOString().slice(0, 10);
}
