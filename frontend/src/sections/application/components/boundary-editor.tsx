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
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import { useTranslate } from 'src/locales';

import { Iconify } from 'src/components/iconify';

import { NAVY } from '../styles';
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

  const message =
    fileError ||
    (boundaryError === OUTSIDE_UZBEKISTAN ? t('map.outside') : error ? localize(error) : '') ||
    (value ? '' : t('map.hint'));
  const isProblem = !!fileError || !!boundaryError || !!error;

  return (
    <Box
      sx={{
        position: 'relative',
        height: 1,
        minHeight: 320,
        outline: error ? (theme) => `2px solid ${theme.vars.palette.error.main}` : 'none',
        outlineOffset: -2,
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
        <arcgis-zoom slot="bottom-right" />
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

      <Stack
        direction="row"
        spacing={0.25}
        sx={{ position: 'absolute', left: 16, top: 16, p: 0.5, bgcolor: 'common.white', border: '1px solid #C8CED8', borderRadius: 1.25 }}
      >
        <Button component="label" color="inherit" startIcon={<Iconify icon="solar:import-bold" />} sx={{ minHeight: 40 }}>
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
          <Button color="error" onClick={() => onChange(null)} startIcon={<Iconify icon="solar:trash-bin-trash-bold" />} sx={{ minHeight: 40 }}>
            {t('map.clear')}
          </Button>
        )}
      </Stack>

      {message && (
        <Box
          role={isProblem ? 'alert' : 'status'}
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: 24,
            transform: 'translateX(-50%)',
            maxWidth: 'calc(100% - 32px)',
            px: 1.75,
            py: 1.25,
            borderRadius: 1.25,
            bgcolor: isProblem ? 'error.main' : NAVY.main,
            color: 'common.white',
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          {message}
        </Box>
      )}
    </Box>
  );
}
