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

import { ApiError } from '../api';
import { useApprove, useReturnToApplicant } from '../queries';

// ----------------------------------------------------------------------

/** 409 and 502 are explained in plain language; the server message stays as a detail. */
function useErrorText() {
  const { t, localize } = useTranslate();
  return (e: unknown) => {
    if (!(e instanceof ApiError)) return { summary: t('error.generic'), detail: '' };
    if (e.code === 'DUPLICATE_NUMBER') return { summary: t('review.duplicate'), detail: localize(e.message) };
    if (e.status === 502) return { summary: t('review.arcgisFailed'), detail: localize(e.message) };
    return { summary: localize(e.message), detail: '' };
  };
}

export function ReviewActions({ id }: { id: number }) {
  const { t } = useTranslate();
  const errorText = useErrorText();
  const approve = useApprove(id);
  const returnMutation = useReturnToApplicant(id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonTouched, setReasonTouched] = useState(false);

  const approveError = approve.error ? errorText(approve.error) : null;
  const reasonError = reasonTouched && !reason.trim() ? t('review.reasonRequired') : '';

  return (
    <Stack spacing={2}>
      {approveError && (
        <Alert
          severity="error"
          action={
            approve.error instanceof ApiError && approve.error.status === 502 ? (
              <Button color="inherit" size="small" onClick={() => approve.mutate()}>
                {t('review.approve')}
              </Button>
            ) : undefined
          }
        >
          {approveError.summary}
          {approveError.detail && <div style={{ opacity: 0.72, marginTop: 4 }}>{approveError.detail}</div>}
        </Alert>
      )}

      <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          color="warning"
          disabled={approve.isPending}
          startIcon={<Iconify icon="solar:close-circle-bold" />}
          onClick={() => setDialogOpen(true)}
        >
          {t('review.return')}
        </Button>
        <Button
          variant="contained"
          color="success"
          loading={approve.isPending}
          startIcon={<Iconify icon="solar:check-circle-bold" />}
          onClick={() =>
            approve.mutate(undefined, {
              onSuccess: (r) => toast.success(t('review.approved', { number: r.registrationNumber })),
            })
          }
        >
          {t('review.approve')}
        </Button>
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('review.return')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            sx={{ mt: 1 }}
            label={t('review.reason')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setReasonTouched(true)}
            error={!!reasonError}
            helperText={reasonError}
          />
          {returnMutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorText(returnMutation.error).summary}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDialogOpen(false)}>
            {t('review.cancel')}
          </Button>
          <Button
            variant="contained"
            color="warning"
            loading={returnMutation.isPending}
            onClick={() => {
              setReasonTouched(true);
              if (!reason.trim()) return;
              returnMutation.mutate(reason.trim(), {
                onSuccess: () => {
                  setDialogOpen(false);
                  toast.success(t('review.returned'));
                },
              });
            }}
          >
            {t('review.return')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
