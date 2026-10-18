import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';

export interface SoatoRegion {
  code: string;
  name: string;
}

/** data/soato.json keeps the format of the list given with the task spec. */
type SoatoFileEntry = { kod: string; nomi: string };

/** SOATO region reference list (sample of regional centres, data/soato.json). */
@Injectable()
export class SoatoService {
  private readonly regions: SoatoRegion[] = (
    JSON.parse(
      readFileSync(new URL('../../data/soato.json', import.meta.url), 'utf8'),
    ) as SoatoFileEntry[]
  ).map((r) => ({ code: r.kod, name: r.nomi }));

  private readonly names = new Map(this.regions.map((r) => [r.code, r.name]));

  list(): SoatoRegion[] {
    return this.regions;
  }

  regionName(code: string): string | null {
    return this.names.get(code) ?? null;
  }

  exists(code: string): boolean {
    return this.names.has(code);
  }
}
