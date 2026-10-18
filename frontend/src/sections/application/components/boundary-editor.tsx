import '@arcgis/map-components/components/arcgis-map';
import '@arcgis/map-components/components/arcgis-zoom';
import '@arcgis/map-components/components/arcgis-sketch';

import type MapView from '@arcgis/core/views/MapView.js';
import type { Boundary } from '../types';

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

import { INITIAL_VIEW, BOUNDARY_SYMBOL } from './map-config';
import { boundaryRings, validateBoundary, boundaryFromRings, OUTSIDE_UZBEKISTAN, boundaryFromGeoJson } from '../boundary';

// ----------------------------------------------------------------------

type Props = {
  value: Boundary | null;
  onChange: (g: Boundary | null) => void;
  error?: string;
};

const toPolygon = (g: Boundary) => new Polygon({ rings: boundaryRings(g), spatialReference: { wkid: 4326 } });

/** Sketch returns view coordinates (Web Mercator); GeoJSON needs degrees. */
function toBoundary(geometry: unknown): Boundary | null {
  if (!(geometry instanceof Polygon)) return null;
  const g = geometry.spatialReference?.isWebMercator
    ? (webMercatorUtils.webMercatorToGeographic(geometry) as Polygon)
    : geometry;
  return boundaryFromRings(g.rings);
}

export function BoundaryEditor({ value, onChange, error }: Props) {
  const { t, localize } = useTranslate();
  const viewRef = useRef<MapView | null>(null);
  const sketchRef = useRef<HTMLArcgisSketchElement>(null);
  const shouldZoom = useRef(true); // value from a file or from the server: zoom the map to it
  const [fileError, setFileError] = useState('');
  const layer = useMemo(() => new GraphicsLayer({ title: 'Boundary' }), []);

  // external value -> map
  useEffect(() => {
    layer.removeAll();
    if (!value) return;
    const geometry = toPolygon(value);
    layer.add(new Graphic({ geometry, symbol: BOUNDARY_SYMBOL }));
    if (shouldZoom.current && viewRef.current && geometry.extent) {
      viewRef.current.goTo(geometry.extent.clone().expand(1.4)).catch(() => {});
      shouldZoom.current = false;
    }
  }, [layer, value]);

  const readGeoJsonFile = async (f: File | undefined) => {
    if (!f) return;
    setFileError('');
    try {
      const g = boundaryFromGeoJson(JSON.parse(await f.text()));
      if (!g) {
        setFileError(t('map.noPolygon'));
        return;
      }
      shouldZoom.current = true;
      onChange(g);
    } catch {
      setFileError(t('map.invalidJson'));
    }
  };

  const boundaryError = value ? validateBoundary(value) : null;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', flexGrow: 1 }}>
          {t('map.hint')}
        </Typography>
        <Button component="label" size="small" variant="outlined" startIcon={<Iconify icon="solar:import-bold" />}>
          {t('map.uploadGeoJson')}
          <input
            hidden
            type="file"
            accept=".geojson,.json,application/geo+json,application/json"
            onChange={(e) => {
              readGeoJsonFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </Button>
        {value && (
          <Button size="small" color="inherit" onClick={() => onChange(null)} startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}>
            {t('map.clear')}
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
          center={INITIAL_VIEW.center}
          zoom={INITIAL_VIEW.zoom}
          style={{ height: '100%' }}
          onarcgisViewReadyChange={(e) => {
            const el = e.target;
            if (!el.ready) return;
            viewRef.current = el.view;
            if (!el.map?.layers.includes(layer)) el.map?.add(layer);
            // the `layer` prop is not applied before the map exists, so it is assigned once the layer is on the map
            if (sketchRef.current) sketchRef.current.layer = layer;
            if (value) {
              const ext = toPolygon(value).extent;
              if (ext) el.view.goTo(ext.clone().expand(1.4)).catch(() => {});
              shouldZoom.current = false;
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
              // a single boundary: a newly drawn one replaces the previous one
              onChange(toBoundary(e.detail.graphic?.geometry));
            }}
            onarcgisUpdate={(e) => {
              if (e.detail.state === 'complete') onChange(toBoundary(e.detail.graphics[0]?.geometry));
            }}
            onarcgisDelete={() => onChange(null)}
          />
        </arcgis-map>
      </Box>

      {fileError && <Alert severity="error">{fileError}</Alert>}
      {boundaryError === OUTSIDE_UZBEKISTAN ? (
        <Alert severity="warning">{t('map.outside')}</Alert>
      ) : (
        error && <FormHelperText error>{localize(error)}</FormHelperText>
      )}
    </Stack>
  );
}
