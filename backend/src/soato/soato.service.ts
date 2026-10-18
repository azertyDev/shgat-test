import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';

export interface SoatoRegion {
  kod: string; // wire names of GET /api/soato (task spec, section 5)
  nomi: string;
}

/** SOATO region reference list (sample of regional centres, data/soato.json). */
@Injectable()
export class SoatoService {
  private readonly regions: SoatoRegion[] = JSON.parse(
    readFileSync(new URL('../../data/soato.json', import.meta.url), 'utf8'),
  );

  private readonly names = new Map(this.regions.map((r) => [r.kod, r.nomi]));

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
