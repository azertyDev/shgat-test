import '@arcgis/map-components/components/arcgis-map';
import '@arcgis/map-components/components/arcgis-zoom';

import type Point from '@arcgis/core/geometry/Point.js';
import type MapView from '@arcgis/core/views/MapView.js';
import type { ApplicationStatus, ApplicationSummary } from '../types';

import dayjs from 'dayjs';
import Graphic from '@arcgis/core/Graphic.js';
import { useMemo, useState, useEffect } from 'react';
import Polygon from '@arcgis/core/geometry/Polygon.js';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils.js';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';

import { ButtonLink } from 'src/routes/components';

import { useTranslate } from 'src/locales';

import { Iconify } from 'src/components/iconify';

import { today } from '../form-schema';
import { INITIAL_VIEW } from './map-config';
import { boundaryRings } from '../boundary';
import { placeCard } from './card-placement';
import { StatusLabel } from './status-label';
import { APPLICATION_STATUSES } from '../types';
import { MONO_FONT, STATUS_STYLE, OVERDUE_COLOR } from '../styles';

// ----------------------------------------------------------------------

const HIGHLIGHT_LINE = [36, 86, 200, 1];

const symbolFor = (status: ApplicationStatus, highlighted: boolean) => ({
  type: 'simple-fill' as const,
  color: [...STATUS_STYLE[status].fill, highlighted ? 0.35 : 0.22],
  outline: { color: highlighted ? HIGHLIGHT_LINE : [...STATUS_STYLE[status].line, 1], width: highlighted ? 3 : 1.5 },
});

type Props = {
  items: ApplicationSummary[];
  /** application under the pointer, shared with the list */
  highlightedId: number | null;
  onHighlight: (id: number | null) => void;
  showDeadline: boolean;
};

type ScreenPoint = Parameters<MapView['hitTest']>[0];

/**
 * Boundaries of the listed applications, coloured by status.
 * Hover: pointer cursor and highlight (in the list too); click: a card with the application and a link to it.
 * Overlaps: smaller boundaries are drawn on top, and a click on several at once lets the user pick one.
 */
export function ApplicationsOverviewMap({ items, highlightedId, onHighlight, showDeadline }: Props) {
  const { t } = useTranslate();
  const [view, setView] = useState<MapView | null>(null);
  // applications under the last click, topmost first; the card shows one of them or a choice
  const [selection, setSelection] = useState<number[]>([]);
  // where the user clicked (map coordinates) and where that is on screen now
  const [anchor, setAnchor] = useState<Point | null>(null);
  const [anchorOnScreen, setAnchorOnScreen] = useState<{ x: number; y: number } | null>(null);
  const layer = useMemo(() => new GraphicsLayer(), []);
  const idsKey = items.map((a) => a.id).join(',');
  const picked = selection
    .map((id) => items.find((a) => a.id === id))
    .filter((a): a is ApplicationSummary => !!a);
  const selected = picked.length === 1 ? picked[0] : undefined;
  const selectedId = selected?.id ?? null;

  useEffect(() => {
    if (!view) return undefined;
    view.map?.add(layer);
    // boundaries under the point, topmost (= smallest) first
    const idsAt = (e: ScreenPoint) =>
      view
        .hitTest(e, { include: [layer] })
        .then((r) => r.results.flatMap((x) => (x.type === 'graphic' ? [x.graphic.attributes.id as number] : [])));
    let moving = false; // one hit test at a time: pointer-move fires far more often than it can answer
    const handles = [
      view.on('pointer-move', (e: ScreenPoint) => {
        if (moving) return;
        moving = true;
        idsAt(e)
          .then(([id]) => {
            if (view.container) view.container.style.cursor = id ? 'pointer' : '';
            onHighlight(id ?? null);
          })
          .finally(() => {
            moving = false;
          });
      }),
      view.on('pointer-leave', () => onHighlight(null)),
      view.on('click', (e: ScreenPoint & { mapPoint: Point }) =>
        idsAt(e).then((ids) => {
          setSelection(ids);
          setAnchor(ids.length ? e.mapPoint : null);
        })
      ),
    ];
    return () => {
      handles.forEach((h) => h.remove());
      view.map?.remove(layer);
    };
  }, [view, layer, onHighlight]);

  // new page of results: redraw and fit the map to it
  useEffect(() => {
    layer.removeAll();
    const graphics = items.map(
      (a) =>
        new Graphic({
          geometry: new Polygon({ rings: boundaryRings(a.boundary), spatialReference: { wkid: 4326 } }),
          symbol: symbolFor(a.status, false),
          attributes: { id: a.id, status: a.status },
        })
    );
    // big ones first, so a small boundary inside a big one stays visible and clickable
    const size = (g: Graphic) => (g.geometry?.extent ? g.geometry.extent.width * g.geometry.extent.height : 0);
    layer.addMany(graphics.sort((a, b) => size(b) - size(a)));
    if (view && layer.graphics.length) view.goTo(layer.graphics.toArray(), { animate: false }).catch(() => {});
    // items are compared by their ids, so a refetch with the same rows does not move the map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer, view, idsKey]);

  useEffect(() => {
    layer.graphics.forEach((g) => {
      const { id, status } = g.attributes;
      g.symbol = symbolFor(status, id === highlightedId || id === selectedId) as never;
    });
  }, [layer, highlightedId, selectedId, idsKey]);

  // the card follows its point while the map is panned or zoomed
  useEffect(() => {
    if (!view || !anchor) {
      setAnchorOnScreen(null);
      return undefined;
    }
    const handle = reactiveUtils.watch(
      () => view.extent,
      () => setAnchorOnScreen(view.toScreen(anchor) ?? null),
      { initial: true }
    );
    return () => handle.remove();
  }, [view, anchor]);

  const placement = view && anchorOnScreen ? placeCard(anchorOnScreen, view.width, view.height) : null;
  const cardSx = {
    position: 'absolute',
    ...placement,
    bgcolor: 'common.white',
    border: '1px solid #DDE1E7',
    borderRadius: 1.25,
    boxShadow: '0 6px 20px rgba(16, 35, 59, 0.14)',
  } as const;
  const closeCard = () => {
    setSelection([]);
    setAnchor(null);
  };

  const overdue = !!selected?.reviewDeadline && selected.reviewDeadline < today();

  return (
    <Box sx={{ position: 'relative', height: 1, minHeight: 280 }}>
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

      {placement && picked.length > 1 && (
        <Stack
          role="dialog"
          aria-label={t('map.severalHere', { count: picked.length })}
          sx={{ ...cardSx, py: 1 }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 1.75, pb: 0.5 }}>
            <Box component="span" sx={{ fontSize: 13, fontWeight: 600 }}>
              {t('map.severalHere', { count: picked.length })}
            </Box>
            <IconButton aria-label={t('map.close')} size="small" onClick={closeCard} sx={{ mr: -0.75 }}>
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
          </Stack>
          <Box sx={{ overflowY: 'auto', minHeight: 0 }}>
            {picked.map((a) => (
              <Stack
                key={a.id}
                component="button"
                type="button"
                spacing={0.5}
                onClick={() => setSelection([a.id])}
                onMouseEnter={() => onHighlight(a.id)}
                onMouseLeave={() => onHighlight(null)}
                sx={{
                  width: 1,
                  px: 1.75,
                  py: 1,
                  border: 0,
                  borderTop: '1px solid #ECEEF2',
                  bgcolor: 'transparent',
                  font: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                  '&:hover, &:focus-visible': { bgcolor: '#EDF2FC' },
                }}
              >
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Box component="span" sx={{ fontFamily: MONO_FONT, fontSize: 12, color: 'text.secondary' }}>
                    {a.registrationNumber ?? `#${a.id}`}
                  </Box>
                  <StatusLabel status={a.status} />
                </Stack>
                <Box component="span" sx={{ fontWeight: 600, fontSize: 14 }}>
                  {a.documentName}
                </Box>
              </Stack>
            ))}
          </Box>
        </Stack>
      )}

      {placement && selected && (
        <Stack
          role="dialog"
          aria-label={selected.documentName}
          spacing={0.75}
          sx={{ ...cardSx, p: '12px 14px', overflowY: 'auto' }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <StatusLabel status={selected.status} />
            <IconButton aria-label={t('map.close')} size="small" onClick={closeCard} sx={{ mr: -0.75 }}>
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
          </Stack>
          <Box component="span" sx={{ fontFamily: MONO_FONT, fontSize: 12.5, color: 'text.secondary' }}>
            {selected.registrationNumber ?? `#${selected.id} · ${selected.documentType} · ${selected.soatoCode}`}
          </Box>
          <Box component="span" sx={{ fontWeight: 600, fontSize: 14 }}>
            {selected.documentName}
          </Box>
          {showDeadline && selected.reviewDeadline && (
            <Box component="span" sx={{ fontSize: 13, color: overdue ? OVERDUE_COLOR : 'text.secondary', fontWeight: overdue ? 600 : 400 }}>
              {overdue ? `${t('list.overdue')} · ` : ''}
              {overdue ? dayjs(selected.reviewDeadline).format('DD.MM.YYYY') : t('list.until', { date: dayjs(selected.reviewDeadline).format('DD.MM.YYYY') })}
            </Box>
          )}
          {selected.id > 0 && (
            <ButtonLink to="/applications/$id" params={{ id: String(selected.id) }} variant="contained" color="primary" sx={{ mt: 0.5, minHeight: 40 }}>
              {t('map.openApplication')}
            </ButtonLink>
          )}
        </Stack>
      )}

      <Stack
        spacing={0.75}
        sx={{
          display: { xs: 'none', sm: 'flex' },
          position: 'absolute',
          left: 16,
          bottom: 24,
          p: '12px 14px',
          bgcolor: 'common.white',
          border: '1px solid #DDE1E7',
          borderRadius: 1.25,
          fontSize: 13,
        }}
      >
        <Box component="b" sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {t('map.legend')}
        </Box>
        {APPLICATION_STATUSES.map((s) => (
          <Stack key={s} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box
              component="i"
              sx={{
                width: 14,
                height: 10,
                borderRadius: '2px',
                bgcolor: `rgba(${STATUS_STYLE[s].fill.join(',')}, 0.35)`,
                border: `1.5px solid rgb(${STATUS_STYLE[s].line.join(',')})`,
              }}
            />
            <span>{t(`status.${s}`)}</span>
          </Stack>
        ))}
        <Box component="span" sx={{ pt: 0.5, maxWidth: 180, fontSize: 12, color: 'text.secondary' }}>
          {t('map.clickHint')}
        </Box>
      </Stack>
    </Box>
  );
}
