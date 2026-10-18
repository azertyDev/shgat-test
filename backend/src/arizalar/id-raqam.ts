/** {hujjat_turi}-{soato_kodi}-{yil}, yil — tasdiq_sanasi yili. Masalan: БР-1703401-2026. */
export function makeIdRaqam(hujjatTuri: string, soatoKodi: string, tasdiqSanasi: Date): string {
  return `${hujjatTuri}-${soatoKodi}-${tasdiqSanasi.getUTCFullYear()}`;
}
