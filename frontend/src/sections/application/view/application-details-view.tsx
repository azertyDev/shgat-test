import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { BoxLink, ButtonLink } from 'src/routes/components';

import { fData } from 'src/utils/format-number';

import { useTranslate } from 'src/locales';

import { Iconify } from 'src/components/iconify';

import { fileUrl } from '../api';
import { today } from '../form-schema';
import { useRole } from '../role-store';
import { applicationQuery } from '../queries';
import { MONO_FONT, OVERDUE_COLOR } from '../styles';
import { PageHeader } from '../components/page-header';
import { StatusLabel } from '../components/status-label';
import { ReviewActions } from '../components/review-actions';
import { ApplicationMap } from '../components/application-map';

// ----------------------------------------------------------------------

const mono = { fontFamily: MONO_FONT, fontSize: 13 };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      component="h2"
      sx={{ mt: 2.5, mb: 0.75, fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.secondary' }}
    >
      {children}
    </Typography>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  const cell = { m: 0, py: 1.125, borderBottom: '1px solid #ECEEF2', wordBreak: 'break-word' } as const;
  return (
    <>
      <Box component="dt" sx={{ ...cell, color: 'text.secondary', pr: 2 }}>
        {label}
      </Box>
      <Box component="dd" sx={cell}>
        {children}
      </Box>
    </>
  );
}

export function ApplicationDetailsView({ id }: { id: number }) {
  const { t, localize } = useTranslate();
  const role = useRole();
  const { data: a, isPending, error } = useQuery(applicationQuery(id));

  if (isPending) return <LinearProgress />;
  if (error)
    return (
      <Box sx={{ p: 3.5 }}>
        <PageHeader title={`#${id}`} />
        <Alert severity="error" sx={{ mt: 3 }}>
          {localize(error.message)}
        </Alert>
      </Box>
    );

  const overdue = !!a.reviewDeadline && a.reviewDeadline < today();
  const canReview = role === 'REVIEWER' && a.status === 'SUBMITTED';

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
      <Box component="section" aria-label={t('details.map')} sx={{ position: 'relative', flex: { xs: 'none', md: 1 }, minWidth: 0, height: { xs: 300, md: 'auto' } }}>
        <ApplicationMap application={a} />
        <BoxLink
          to="/"
          sx={{
            position: 'absolute',
            left: 16,
            top: 16,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            minHeight: 44,
            px: 1.75,
            border: '1px solid #C8CED8',
            borderRadius: 1,
            bgcolor: 'common.white',
            color: 'text.primary',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <Iconify icon="eva:arrow-ios-back-fill" width={16} />
          {t('nav.applications')}
        </BoxLink>
      </Box>

      <Stack
        component="section"
        aria-labelledby="application-title"
        sx={{ flex: 'none', width: { md: 440, lg: 480 }, minHeight: 0, bgcolor: 'common.white', borderLeft: { md: '1px solid #DDE1E7' } }}
      >
        <Stack spacing={1} sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: '1px solid #DDE1E7' }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box component="span" sx={{ ...mono, color: a.registrationNumber ? 'text.primary' : 'text.secondary', fontWeight: 500 }}>
              {a.registrationNumber ?? `#${a.id} · ${t('list.notRegistered').toLowerCase()}`}
            </Box>
            <StatusLabel status={a.status} />
          </Stack>
          <Typography id="application-title" component="h1" sx={{ fontSize: 21, lineHeight: 1.25, fontWeight: 700 }}>
            {a.documentName}
          </Typography>
          {a.reviewDeadline && (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: overdue ? OVERDUE_COLOR : 'text.secondary', fontWeight: overdue ? 600 : 400, fontSize: 14 }}>
              <Iconify icon="solar:clock-circle-outline" width={16} />
              <span>
                {overdue ? t('list.overdue') : t('details.reviewDeadline')} ·{' '}
                <Box component="span" sx={mono}>
                  {dayjs(a.reviewDeadline).format('DD.MM.YYYY')}
                </Box>
              </span>
            </Stack>
          )}
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: { md: 'auto' }, px: 3, pb: 2.5 }}>
          {a.status === 'RETURNED' && (
            <Alert
              severity="warning"
              sx={{ mt: 2 }}
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

          <SectionTitle>{t('details.info')}</SectionTitle>
          <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: 'minmax(130px, 0.8fr) 1.2fr', fontSize: 14 }}>
            <InfoRow label={t('form.documentType')}>
              <Box component="span" sx={mono}>
                {a.documentType}
              </Box>
            </InfoRow>
            <InfoRow label={t('form.soatoCode')}>
              <Box component="span" sx={mono}>
                {a.soatoCode}
              </Box>{' '}
              — {localize(a.regionName)}
            </InfoRow>
            <InfoRow label={t('form.approvalDate')}>
              <Box component="span" sx={mono}>
                {dayjs(a.approvalDate).format('DD.MM.YYYY')}
              </Box>
            </InfoRow>
            <InfoRow label={t('form.approvalDecree')}>{a.approvalDecree}</InfoRow>
            <InfoRow label={t('list.columns.submittedAt')}>
              <Box component="span" sx={mono}>
                {dayjs(a.submittedAt).format('DD.MM.YYYY HH:mm')}
              </Box>
            </InfoRow>
            <InfoRow label={t('list.columns.registrationNumber')}>
              {a.registrationNumber ? (
                <Box component="span" sx={{ ...mono, fontWeight: 500 }}>
                  {a.registrationNumber}
                </Box>
              ) : (
                t('list.notRegistered')
              )}
            </InfoRow>
            {a.arcgisObjectId !== null && (
              <InfoRow label={t('details.arcgisId')}>
                <Box component="span" sx={mono}>
                  {a.arcgisObjectId}
                </Box>
              </InfoRow>
            )}
          </Box>

          <SectionTitle>{t('details.files')}</SectionTitle>
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {a.files.map((f) => (
              <Stack component="li" key={f.field} direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1, borderBottom: '1px solid #ECEEF2' }}>
                <Box
                  sx={{
                    flex: 'none',
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: '#F2F4F7',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: MONO_FONT,
                    fontSize: 10.5,
                    fontWeight: 500,
                    color: 'text.secondary',
                  }}
                >
                  {f.name.split('.').pop()?.toUpperCase().slice(0, 4)}
                </Box>
                <Stack sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2">{t(`form.file.${f.field}`)}</Typography>
                  <Typography noWrap sx={{ fontFamily: MONO_FONT, fontSize: 12, color: 'text.secondary' }}>
                    {f.name} · {fData(f.size)}
                  </Typography>
                </Stack>
                <IconButton
                  component="a"
                  href={fileUrl(f.url)}
                  target="_blank"
                  rel="noopener"
                  aria-label={t('details.download', { name: f.name })}
                  sx={{ width: 44, height: 44, color: 'primary.main' }}
                >
                  <Iconify icon="solar:download-bold" width={20} />
                </IconButton>
              </Stack>
            ))}
          </Box>
        </Box>

        {canReview && (
          <Box sx={{ px: 3, pt: 1.75, pb: 2.25, borderTop: '1px solid #DDE1E7' }}>
            <ReviewActions id={a.id} />
          </Box>
        )}
      </Stack>
    </Box>
  );
}
