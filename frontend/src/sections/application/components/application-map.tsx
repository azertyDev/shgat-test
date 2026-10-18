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
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';
import { useTranslate } from 'src/locales';

import { boundaryRings } from '../boundary';
import { INITIAL_VIEW, BOUNDARY_SYMBOL } from './map-config';

// ----------------------------------------------------------------------

type MapState = 'loading' | 'ready' | 'notFound' | 'error';

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
    setMapState('loading');
    view.map?.add(layer);
    showLayer(view);
    return () => {
      view.map?.remove(layer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, layer]);

  const showLayer = async (v: MapView) => {
    try {
      if (layer instanceof FeatureLayer) {
        const { count, extent } = await layer.queryExtent();
        if (!count || !extent) {
          setMapState('notFound');
          return;
        }
        await v.goTo(extent.clone().expand(1.5));
      } else {
        const ext = layer.graphics.getItemAt(0)?.geometry?.extent;
        if (ext) await v.goTo(ext.clone().expand(1.5));
      }
      setMapState('ready');
    } catch {
      setMapState('error');
    }
  };

  return (
    <Stack spacing={1}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {objectId !== null ? t('map.fromLayer', { id: objectId }) : t('map.fromApplication')}
      </Typography>
      <Box sx={{ height: { xs: 300, md: 380 }, borderRadius: 1.5, overflow: 'hidden', border: (theme) => `1px solid ${theme.vars.palette.divider}` }}>
        <arcgis-map
          basemap="osm"
          center={INITIAL_VIEW.center}
          zoom={INITIAL_VIEW.zoom}
          style={{ height: '100%' }}
          onarcgisViewReadyChange={(e) => {
            if (e.target.ready) setView(e.target.view);
          }}
        >
          <arcgis-zoom slot="top-left" />
        </arcgis-map>
      </Box>
      {mapState === 'notFound' && <Alert severity="warning">{t('map.notFound', { id: objectId })}</Alert>}
      {mapState === 'error' && <Alert severity="error">{t('map.layerError')}</Alert>}
    </Stack>
  );
}
