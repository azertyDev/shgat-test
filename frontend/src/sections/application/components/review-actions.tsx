import { useState } from 'react';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import { useTranslate } from 'src/locales';

import { toast } from 'src/components/snackbar';

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
  const [reason, setReason] = useState('');
  // the reason is only required for returning, so it is checked when "Qaytarish" is pressed
  const [returnTried, setReturnTried] = useState(false);

  const approveError = approve.error ? errorText(approve.error) : null;
  const reasonError = returnTried && !reason.trim() ? t('review.reasonRequired') : '';
  const busy = approve.isPending || returnMutation.isPending;

  return (
    <Stack spacing={1.5}>
      {approveError && (
        <Alert
          severity="error"
          action={
            approve.error instanceof ApiError && approve.error.status === 502 ? (
              <Button color="inherit" size="small" onClick={() => approve.mutate()}>
                {t('review.retry')}
              </Button>
            ) : undefined
          }
        >
          {approveError.summary}
          {approveError.detail && <div style={{ opacity: 0.72, marginTop: 4 }}>{approveError.detail}</div>}
        </Alert>
      )}

      <TextField
        fullWidth
        multiline
        minRows={2}
        label={t('review.reason')}
        placeholder={t('review.reasonPlaceholder')}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={!!reasonError}
        helperText={reasonError || t('review.reasonHint')}
      />
      {returnMutation.error && <Alert severity="error">{errorText(returnMutation.error).summary}</Alert>}

      <Stack direction="row" spacing={1.25}>
        <Button
          fullWidth
          variant="outlined"
          loading={returnMutation.isPending}
          disabled={busy}
          sx={{ minHeight: 44, color: '#5B3BA6', borderColor: '#B9A6E6' }}
          onClick={() => {
            setReturnTried(true);
            if (!reason.trim()) return;
            returnMutation.mutate(reason.trim(), { onSuccess: () => toast.success(t('review.returned')) });
          }}
        >
          {t('review.return')}
        </Button>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          loading={approve.isPending}
          disabled={busy}
          sx={{ minHeight: 44 }}
          onClick={() =>
            approve.mutate(undefined, {
              onSuccess: (r) => toast.success(t('review.approved', { number: r.registrationNumber })),
            })
          }
        >
          {t('review.approve')}
        </Button>
      </Stack>
    </Stack>
  );
}
