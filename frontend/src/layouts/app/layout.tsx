import type { LangCode } from 'src/locales';
import type { Role } from 'src/sections/application/types';

import { Link } from '@tanstack/react-router';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { allLangs, useTranslate } from 'src/locales';

import { Logo } from 'src/components/logo';
import { Iconify } from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';

import { setRole, useRole } from 'src/sections/application/role-store';

import { MainSection, LayoutSection, HeaderSection } from '../core';

// ----------------------------------------------------------------------

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { t, currentLang, onChangeLang } = useTranslate();
  const settings = useSettingsContext();
  const role = useRole();

  return (
    <LayoutSection
      headerSection={
        <HeaderSection
          layoutQuery="md"
          slots={{
            leftArea: (
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
                <Logo />
                <Typography
                  component={Link}
                  to="/"
                  variant="h6"
                  noWrap
                  sx={{ color: 'text.primary', textDecoration: 'none', display: { xs: 'none', sm: 'block' } }}
                >
                  {t('app.name')}
                </Typography>
              </Stack>
            ),
            rightArea: (
              <Stack direction="row" spacing={{ xs: 0.5, sm: 1.5 }} sx={{ alignItems: 'center' }}>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  aria-label={t('role.label')}
                  value={role}
                  onChange={(_, v: Role | null) => v && setRole(v)}
                >
                  <ToggleButton value="APPLICANT" aria-label={t('role.APPLICANT')} sx={{ px: { xs: 1, sm: 1.5 } }}>
                    <Iconify icon="solar:user-rounded-bold" width={18} />
                    <Box component="span" sx={{ ml: 0.75, display: { xs: 'none', md: 'inline' } }}>
                      {t('role.APPLICANT')}
                    </Box>
                  </ToggleButton>
                  <ToggleButton value="REVIEWER" aria-label={t('role.REVIEWER')} sx={{ px: { xs: 1, sm: 1.5 } }}>
                    <Iconify icon="solar:shield-check-bold" width={18} />
                    <Box component="span" sx={{ ml: 0.75, display: { xs: 'none', md: 'inline' } }}>
                      {t('role.REVIEWER')}
                    </Box>
                  </ToggleButton>
                </ToggleButtonGroup>

                <ToggleButtonGroup
                  exclusive
                  size="small"
                  aria-label={t('script.label')}
                  value={currentLang.value}
                  onChange={(_, v: LangCode | null) => v && onChangeLang(v)}
                >
                  {allLangs.map((l) => (
                    <ToggleButton key={l.value} value={l.value} sx={{ px: { xs: 1, sm: 1.5 } }}>
                      {l.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                <Tooltip title="Sozlamalar">
                  <IconButton onClick={settings.onToggleDrawer} aria-label="Sozlamalar">
                    <Iconify icon="solar:settings-bold-duotone" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ),
          }}
        />
      }
      footerSection={null}
    >
      <MainSection sx={{ py: { xs: 3, md: 5 } }}>{children}</MainSection>
    </LayoutSection>
  );
}
