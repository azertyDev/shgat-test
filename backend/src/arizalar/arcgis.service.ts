import { Injectable, Logger } from '@nestjs/common';
import type { EsriPolygon } from './chegara.js';

export class ArcgisXatosi extends Error {}

const DEFAULT_URL = 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Wildfire/FeatureServer/2';

/** Ochiq Feature Service qatlamiga yozish (token kerak emas). */
@Injectable()
export class ArcgisService {
  private readonly log = new Logger(ArcgisService.name);
  readonly url = process.env.ARCGIS_LAYER_URL || DEFAULT_URL;
  private readonly timeoutMs = Number(process.env.ARCGIS_TIMEOUT_MS ?? 10_000);
  private readonly retries = Number(process.env.ARCGIS_RETRIES ?? 2);

  /**
   * Obyekt qo'shadi va objectId qaytaradi. Har urinishdan oldin shu ID raqamli obyekt qidiriladi:
   * oldingi urinish obyektni yaratib, javobi yo'qolgan bo'lsa (timeout), ikkinchisi yaratilmaydi.
   */
  async yoz(idRaqam: string, description: string, geometry: EsriPolygon): Promise<number> {
    const where = `description LIKE '${idRaqam.replace(/'/g, "''")} |%'`;
    let oxirgi: unknown;
    for (let urinish = 1; urinish <= this.retries + 1; urinish++) {
      try {
        const mavjud = await this.topish(where);
        if (mavjud !== null) return mavjud;
        return await this.qoshish(description, geometry);
      } catch (e) {
        oxirgi = e;
        this.log.warn(`ArcGIS, ${urinish}-urinish: ${(e as Error).message}`);
      }
    }
    throw new ArcgisXatosi((oxirgi as Error)?.message ?? 'nomalum xato');
  }

  private async topish(where: string): Promise<number | null> {
    const json = await this.sorov('query', { where, returnIdsOnly: 'true' });
    return json.objectIds?.[0] ?? null;
  }

  private async qoshish(description: string, geometry: EsriPolygon): Promise<number> {
    const adds = [{ geometry, attributes: { description, symbolid: 0 } }];
    const json = await this.sorov('applyEdits', { adds: JSON.stringify(adds) });
    const r = json.addResults?.[0];
    if (!r?.success || typeof r.objectId !== 'number') {
      throw new Error(r?.error?.description ?? "applyEdits obyekt qo'shmadi");
    }
    return r.objectId;
  }

  private async sorov(amal: string, params: Record<string, string>): Promise<any> {
    const res = await fetch(`${this.url}/${amal}`, {
      method: 'POST',
      body: new URLSearchParams({ f: 'json', ...params }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // ArcGIS xatoni HTTP 200 bilan, tanada qaytaradi
    if (json.error) throw new Error(`${json.error.code ?? ''} ${json.error.message ?? 'ArcGIS xatosi'}`.trim());
    return json;
  }
}
