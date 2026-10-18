import '@arcgis/map-components/components/arcgis-map';
import '@arcgis/map-components/components/arcgis-zoom';

import type MapView from '@arcgis/core/views/MapView.js';
import type { Application } from '../types';

import Graphic from '@arcgis/core/Graphic.js';
import { useMemo, useState, useEffect } from 'react';
import Polygon from '@arcgis/core/geometry/Polygon.js';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';

import { CONFIG } from 'src/global-config';
import { useTranslate } from 'src/locales';

import { boundaryRings } from '../boundary';
import { showLayer, type MapState } from './show-layer';
import { INITIAL_VIEW, BOUNDARY_SYMBOL } from './map-config';

// ----------------------------------------------------------------------

/**
 * Registered document: the boundary comes straight from the public ArcGIS layer (filtered by objectid).
 * Any other status: the GeoJSON stored with the application.
 */
export function ApplicationMap({ application }: { application: Pick<Application, 'boundary' | 'status' | 'arcgisObjectId'> }) {
  const { t } = useTranslate();
  const objectId = application.status === 'REGISTERED' ? application.arcgisObjectId : null;
  const [mapState, setMapState] = useState<MapState>('loading');
  const [view, setView] = useState<MapView | null>(null);

  const layer = useMemo(
    () =>
      objectId !== null
        ? new FeatureLayer({
            url: CONFIG.arcgisLayerUrl,
            definitionExpression: `objectid = ${Number(objectId)}`,
            outFields: ['objectid', 'description'],
            popupTemplate: { title: '{description}' },
          })
        : new GraphicsLayer({
            graphics: [
              new Graphic({
                geometry: new Polygon({ rings: boundaryRings(application.boundary), spatialReference: { wkid: 4326 } }),
                symbol: BOUNDARY_SYMBOL,
              }),
            ],
          }),
    [objectId, application.boundary]
  );

  // when the status changes (e.g. after approval) the layer is swapped; the view is not recreated
  useEffect(() => {
    if (!view) return undefined;
    // a result for a layer that was swapped out meanwhile must not overwrite the current state
    let active = true;
    setMapState('loading');
    view.map?.add(layer);
    showLayer(layer, view).then((state) => active && setMapState(state));
    return () => {
      active = false;
      view.map?.remove(layer);
    };
  }, [view, layer]);

  return (
    <Box sx={{ position: 'relative', height: 1, minHeight: 300 }}>
      <arcgis-map
        basemap="osm"
        center={INITIAL_VIEW.center}
        zoom={INITIAL_VIEW.zoom}
        style={{ height: '100%' }}
        onarcgisViewReadyChange={(e) => {
          if (e.target.ready) setView(e.target.view);
        }}
      >
        <arcgis-zoom slot="top-right" />
      </arcgis-map>
      <Box
        sx={{
          position: 'absolute',
          left: 16,
          bottom: 24,
          maxWidth: 'calc(100% - 32px)',
          px: 1.5,
          py: 1,
          borderRadius: 1,
          bgcolor: 'common.white',
          border: '1px solid #DDE1E7',
          fontSize: 13,
          color: 'text.secondary',
        }}
      >
        {objectId !== null ? t('map.fromLayer', { id: objectId }) : t('map.fromApplication')}
      </Box>
      {(mapState === 'notFound' || mapState === 'error') && (
        <Alert severity={mapState === 'notFound' ? 'warning' : 'error'} sx={{ position: 'absolute', left: 16, right: 72, top: 72 }}>
          {mapState === 'notFound' ? t('map.notFound', { id: objectId }) : t('map.layerError')}
        </Alert>
      )}
    </Box>
  );
}
