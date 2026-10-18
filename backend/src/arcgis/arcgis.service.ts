import { Injectable, Logger } from '@nestjs/common';
import type { EsriPolygon } from '../geo/esri-geometry.js';

export class ArcgisError extends Error {}

const CLOCK_SKEW_MS = 5 * 60_000; // allowance for the clock difference between this server and ArcGIS

/** ArcGIS standardized SQL timestamp literal 'YYYY-MM-DD HH:MI:SS' (layer dates are in UTC). */
export const toSqlTimestamp = (d: Date) =>
  new Date(d.getTime() - CLOCK_SKEW_MS)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

const DEFAULT_LAYER_URL =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Wildfire/FeatureServer/2';

/** Writes to a public Feature Service layer (no token needed). */
@Injectable()
export class ArcgisService {
  private readonly logger = new Logger(ArcgisService.name);
  readonly layerUrl = process.env.ARCGIS_LAYER_URL || DEFAULT_LAYER_URL;
  private readonly timeoutMs = Number(process.env.ARCGIS_TIMEOUT_MS ?? 10_000);
  private readonly retries = Number(process.env.ARCGIS_RETRIES ?? 2);

  /**
   * Adds a feature and returns its objectId. When an earlier attempt may have created the feature but its
   * response was lost (timeout), the layer is first searched for exactly this description created after
   * `firstAttemptAt`, so a second feature is not created. A fresh first attempt does not search: the layer
   * is shared and someone else may have written the same sample text a moment ago.
   *
   * @param isRetry true when a previous approval request for this application already tried to write
   */
  async addFeature(
    description: string,
    geometry: EsriPolygon,
    firstAttemptAt: Date,
    isRetry: boolean,
  ): Promise<number> {
    const where = `description = '${description.replace(/'/g, "''")}' AND created_date >= timestamp '${toSqlTimestamp(firstAttemptAt)}'`;
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.retries + 1; attempt++) {
      try {
        if (isRetry || attempt > 1) {
          const existing = await this.findFeatureId(where);
          if (existing !== null) return existing;
        }
        return await this.insertFeature(description, geometry);
      } catch (e) {
        lastError = e;
        this.logger.warn(`ArcGIS attempt ${attempt}: ${(e as Error).message}`);
      }
    }
    throw new ArcgisError((lastError as Error)?.message ?? 'unknown error');
  }

  private async findFeatureId(where: string): Promise<number | null> {
    const json = await this.request('query', { where, returnIdsOnly: 'true' });
    return json.objectIds?.[0] ?? null;
  }

  /** Deletes a feature (compensation when the database step after a write fails). */
  async deleteFeature(objectId: number): Promise<void> {
    const json = await this.request('applyEdits', {
      deletes: String(objectId),
    });
    const result = json.deleteResults?.[0];
    if (!result?.success) {
      throw new Error(
        result?.error?.description ?? 'applyEdits did not delete the feature',
      );
    }
  }

  private async insertFeature(
    description: string,
    geometry: EsriPolygon,
  ): Promise<number> {
    const adds = [{ geometry, attributes: { description, symbolid: 0 } }];
    const json = await this.request('applyEdits', {
      adds: JSON.stringify(adds),
    });
    const result = json.addResults?.[0];
    if (!result?.success || typeof result.objectId !== 'number') {
      throw new Error(
        result?.error?.description ?? 'applyEdits did not add the feature',
      );
    }
    return result.objectId;
  }

  private async request(
    operation: string,
    params: Record<string, string>,
  ): Promise<any> {
    const res = await fetch(`${this.layerUrl}/${operation}`, {
      method: 'POST',
      body: new URLSearchParams({ f: 'json', ...params }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // ArcGIS reports errors with HTTP 200 and an error object in the body
    if (json.error)
      throw new Error(
        `${json.error.code ?? ''} ${json.error.message ?? 'ArcGIS error'}`.trim(),
      );
    return json;
  }
}
