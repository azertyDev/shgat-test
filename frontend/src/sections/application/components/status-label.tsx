import type { ApplicationStatus } from '../types';

import Box from '@mui/material/Box';

import { useTranslate } from 'src/locales';

import { STATUS_STYLE } from '../styles';

// ----------------------------------------------------------------------

export function StatusLabel({ status }: { status: ApplicationStatus }) {
  const { t } = useTranslate();
  const { bg, fg } = STATUS_STYLE[status];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: 24,
        px: 1.125,
        borderRadius: 3,
        bgcolor: bg,
        color: fg,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        '&::before': { content: '""', width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor' },
      }}
    >
      {t(`status.${status}`)}
    </Box>
  );
}
