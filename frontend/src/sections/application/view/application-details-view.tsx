import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import MuiLink from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { ButtonLink } from 'src/routes/components';

import { fData } from 'src/utils/format-number';

import { useTranslate } from 'src/locales';

import { Iconify } from 'src/components/iconify';
import { FileThumbnail } from 'src/components/file-thumbnail';

import { faylUrl } from '../api';
import { useRol } from '../role-store';
import { arizaQuery } from '../queries';
import { HolatLabel } from '../components/status-label';
import { ArizaXarita } from '../components/application-map';
import { TekshiruvAmallari } from '../components/review-actions';

// ----------------------------------------------------------------------

function Qator({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.25, sm: 2 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 190, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" component="div" sx={{ wordBreak: 'break-word' }}>
        {children}
      </Typography>
    </Stack>
  );
}

export function ArizaDetailsView({ id }: { id: number }) {
  const { t, tr } = useTranslate();
  const rol = useRol();
  const { data: a, isPending, error } = useQuery(arizaQuery(id));

  if (isPending) return <LinearProgress />;
  if (error)
    return (
      <Container maxWidth="lg">
        <Alert severity="error">{tr(error.message)}</Alert>
      </Container>
    );

  return (
    <Container maxWidth="lg">
      <Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <ButtonLink to="/" color="inherit" startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}>
          {t('nav.arizalar')}
        </ButtonLink>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {a.id_raqam ?? `#${a.id}`}
        </Typography>
        <HolatLabel holat={a.holat} />
      </Stack>

      {a.holat === 'qaytarilgan' && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            rol === 'ariza_beruvchi' && (
              <ButtonLink to="/applications/$id/edit" params={{ id: String(a.id) }} color="inherit" size="small" startIcon={<Iconify icon="solar:pen-bold" />}>
                {t('batafsil.tuzatish')}
              </ButtonLink>
            )
          }
        >
          <strong>{t('batafsil.qaytarishSababi')}:</strong> {a.qaytarish_sababi}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardHeader title={t('batafsil.malumotlar')} />
            <Stack spacing={1.5} sx={{ p: 3 }} divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}>
              <Qator label={t('royxat.ustun.id_raqam')}>{a.id_raqam ?? t('royxat.idYoq')}</Qator>
              <Qator label={t('forma.hujjat_nomi')}>{a.hujjat_nomi}</Qator>
              <Qator label={t('forma.hujjat_turi')}>{a.hujjat_turi}</Qator>
              <Qator label={t('forma.soato_kodi')}>
                {a.soato_kodi} — {tr(a.hudud_nomi)}
              </Qator>
              <Qator label={t('forma.tasdiq_sanasi')}>{dayjs(a.tasdiq_sanasi).format('DD.MM.YYYY')}</Qator>
              <Qator label={t('forma.tasdiq_hujjati')}>{a.tasdiq_hujjati}</Qator>
              <Qator label={t('royxat.ustun.yuborilgan')}>{dayjs(a.yuborilgan_vaqt).format('DD.MM.YYYY HH:mm')}</Qator>
              {a.muddat && <Qator label={t('batafsil.muddat')}>{dayjs(a.muddat).format('DD.MM.YYYY')}</Qator>}
              {a.arcgis_object_id !== null && <Qator label={t('batafsil.arcgisId')}>{a.arcgis_object_id}</Qator>}
            </Stack>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardHeader title={t('batafsil.fayllar')} />
            <Stack spacing={1.5} sx={{ p: 3 }}>
              {a.fayllar.map((f) => (
                <Stack key={f.tur} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <FileThumbnail file={f.nomi} sx={{ width: 36, height: 36 }} />
                  <Stack sx={{ minWidth: 0 }}>
                    <MuiLink href={faylUrl(f.url)} target="_blank" rel="noopener" variant="subtitle2" noWrap>
                      {t(`forma.fayl.${f.tur}`)}
                    </MuiLink>
                    <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                      {f.nomi} · {fData(f.hajm)}
                    </Typography>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardHeader title={t('batafsil.xarita')} />
            <Stack sx={{ p: 3 }}>
              <ArizaXarita ariza={a} />
            </Stack>
          </Card>

          {rol === 'tekshiruvchi' && a.holat === 'yuborilgan' && (
            <Card sx={{ mt: 3, p: 3 }}>
              <TekshiruvAmallari id={a.id} />
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
