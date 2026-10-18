import { readFileSync } from 'node:fs';

export interface SoatoRegion {
  kod: string; // wire names of GET /api/soato (task spec, section 5)
  nomi: string;
}

export const SOATO_REGIONS: SoatoRegion[] = JSON.parse(
  readFileSync(new URL('../../data/soato.json', import.meta.url), 'utf8'),
);

const NAMES = new Map(SOATO_REGIONS.map((r) => [r.kod, r.nomi]));

export const regionName = (code: string): string | null => NAMES.get(code) ?? null;
export const isKnownSoatoCode = (code: string): boolean => NAMES.has(code);
