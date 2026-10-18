import '@arcgis/map-components/components/arcgis-map';
import '@arcgis/map-components/components/arcgis-zoom';

import type MapView from '@arcgis/core/views/MapView.js';
import type { ArizaToliq } from '../types';

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

import { chegaraHalqalari } from '../chegara';
import { POLIGON_BELGI, XARITA_MARKAZI } from './xarita-config';

// ----------------------------------------------------------------------

type Holati = 'yuklanmoqda' | 'tayyor' | 'topilmadi' | 'xato';

/**
 * Hisobga olingan hujjat: chegara to'g'ridan-to'g'ri ochiq ArcGIS qatlamidan (objectid bo'yicha filtr).
 * Boshqa holatlarda — ariza ma'lumotidagi GeoJSON.
 */
export function ArizaXarita({ ariza }: { ariza: Pick<ArizaToliq, 'chegara' | 'holat' | 'arcgis_object_id'> }) {
  const { t } = useTranslate();
  const objectId = ariza.holat === 'hisobga_olingan' ? ariza.arcgis_object_id : null;
  const [holati, setHolati] = useState<Holati>('yuklanmoqda');
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
                geometry: new Polygon({ rings: chegaraHalqalari(ariza.chegara), spatialReference: { wkid: 4326 } }),
                symbol: POLIGON_BELGI,
              }),
            ],
          }),
    [objectId, ariza.chegara]
  );

  // holat o'zgarsa (masalan, tasdiqlangandan keyin) qatlam almashadi — view qayta yaratilmaydi
  useEffect(() => {
    if (!view) return undefined;
    setHolati('yuklanmoqda');
    view.map?.add(layer);
    korsat(view);
    return () => {
      view.map?.remove(layer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, layer]);

  const korsat = async (v: MapView) => {
    try {
      if (layer instanceof FeatureLayer) {
        const { count, extent } = await layer.queryExtent();
        if (!count || !extent) {
          setHolati('topilmadi');
          return;
        }
        await v.goTo(extent.clone().expand(1.5));
      } else {
        const ext = layer.graphics.getItemAt(0)?.geometry?.extent;
        if (ext) await v.goTo(ext.clone().expand(1.5));
      }
      setHolati('tayyor');
    } catch {
      setHolati('xato');
    }
  };

  return (
    <Stack spacing={1}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {objectId !== null ? t('xarita.qatlamdan', { id: objectId }) : t('xarita.bazadan')}
      </Typography>
      <Box sx={{ height: { xs: 300, md: 380 }, borderRadius: 1.5, overflow: 'hidden', border: (theme) => `1px solid ${theme.vars.palette.divider}` }}>
        <arcgis-map
          basemap="osm"
          center={XARITA_MARKAZI.center}
          zoom={XARITA_MARKAZI.zoom}
          style={{ height: '100%' }}
          onarcgisViewReadyChange={(e) => {
            if (e.target.ready) setView(e.target.view);
          }}
        >
          <arcgis-zoom slot="top-left" />
        </arcgis-map>
      </Box>
      {holati === 'topilmadi' && <Alert severity="warning">{t('xarita.topilmadi', { id: objectId })}</Alert>}
      {holati === 'xato' && <Alert severity="error">{t('xarita.qatlamXato')}</Alert>}
    </Stack>
  );
}
