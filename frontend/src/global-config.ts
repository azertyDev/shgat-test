import packageJson from '../package.json';

// ----------------------------------------------------------------------

export type ConfigValue = {
  appName: string;
  appVersion: string;
  serverUrl: string;
  assetsDir: string;
  arcgisLayerUrl: string;
  /** optional ArcGIS developer key (basemap). Empty -> OpenStreetMap. */
  arcgisApiKey: string;
};

export const CONFIG: ConfigValue = {
  appName: 'ShGAT',
  appVersion: packageJson.version,
  serverUrl: import.meta.env.VITE_SERVER_URL ?? '',
  assetsDir: import.meta.env.VITE_ASSETS_DIR ?? '',
  arcgisLayerUrl:
    import.meta.env.VITE_ARCGIS_LAYER_URL ??
    'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Wildfire/FeatureServer/2',
  arcgisApiKey: import.meta.env.VITE_ARCGIS_API_KEY ?? '',
};
