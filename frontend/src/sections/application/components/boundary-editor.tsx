import '@arcgis/map-components/components/arcgis-map';
import '@arcgis/map-components/components/arcgis-zoom';
import '@arcgis/map-components/components/arcgis-sketch';

import type MapView from '@arcgis/core/views/MapView.js';
import type { Chegara } from '../types';

import Graphic from '@arcgis/core/Graphic.js';
import Polygon from '@arcgis/core/geometry/Polygon.js';
import { useRef, useMemo, useState, useEffect } from 'react';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils.js';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import FormHelperText from '@mui/material/FormHelperText';

import { useTranslate } from 'src/locales';

import { Iconify } from 'src/components/iconify';

import { POLIGON_BELGI, XARITA_MARKAZI } from './map-config';
import { TASHQARIDA, validateChegara, chegaraHalqalari, geojsonDanChegara, halqalardanChegara } from '../boundary';

// ----------------------------------------------------------------------

type Props = {
  value: Chegara | null;
  onChange: (g: Chegara | null) => void;
  error?: string;
};

const poligonga = (g: Chegara) => new Polygon({ rings: chegaraHalqalari(g), spatialReference: { wkid: 4326 } });

/** Sketch view koordinatalarida (Web Mercator) beradi — GeoJSON uchun gradusga o'tkaziladi. */
function chegaraga(geometry: unknown): Chegara | null {
  if (!(geometry instanceof Polygon)) return null;
  const g = geometry.spatialReference?.isWebMercator
    ? (webMercatorUtils.webMercatorToGeographic(geometry) as Polygon)
    : geometry;
  return halqalardanChegara(g.rings);
}

export function ChegaraXarita({ value, onChange, error }: Props) {
  const { t, tr } = useTranslate();
  const viewRef = useRef<MapView | null>(null);
  const sketchRef = useRef<HTMLArcgisSketchElement>(null);
  const yaqinlash = useRef(true); // fayldan yoki saqlangan qiymat — xaritani unga yaqinlashtiramiz
  const [faylXato, setFaylXato] = useState('');
  const layer = useMemo(() => new GraphicsLayer({ title: 'Chegara' }), []);

  // tashqi qiymat → xarita
  useEffect(() => {
    layer.removeAll();
    if (!value) return;
    const geometry = poligonga(value);
    layer.add(new Graphic({ geometry, symbol: POLIGON_BELGI }));
    if (yaqinlash.current && viewRef.current && geometry.extent) {
      viewRef.current.goTo(geometry.extent.clone().expand(1.4)).catch(() => {});
      yaqinlash.current = false;
    }
  }, [layer, value]);

  const faylniOqi = async (f: File | undefined) => {
    if (!f) return;
    setFaylXato('');
    try {
      const g = geojsonDanChegara(JSON.parse(await f.text()));
      if (!g) {
        setFaylXato(t('xarita.geojsonXato'));
        return;
      }
      yaqinlash.current = true;
      onChange(g);
    } catch {
      setFaylXato(t('xarita.jsonXato'));
    }
  };

  const ogohlantirish = value ? validateChegara(value) : null;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', flexGrow: 1 }}>
          {t('xarita.izoh')}
        </Typography>
        <Button component="label" size="small" variant="outlined" startIcon={<Iconify icon="solar:import-bold" />}>
          {t('xarita.geojson')}
          <input
            hidden
            type="file"
            accept=".geojson,.json,application/geo+json,application/json"
            onChange={(e) => {
              faylniOqi(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </Button>
        {value && (
          <Button size="small" color="inherit" onClick={() => onChange(null)} startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}>
            {t('xarita.tozalash')}
          </Button>
        )}
      </Stack>

      <Box
        sx={{
          height: { xs: 320, md: 420 },
          borderRadius: 1.5,
          overflow: 'hidden',
          border: (theme) => `1px solid ${error ? theme.vars.palette.error.main : theme.vars.palette.divider}`,
        }}
      >
        <arcgis-map
          basemap="osm"
          center={XARITA_MARKAZI.center}
          zoom={XARITA_MARKAZI.zoom}
          style={{ height: '100%' }}
          onarcgisViewReadyChange={(e) => {
            const el = e.target;
            if (!el.ready) return;
            viewRef.current = el.view;
            if (!el.map?.layers.includes(layer)) el.map?.add(layer);
            // `layer` prop'i xarita tayyor bo'lguncha qo'llanmaydi — qatlam xaritaga qo'shilgach beriladi
            if (sketchRef.current) sketchRef.current.layer = layer;
            if (value) {
              const ext = poligonga(value).extent;
              if (ext) el.view.goTo(ext.clone().expand(1.4)).catch(() => {});
              yaqinlash.current = false;
            }
          }}
        >
          <arcgis-zoom slot="top-left" />
          <arcgis-sketch
            ref={sketchRef}
            slot="top-right"
            defaultGraphicsLayerDisabled
            creationMode="single"
            availableCreateTools={['polygon', 'rectangle']}
            hideSelectionToolsLassoSelection
            hideSelectionToolsRectangleSelection
            hideSettingsMenu
            hideDuplicateButton
            onarcgisCreate={(e) => {
              if (e.detail.state !== 'complete') return;
              // bitta chegara: yangi chizilgani avvalgisining o'rnini egallaydi
              onChange(chegaraga(e.detail.graphic?.geometry));
            }}
            onarcgisUpdate={(e) => {
              if (e.detail.state === 'complete') onChange(chegaraga(e.detail.graphics[0]?.geometry));
            }}
            onarcgisDelete={() => onChange(null)}
          />
        </arcgis-map>
      </Box>

      {faylXato && <Alert severity="error">{faylXato}</Alert>}
      {ogohlantirish === TASHQARIDA ? (
        <Alert severity="warning">{t('xarita.tashqarida')}</Alert>
      ) : (
        error && <FormHelperText error>{tr(error)}</FormHelperText>
      )}
    </Stack>
  );
}
