import type { LangCode } from 'src/locales';
import type { Role } from 'src/sections/application/types';

import { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { allLangs, useTranslate } from 'src/locales';

import { Iconify } from 'src/components/iconify';

import { NAVY, PAGE_BG } from 'src/sections/application/styles';
import { setRole, useRole } from 'src/sections/application/role-store';

// ----------------------------------------------------------------------

const segmentSx = {
  display: 'flex',
  gap: '3px',
  p: '3px',
  borderRadius: 1,
  bgcolor: NAVY.deep,
  '& .MuiToggleButton-root': {
    flex: 1,
    minHeight: 36,
    border: 0,
    borderRadius: '6px !important',
    color: NAVY.text,
    fontSize: 13,
    fontWeight: 500,
    textTransform: 'none',
    '&:hover': { bgcolor: NAVY.hover },
    '&.Mui-selected, &.Mui-selected:hover': { bgcolor: 'common.white', color: NAVY.main, fontWeight: 600 },
  },
} as const;

function ScriptToggle({ short }: { short?: boolean }) {
  const { t, currentLang, onChangeLang } = useTranslate();
  return (
    <ToggleButtonGroup
      exclusive
      aria-label={t('script.label')}
      value={currentLang.value}
      onChange={(_, v: LangCode | null) => v && onChangeLang(v)}
      sx={segmentSx}
    >
      {allLangs.map((l) => (
        <ToggleButton key={l.value} value={l.value} aria-label={l.label} sx={{ minWidth: 44 }}>
          {short ? l.label.slice(0, 3) : l.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslate();
  const role = useRole();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isNew = pathname === '/applications/new';

  const linkSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1.25,
    minHeight: 44,
    px: 1.5,
    borderRadius: 1,
    color: NAVY.text,
    textDecoration: 'none',
    fontWeight: 500,
    '&:hover': { bgcolor: NAVY.hover, color: 'common.white' },
    '&[aria-current=page]': { bgcolor: NAVY.active, color: 'common.white' },
  } as const;

  return (
    <Stack sx={{ height: 1, p: '20px 14px', bgcolor: NAVY.main, color: NAVY.text }}>
      <Box
        component={Link}
        to="/"
        onClick={onNavigate}
        sx={{ px: 1.25, pt: 0.5, pb: 2.75, color: 'common.white', fontWeight: 700, fontSize: 20, letterSpacing: '0.04em', textDecoration: 'none' }}
      >
        {t('app.shortName')}
      </Box>

      <Stack component="nav" aria-label={t('nav.sections')} spacing={0.5}>
        <Box component={Link} to="/" onClick={onNavigate} aria-current={isNew ? undefined : 'page'} sx={linkSx}>
          {t('nav.applications')}
        </Box>
        {role === 'APPLICANT' && (
          <Box component={Link} to="/applications/new" onClick={onNavigate} aria-current={isNew ? 'page' : undefined} sx={linkSx}>
            {t('nav.newApplication')}
          </Box>
        )}
      </Stack>

      <Stack spacing={1.5} sx={{ mt: 'auto', px: 0.5, pt: 3 }}>
        <Box component="span" sx={{ fontSize: 12, color: NAVY.muted }}>
          {t('role.label')}
        </Box>
        <ToggleButtonGroup
          exclusive
          orientation="vertical"
          aria-label={t('role.label')}
          value={role}
          onChange={(_, v: Role | null) => v && setRole(v)}
          sx={segmentSx}
        >
          <ToggleButton value="APPLICANT">{t('role.APPLICANT')}</ToggleButton>
          <ToggleButton value="REVIEWER">{t('role.REVIEWER')}</ToggleButton>
        </ToggleButtonGroup>
        <Box component="span" sx={{ fontSize: 12, color: NAVY.muted }}>
          {t('script.label')}
        </Box>
        <ScriptToggle />
      </Stack>
    </Stack>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        minHeight: '100vh',
        height: { md: '100vh' },
        bgcolor: PAGE_BG,
      }}
    >
      <Box component="aside" sx={{ display: { xs: 'none', md: 'block' }, flex: 'none', width: 232 }}>
        <Sidebar />
      </Box>

      <Stack
        component="header"
        direction="row"
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'sticky',
          top: 0,
          zIndex: 10,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          py: 1,
          pl: 2,
          pr: 1,
          bgcolor: NAVY.main,
          color: 'common.white',
        }}
      >
        <Box component={Link} to="/" sx={{ color: 'inherit', fontWeight: 700, fontSize: 18, letterSpacing: '0.04em', textDecoration: 'none' }}>
          {t('app.shortName')}
        </Box>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <ScriptToggle short />
          <IconButton aria-label={t('nav.menu')} onClick={() => setMenuOpen(true)} sx={{ color: 'inherit', width: 44, height: 44 }}>
            <Iconify icon="carbon:menu" />
          </IconButton>
        </Stack>
      </Stack>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} slotProps={{ paper: { sx: { width: 260, bgcolor: NAVY.main } } }}>
        <Sidebar onNavigate={() => setMenuOpen(false)} />
      </Drawer>

      <Box component="main" sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: { md: 'auto' } }}>
        {children}
      </Box>
    </Box>
  );
}
