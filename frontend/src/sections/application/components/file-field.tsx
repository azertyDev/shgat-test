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

import { MONO_FONT } from '../styles';

// ----------------------------------------------------------------------

type Props = {
  label: string;
  value: File | null;
  onChange: (f: File | null) => void;
  onBlur?: () => void;
  error?: string;
  /** edit mode: name of the file already stored on the server */
  currentName?: string;
};

export function FileUploadField({ label, value, onChange, onBlur, error, currentName }: Props) {
  const { t } = useTranslate();
  const id = useId();
  const shownName = value?.name ?? currentName;

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          p: 1.5,
          alignItems: 'center',
          borderRadius: 1,
          border: (theme) => (error ? `1.5px dashed ${theme.vars.palette.error.main}` : '1px solid #DDE1E7'),
          bgcolor: error ? '#FFF8F7' : 'transparent',
        }}
      >
        {shownName ? (
          <FileThumbnail file={shownName} sx={{ width: 36, height: 36, flexShrink: 0 }} />
        ) : (
          <Iconify icon="eva:cloud-upload-fill" width={32} sx={{ color: 'text.disabled', flexShrink: 0 }} />
        )}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle2">{label}</Typography>
          <Typography variant="caption" noWrap component="div" sx={{ color: 'text.secondary', fontFamily: value ? MONO_FONT : undefined }}>
            {value ? `${value.name} · ${fData(value.size)}` : (currentName ?? t('form.fileHint'))}
          </Typography>
        </Box>
        <Button component="label" htmlFor={id} variant="outlined" color="inherit" sx={{ minHeight: 40, flexShrink: 0 }}>
          {t('form.chooseFile')}
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
