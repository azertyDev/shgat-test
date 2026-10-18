import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { useTranslate } from 'src/locales';

import { toast } from 'src/components/snackbar';

import { api } from '../api';
import { applicationKeys, applicationQuery } from '../queries';
import { ApplicationForm } from '../components/application-form';

// ----------------------------------------------------------------------

export function ApplicationEditView({ id }: { id: number }) {
  const { t, localize } = useTranslate();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: application, isPending, error } = useQuery(applicationQuery(id));

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3 }}>
        {t('form.editTitle')} #{id}
      </Typography>

      {isPending && <LinearProgress />}
      {error && <Alert severity="error">{localize(error.message)}</Alert>}
      {application && application.status !== 'RETURNED' && (
        <Alert severity="info">{t('details.onlyReturnedEditable')}</Alert>
      )}
      {application?.returnReason && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>{t('details.returnReason')}:</strong> {application.returnReason}
        </Alert>
      )}
      {application?.status === 'RETURNED' && (
        <ApplicationForm
          application={application}
          submit={(values, onProgress) => api.resubmit(id, values, onProgress)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: applicationKeys.all });
            toast.success(t('form.submitted'));
            navigate({ to: '/applications/$id', params: { id: String(id) } });
          }}
        />
      )}
    </Container>
  );
}
