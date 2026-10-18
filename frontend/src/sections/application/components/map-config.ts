import esriConfig from '@arcgis/core/config.js';

import { CONFIG } from 'src/global-config';

// The key is never in the code: .env -> VITE_ARCGIS_API_KEY. Without it the "osm" basemap works keyless.
if (CONFIG.arcgisApiKey) esriConfig.apiKey = CONFIG.arcgisApiKey;

export const INITIAL_VIEW = { center: [64.5, 41.3] as [number, number], zoom: 5 };

export const BOUNDARY_SYMBOL = {
  type: 'simple-fill' as const,
  color: [36, 86, 200, 0.16],
  outline: { color: [36, 86, 200, 1], width: 2.5 },
};
