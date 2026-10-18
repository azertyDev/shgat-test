import esriConfig from '@arcgis/core/config.js';

import { CONFIG } from 'src/global-config';

// Kalit kodga yozilmaydi: .env → VITE_ARCGIS_API_KEY. Bo'sh bo'lsa "osm" asos xaritasi kalitsiz ishlaydi.
if (CONFIG.arcgisApiKey) esriConfig.apiKey = CONFIG.arcgisApiKey;

export const XARITA_MARKAZI = { center: [64.5, 41.3] as [number, number], zoom: 5 };

export const POLIGON_BELGI = {
  type: 'simple-fill' as const,
  color: [0, 167, 111, 0.25],
  outline: { color: [0, 120, 80, 1], width: 2 },
};
