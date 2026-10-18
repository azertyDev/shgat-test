import type { ListSearch } from '../list-search';
import type { ApplicationStatus } from '../types';

import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { ButtonLink } from 'src/routes/components';

import { useTranslate } from 'src/locales';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import { Scrollbar } from 'src/components/scrollbar';

import { useRole } from '../role-store';
import { applicationListQuery } from '../queries';
import { DEFAULT_PAGE_SIZE } from '../list-search';
import { StatusLabel } from '../components/status-label';
import { DOCUMENT_TYPES, APPLICATION_STATUSES } from '../types';

// ----------------------------------------------------------------------

export function ApplicationListView({ search }: { search: ListSearch }) {
  const { t, localize } = useTranslate();
  const role = useRole();
  const navigate = useNavigate({ from: '/' });
  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? DEFAULT_PAGE_SIZE;

  const { data, isFetching, isError, error } = useQuery(
    applicationListQuery({ status: search.status, documentType: search.type, page, pageSize })
  );

  const setFilter = (patch: Partial<ListSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: patch.page }) });

  const today = dayjs().format('YYYY-MM-DD');
  const isReviewer = role === 'REVIEWER';

  return (
    <Container maxWidth="lg">
      <Stack direction="row" sx={{ mb: 3, alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4">{t('list.title')}</Typography>
        {role === 'APPLICANT' && (
          <ButtonLink to="/applications/new" variant="contained" startIcon={<Iconify icon="solar:add-circle-bold" />}>
            {t('nav.newApplication')}
          </ButtonLink>
        )}
      </Stack>

      <Card>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ p: 2.5 }}>
          <TextField
            select
            size="small"
            label={t('list.status')}
            value={search.status ?? ''}
            onChange={(e) => setFilter({ status: (e.target.value || undefined) as ApplicationStatus | undefined })}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">{t('list.all')}</MenuItem>
            {APPLICATION_STATUSES.map((h) => (
              <MenuItem key={h} value={h}>
                {t(`status.${h}`)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('list.type')}
            value={search.type ?? ''}
            onChange={(e) =>
              setFilter({ type: (e.target.value || undefined) as ListSearch['type'] })
            }
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">{t('list.all')}</MenuItem>
            {DOCUMENT_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Box sx={{ height: 4 }}>{isFetching && <LinearProgress />}</Box>
        {isError && <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>{localize(error.message)}</Alert>}

        <TableContainer>
          <Scrollbar>
            <Table sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('list.columns.registrationNumber')}</TableCell>
                  <TableCell>{t('list.columns.documentName')}</TableCell>
                  <TableCell>{t('list.columns.documentType')}</TableCell>
                  <TableCell>{t('list.columns.region')}</TableCell>
                  <TableCell>{t('list.columns.status')}</TableCell>
                  <TableCell>{isReviewer ? t('list.columns.reviewDeadline') : t('list.columns.submittedAt')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.items.map((a) => (
                  <TableRow
                    key={a.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate({ to: '/applications/$id', params: { id: String(a.id) } })}
                  >
                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {a.registrationNumber ?? (
                        <Typography variant="body2" component="span" sx={{ color: 'text.disabled' }}>
                          #{a.id} · {t('list.notRegistered')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link to="/applications/$id" params={{ id: String(a.id) }} style={{ color: 'inherit' }} onClick={(e) => e.stopPropagation()}>
                        {a.documentName}
                      </Link>
                    </TableCell>
                    <TableCell>{a.documentType}</TableCell>
                    <TableCell>{localize(a.regionName) || a.soatoCode}</TableCell>
                    <TableCell>
                      <StatusLabel status={a.status} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {isReviewer && a.reviewDeadline ? (
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <span>{dayjs(a.reviewDeadline).format('DD.MM.YYYY')}</span>
                          {a.reviewDeadline < today && (
                            <Label color="error" variant="soft">
                              {t('list.overdue')}
                            </Label>
                          )}
                        </Stack>
                      ) : (
                        dayjs(a.submittedAt).format('DD.MM.YYYY HH:mm')
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableNoData notFound={data?.items.length === 0} />
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>

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
        />
      </Card>
    </Container>
  );
}
