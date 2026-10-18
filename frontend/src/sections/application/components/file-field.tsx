import { useId } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import FormHelperText from '@mui/material/FormHelperText';

import { fData } from 'src/utils/format-number';

import { useTranslate } from 'src/locales';

import { Iconify } from 'src/components/iconify';
import { FileThumbnail } from 'src/components/file-thumbnail';

// ----------------------------------------------------------------------

type Props = {
  label: string;
  value: File | null;
  onChange: (f: File | null) => void;
  onBlur?: () => void;
  error?: string;
  /** tahrirda: serverdagi joriy fayl nomi */
  joriyNomi?: string;
};

export function FaylMaydon({ label, value, onChange, onBlur, error, joriyNomi }: Props) {
  const { t } = useTranslate();
  const id = useId();
  const nomi = value?.name ?? joriyNomi;

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          p: 1.5,
          alignItems: 'center',
          borderRadius: 1,
          border: (theme) => `1px dashed ${error ? theme.vars.palette.error.main : theme.vars.palette.divider}`,
        }}
      >
        {nomi ? (
          <FileThumbnail file={nomi} sx={{ width: 36, height: 36, flexShrink: 0 }} />
        ) : (
          <Iconify icon="eva:cloud-upload-fill" width={32} sx={{ color: 'text.disabled', flexShrink: 0 }} />
        )}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle2">{label}</Typography>
          <Typography variant="caption" noWrap component="div" sx={{ color: 'text.secondary' }}>
            {value ? `${value.name} · ${fData(value.size)}` : (joriyNomi ?? t('forma.faylIzoh'))}
          </Typography>
        </Box>
        <Button component="label" htmlFor={id} size="small" variant="outlined">
          {t('forma.faylTanlash')}
        </Button>
        <input
          id={id}
          hidden
          type="file"
          aria-label={label}
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={(e) => {
            onChange(e.target.files?.[0] ?? null);
            onBlur?.();
            e.target.value = '';
          }}
        />
      </Stack>
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Box>
  );
}
