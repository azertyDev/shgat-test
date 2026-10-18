import type { ListSearch } from '../list-search';
import type { ApplicationStatus, ApplicationSummary } from '../types';

import dayjs from 'dayjs';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import TablePagination from '@mui/material/TablePagination';

import { BoxLink, ButtonLink } from 'src/routes/components';

import { useTranslate } from 'src/locales';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';

import { today } from '../form-schema';
import { useRole } from '../role-store';
import { isOptimistic } from '../optimistic';
import { MONO_FONT, OVERDUE_COLOR } from '../styles';
import { StatusLabel } from '../components/status-label';
import { soatoQuery, applicationListQuery } from '../queries';
import { DOCUMENT_TYPES, APPLICATION_STATUSES } from '../types';
import { applyListFilter, DEFAULT_PAGE_SIZE } from '../list-search';
import { ApplicationsOverviewMap } from '../components/applications-overview-map';

// ----------------------------------------------------------------------

const isOverdue = (a: ApplicationSummary, todayInTashkent: string) =>
  !!a.reviewDeadline && a.reviewDeadline < todayInTashkent;

function ApplicationRow({
  a,
  isReviewer,
  todayInTashkent,
  highlighted,
  onHighlight,
}: {
  a: ApplicationSummary;
  isReviewer: boolean;
  todayInTashkent: string;
  highlighted: boolean;
  onHighlight: (id: number | null) => void;
}) {
  const { t, localize } = useTranslate();
  const mono = { fontFamily: MONO_FONT, fontSize: 12.5 };
  // not saved yet: there is no page to open
  const sending = isOptimistic(a);

  return (
    <BoxLink
      to="/applications/$id"
      params={{ id: String(a.id) }}
      disabled={sending}
      aria-busy={sending || undefined}
      onMouseEnter={() => onHighlight(a.id)}
      onMouseLeave={() => onHighlight(null)}
      onFocus={() => onHighlight(a.id)}
      onBlur={() => onHighlight(null)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        px: 2.5,
        py: 1.625,
        borderBottom: '1px solid #ECEEF2',
        color: 'text.primary',
        textDecoration: 'none',
        bgcolor: highlighted ? '#EDF2FC' : 'transparent',
        opacity: sending ? 0.6 : 1,
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box component="span" sx={{ ...mono, color: a.registrationNumber ? 'text.primary' : 'text.secondary', fontWeight: a.registrationNumber ? 500 : 400 }}>
          {sending ? t('list.sending') : (a.registrationNumber ?? `#${a.id} · ${t('list.notRegistered').toLowerCase()}`)}
        </Box>
        <StatusLabel status={a.status} />
      </Stack>
      <Box component="span" sx={{ fontWeight: 600, fontSize: 15 }}>
        {a.documentName}
      </Box>
      <Stack direction="row" sx={{ flexWrap: 'wrap', alignItems: 'center', columnGap: 1.25, rowGap: 0.5, fontSize: 13, color: 'text.secondary' }}>
        <Box component="span" sx={mono}>
          {a.documentType}
        </Box>
        <span>{localize(a.regionName) || a.soatoCode}</span>
        {isReviewer && a.reviewDeadline ? (
          isOverdue(a, todayInTashkent) ? (
            <Stack component="span" direction="row" spacing={0.625} sx={{ alignItems: 'center', color: OVERDUE_COLOR, fontWeight: 600 }}>
              <Iconify icon="solar:clock-circle-outline" width={14} />
              <span>
                {t('list.overdue')} · <Box component="span" sx={mono}>{dayjs(a.reviewDeadline).format('DD.MM.YYYY')}</Box>
              </span>
            </Stack>
          ) : (
            <span>{t('list.until', { date: dayjs(a.reviewDeadline).format('DD.MM.YYYY') })}</span>
          )
        ) : (
          <Box component="span" sx={mono}>
            {dayjs(a.submittedAt).format('DD.MM.YYYY HH:mm')}
          </Box>
        )}
      </Stack>
    </BoxLink>
  );
}

export function ApplicationListView({ search }: { search: ListSearch }) {
  const { t, localize } = useTranslate();
  const role = useRole();
  const navigate = useNavigate({ from: '/' });
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? DEFAULT_PAGE_SIZE;
  const isReviewer = role === 'REVIEWER';
  const todayInTashkent = today();

  const { data, isFetching, isError, error } = useQuery(
    applicationListQuery({ status: search.status, documentType: search.type, soatoCode: search.region?.toString(), page, pageSize })
  );

  const setFilter = (patch: Partial<ListSearch>) => navigate({ search: (prev) => applyListFilter(prev, patch) });
  const regions = useQuery(soatoQuery);
  const filterSx = { flex: { xs: 1, sm: 'none' }, width: { sm: 180 }, minWidth: 0 };
  const subtitle = isReviewer ? t('list.reviewerHint') : t('list.applicantHint');

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }}>
      <Stack spacing={1.75} sx={{ px: 3, pt: 2.25, bgcolor: 'common.white', borderBottom: '1px solid #DDE1E7' }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h1" sx={{ fontSize: 24, lineHeight: 1.2, fontWeight: 700 }}>
              {t('list.title')}
            </Typography>
            <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: 14, minHeight: 21 }}>{subtitle}</Typography>
          </Box>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, width: { xs: 1, sm: 'auto' } }}>
            <TextField
              select
              size="small"
              label={t('list.type')}
              value={search.type ?? ''}
              onChange={(e) => setFilter({ type: (e.target.value || undefined) as ListSearch['type'] })}
              slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
              sx={filterSx}
            >
              <MenuItem value="">{t('list.allTypes')}</MenuItem>
              {DOCUMENT_TYPES.map((type) => (
                <MenuItem key={type} value={type} sx={{ fontFamily: MONO_FONT }}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label={t('list.region')}
              value={search.region?.toString() ?? ''}
              onChange={(e) => setFilter({ region: e.target.value ? Number(e.target.value) : undefined })}
              slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
              sx={filterSx}
            >
              <MenuItem value="">{t('list.allRegions')}</MenuItem>
              {regions.data?.map((r) => (
                <MenuItem key={r.code} value={r.code}>
                  {localize(r.name)}
                </MenuItem>
              ))}
            </TextField>
            {role === 'APPLICANT' && (
              <ButtonLink
                to="/applications/new"
                variant="contained"
                color="primary"
                startIcon={<Iconify icon="solar:add-circle-bold" />}
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, whiteSpace: 'nowrap' }}
              >
                {t('nav.newApplication')}
              </ButtonLink>
            )}
            {role === 'APPLICANT' && (
              // phones: icon only, so it fits next to the type filter
              <ButtonLink
                to="/applications/new"
                variant="contained"
                color="primary"
                aria-label={t('nav.newApplication')}
                sx={{ display: { xs: 'inline-flex', sm: 'none' }, minWidth: 44, width: 44, height: 44, p: 0 }}
              >
                <Iconify icon="mingcute:add-line" width={22} />
              </ButtonLink>
            )}
          </Stack>
        </Stack>

        <Tabs
          aria-label={t('list.byStatus')}
          value={search.status ?? 'all'}
          onChange={(_, v: ApplicationStatus | 'all') => setFilter({ status: v === 'all' ? undefined : v })}
          variant="scrollable"
          scrollButtons={false}
          sx={{ mx: { xs: -1.5, sm: 0 }, minHeight: 44, '& .MuiTab-root': { minHeight: 44, px: 1.5, mr: 0.5 } }}
        >
          <Tab value="all" label={t('list.all')} />
          {APPLICATION_STATUSES.map((s) => (
            <Tab key={s} value={s} label={t(`status.${s}`)} />
          ))}
        </Tabs>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
        <Stack
          component="section"
          aria-label={t('list.title')}
          sx={{
            order: { xs: 2, md: 1 },
            flex: 'none',
            width: { md: 440, lg: 520 },
            minHeight: 0,
            bgcolor: 'common.white',
            borderRight: { md: '1px solid #DDE1E7' },
          }}
        >
          <Box sx={{ height: 4, flex: 'none' }}>{isFetching && <LinearProgress />}</Box>
          {isError && <Alert severity="error" sx={{ m: 2 }}>{localize(error.message)}</Alert>}
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {data?.items.map((a) => (
              <ApplicationRow
                key={a.id}
                a={a}
                isReviewer={isReviewer}
                todayInTashkent={todayInTashkent}
                highlighted={a.id === highlightedId}
                onHighlight={setHighlightedId}
              />
            ))}
            {data?.items.length === 0 && <EmptyContent title={t('list.empty')} sx={{ py: 8 }} />}
          </Box>
          <TablePagination
            component="div"
            count={data?.total ?? 0}
            page={page - 1}
            rowsPerPage={pageSize}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage={t('list.rowsPerPage')}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
            onPageChange={(_, p) => setFilter({ ...search, page: p + 1 })}
            onRowsPerPageChange={(e) => setFilter({ pageSize: Number(e.target.value) })}
            sx={{ flex: 'none', borderTop: '1px solid #DDE1E7' }}
          />
        </Stack>

        <Box
          component="section"
          aria-label={t('map.title')}
          // a fixed height on phones: a flexed item has no definite height and the map would collapse to 0
          sx={{ order: { xs: 1, md: 2 }, flex: { xs: 'none', md: 1 }, minWidth: 0, height: { xs: 280, md: 'auto' } }}
        >
          <ApplicationsOverviewMap items={data?.items ?? []} highlightedId={highlightedId} onHighlight={setHighlightedId} showDeadline={isReviewer} />
        </Box>
      </Box>
    </Stack>
  );
}
