import { readFileSync } from 'node:fs';

export interface Soato {
  kod: string;
  nomi: string;
}

export const SOATO: Soato[] = JSON.parse(
  readFileSync(new URL('../../data/soato.json', import.meta.url), 'utf8'),
);

const NOMLAR = new Map(SOATO.map((s) => [s.kod, s.nomi]));

export const soatoNomi = (kod: string): string | null => NOMLAR.get(kod) ?? null;
