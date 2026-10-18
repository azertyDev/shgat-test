import type { Holat } from '../types';
import type { RoyxatSearch } from '../search';

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

import { useRol } from '../rol';
import { royxatQuery } from '../queries';
import { STANDART_HAJM } from '../search';
import { HOLATLAR, HUJJAT_TURLARI } from '../types';
import { HolatLabel } from '../components/holat-label';

// ----------------------------------------------------------------------

export function ArizaListView({ search }: { search: RoyxatSearch }) {
  const { t, tr } = useTranslate();
  const rol = useRol();
  const navigate = useNavigate({ from: '/' });
  const sahifa = search.sahifa ?? 1;
  const hajm = search.hajm ?? STANDART_HAJM;

  const { data, isFetching, isError, error } = useQuery(
    royxatQuery({ holat: search.holat, hujjat_turi: search.hujjat_turi, sahifa, hajm })
  );

  const filtr = (patch: Partial<RoyxatSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, sahifa: patch.sahifa }) });

  const bugun = dayjs().format('YYYY-MM-DD');
  const tekshiruvchi = rol === 'tekshiruvchi';

  return (
    <Container maxWidth="lg">
      <Stack direction="row" sx={{ mb: 3, alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4">{t('royxat.sarlavha')}</Typography>
        {rol === 'ariza_beruvchi' && (
          <ButtonLink to="/arizalar/yangi" variant="contained" startIcon={<Iconify icon="solar:add-circle-bold" />}>
            {t('nav.yangi')}
          </ButtonLink>
        )}
      </Stack>

      <Card>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ p: 2.5 }}>
          <TextField
            select
            size="small"
            label={t('royxat.holat')}
            value={search.holat ?? ''}
            onChange={(e) => filtr({ holat: (e.target.value || undefined) as Holat | undefined })}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">{t('royxat.barchasi')}</MenuItem>
            {HOLATLAR.map((h) => (
              <MenuItem key={h} value={h}>
                {t(`holat.${h}`)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('royxat.tur')}
            value={search.hujjat_turi ?? ''}
            onChange={(e) =>
              filtr({ hujjat_turi: (e.target.value || undefined) as RoyxatSearch['hujjat_turi'] })
            }
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">{t('royxat.barchasi')}</MenuItem>
            {HUJJAT_TURLARI.map((tur) => (
              <MenuItem key={tur} value={tur}>
                {tur}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Box sx={{ height: 4 }}>{isFetching && <LinearProgress />}</Box>
        {isError && <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>{tr(error.message)}</Alert>}

        <TableContainer>
          <Scrollbar>
            <Table sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('royxat.ustun.id_raqam')}</TableCell>
                  <TableCell>{t('royxat.ustun.nomi')}</TableCell>
                  <TableCell>{t('royxat.ustun.turi')}</TableCell>
                  <TableCell>{t('royxat.ustun.hudud')}</TableCell>
                  <TableCell>{t('royxat.ustun.holat')}</TableCell>
                  <TableCell>{tekshiruvchi ? t('royxat.ustun.muddat') : t('royxat.ustun.yuborilgan')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.items.map((a) => (
                  <TableRow
                    key={a.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate({ to: '/arizalar/$id', params: { id: String(a.id) } })}
                  >
                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {a.id_raqam ?? (
                        <Typography variant="body2" component="span" sx={{ color: 'text.disabled' }}>
                          #{a.id} · {t('royxat.idYoq')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link to="/arizalar/$id" params={{ id: String(a.id) }} style={{ color: 'inherit' }} onClick={(e) => e.stopPropagation()}>
                        {a.hujjat_nomi}
                      </Link>
                    </TableCell>
                    <TableCell>{a.hujjat_turi}</TableCell>
                    <TableCell>{tr(a.hudud_nomi) || a.soato_kodi}</TableCell>
                    <TableCell>
                      <HolatLabel holat={a.holat} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {tekshiruvchi && a.muddat ? (
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <span>{dayjs(a.muddat).format('DD.MM.YYYY')}</span>
                          {a.muddat < bugun && (
                            <Label color="error" variant="soft">
                              {t('royxat.muddatOtgan')}
                            </Label>
                          )}
                        </Stack>
                      ) : (
                        dayjs(a.yuborilgan_vaqt).format('DD.MM.YYYY HH:mm')
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
          count={data?.jami ?? 0}
          page={sahifa - 1}
          rowsPerPage={hajm}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage={t('royxat.sahifada')}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
          onPageChange={(_, p) => filtr({ ...search, sahifa: p + 1 })}
          onRowsPerPageChange={(e) => filtr({ hajm: Number(e.target.value) })}
        />
      </Card>
    </Container>
  );
}
