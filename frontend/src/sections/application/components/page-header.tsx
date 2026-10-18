import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { BoxLink } from 'src/routes/components';

import { useTranslate } from 'src/locales';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/** "← Arizalar" back link, page title and an optional note under it. */
export function PageHeader({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  const { t } = useTranslate();
  return (
    <Box>
      <BoxLink
        to="/"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, minHeight: 32, color: 'primary.main', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}
      >
        <Iconify icon="eva:arrow-ios-back-fill" width={16} />
        {t('nav.applications')}
      </BoxLink>
      <Typography component="h1" sx={{ mt: 0.25, fontSize: 24, lineHeight: 1.2, fontWeight: 700 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
