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

import { fileUrl } from '../api';
import { useRole } from '../role-store';
import { applicationQuery } from '../queries';
import { StatusLabel } from '../components/status-label';
import { ReviewActions } from '../components/review-actions';
import { ApplicationMap } from '../components/application-map';

// ----------------------------------------------------------------------

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
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

export function ApplicationDetailsView({ id }: { id: number }) {
  const { t, localize } = useTranslate();
  const role = useRole();
  const { data: a, isPending, error } = useQuery(applicationQuery(id));

  if (isPending) return <LinearProgress />;
  if (error)
    return (
      <Container maxWidth="lg">
        <Alert severity="error">{localize(error.message)}</Alert>
      </Container>
    );

  return (
    <Container maxWidth="lg">
      <Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <ButtonLink to="/" color="inherit" startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}>
          {t('nav.applications')}
        </ButtonLink>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {a.registrationNumber ?? `#${a.id}`}
        </Typography>
        <StatusLabel status={a.status} />
      </Stack>

      {a.status === 'RETURNED' && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            role === 'APPLICANT' && (
              <ButtonLink to="/applications/$id/edit" params={{ id: String(a.id) }} color="inherit" size="small" startIcon={<Iconify icon="solar:pen-bold" />}>
                {t('details.fixAndResubmit')}
              </ButtonLink>
            )
          }
        >
          <strong>{t('details.returnReason')}:</strong> {a.returnReason}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardHeader title={t('details.info')} />
            <Stack spacing={1.5} sx={{ p: 3 }} divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}>
              <InfoRow label={t('list.columns.registrationNumber')}>{a.registrationNumber ?? t('list.notRegistered')}</InfoRow>
              <InfoRow label={t('form.documentName')}>{a.documentName}</InfoRow>
              <InfoRow label={t('form.documentType')}>{a.documentType}</InfoRow>
              <InfoRow label={t('form.soatoCode')}>
                {a.soatoCode} — {localize(a.regionName)}
              </InfoRow>
              <InfoRow label={t('form.approvalDate')}>{dayjs(a.approvalDate).format('DD.MM.YYYY')}</InfoRow>
              <InfoRow label={t('form.approvalDecree')}>{a.approvalDecree}</InfoRow>
              <InfoRow label={t('list.columns.submittedAt')}>{dayjs(a.submittedAt).format('DD.MM.YYYY HH:mm')}</InfoRow>
              {a.reviewDeadline && <InfoRow label={t('details.reviewDeadline')}>{dayjs(a.reviewDeadline).format('DD.MM.YYYY')}</InfoRow>}
              {a.arcgisObjectId !== null && <InfoRow label={t('details.arcgisId')}>{a.arcgisObjectId}</InfoRow>}
            </Stack>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardHeader title={t('details.files')} />
            <Stack spacing={1.5} sx={{ p: 3 }}>
              {a.files.map((f) => (
                <Stack key={f.field} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <FileThumbnail file={f.name} sx={{ width: 36, height: 36 }} />
                  <Stack sx={{ minWidth: 0 }}>
                    <MuiLink href={fileUrl(f.url)} target="_blank" rel="noopener" variant="subtitle2" noWrap>
                      {t(`form.file.${f.field}`)}
                    </MuiLink>
                    <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                      {f.name} · {fData(f.size)}
                    </Typography>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardHeader title={t('details.map')} />
            <Stack sx={{ p: 3 }}>
              <ApplicationMap application={a} />
            </Stack>
          </Card>

          {role === 'REVIEWER' && a.status === 'SUBMITTED' && (
            <Card sx={{ mt: 3, p: 3 }}>
              <ReviewActions id={a.id} />
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
