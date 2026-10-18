import { useState } from 'react';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { useTranslate } from 'src/locales';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { ApiXato } from '../api';
import { useQaytarish, useTasdiqlash } from '../queries';

// ----------------------------------------------------------------------

/** 409 va 502 — tekshiruvchi uchun oddiy tilda; server xabari tafsilot sifatida qoladi. */
function useXatoMatni() {
  const { t, tr } = useTranslate();
  return (e: unknown) => {
    if (!(e instanceof ApiXato)) return { asosiy: t('xato.umumiy'), tafsilot: '' };
    if (e.status === 409 && /ID raqami/.test(e.message)) return { asosiy: t('tekshiruv.takror'), tafsilot: tr(e.message) };
    if (e.status === 502) return { asosiy: t('tekshiruv.arcgis'), tafsilot: tr(e.message) };
    return { asosiy: tr(e.message), tafsilot: '' };
  };
}

export function TekshiruvAmallari({ id }: { id: number }) {
  const { t } = useTranslate();
  const xatoMatni = useXatoMatni();
  const tasdiq = useTasdiqlash(id);
  const qaytar = useQaytarish(id);
  const [dialog, setDialog] = useState(false);
  const [sabab, setSabab] = useState('');
  const [sababTegildi, setSababTegildi] = useState(false);

  const tasdiqXato = tasdiq.error ? xatoMatni(tasdiq.error) : null;
  const sababXato = sababTegildi && !sabab.trim() ? t('tekshiruv.sababMajburiy') : '';

  return (
    <Stack spacing={2}>
      {tasdiqXato && (
        <Alert
          severity="error"
          action={
            tasdiq.error instanceof ApiXato && tasdiq.error.status === 502 ? (
              <Button color="inherit" size="small" onClick={() => tasdiq.mutate()}>
                {t('tekshiruv.tasdiqlash')}
              </Button>
            ) : undefined
          }
        >
          {tasdiqXato.asosiy}
          {tasdiqXato.tafsilot && <div style={{ opacity: 0.72, marginTop: 4 }}>{tasdiqXato.tafsilot}</div>}
        </Alert>
      )}

      <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          color="warning"
          disabled={tasdiq.isPending}
          startIcon={<Iconify icon="solar:close-circle-bold" />}
          onClick={() => setDialog(true)}
        >
          {t('tekshiruv.qaytarish')}
        </Button>
        <Button
          variant="contained"
          color="success"
          loading={tasdiq.isPending}
          startIcon={<Iconify icon="solar:check-circle-bold" />}
          onClick={() =>
            tasdiq.mutate(undefined, {
              onSuccess: (r) => toast.success(t('tekshiruv.tasdiqlandi', { id: r.id_raqam })),
            })
          }
        >
          {t('tekshiruv.tasdiqlash')}
        </Button>
      </Stack>

      <Dialog open={dialog} onClose={() => setDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('tekshiruv.qaytarish')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            sx={{ mt: 1 }}
            label={t('tekshiruv.sabab')}
            value={sabab}
            onChange={(e) => setSabab(e.target.value)}
            onBlur={() => setSababTegildi(true)}
            error={!!sababXato}
            helperText={sababXato}
          />
          {qaytar.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {xatoMatni(qaytar.error).asosiy}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDialog(false)}>
            {t('tekshiruv.bekor')}
          </Button>
          <Button
            variant="contained"
            color="warning"
            loading={qaytar.isPending}
            onClick={() => {
              setSababTegildi(true);
              if (!sabab.trim()) return;
              qaytar.mutate(sabab.trim(), {
                onSuccess: () => {
                  setDialog(false);
                  toast.success(t('tekshiruv.qaytarildi'));
                },
              });
            }}
          >
            {t('tekshiruv.qaytarish')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
