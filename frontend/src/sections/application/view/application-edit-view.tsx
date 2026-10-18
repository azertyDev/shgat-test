import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';

import { useTranslate } from 'src/locales';

import { toast } from 'src/components/snackbar';

import { api } from '../api';
import { PageHeader } from '../components/page-header';
import { applicationKeys, applicationQuery } from '../queries';
import { ApplicationForm } from '../components/application-form';

// ----------------------------------------------------------------------

export function ApplicationEditView({ id }: { id: number }) {
  const { t, localize } = useTranslate();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: application, isPending, error } = useQuery(applicationQuery(id));
  const title = `${t('form.editTitle')} #${id}`;

  if (application?.status === 'RETURNED')
    return (
      <ApplicationForm
        application={application}
        header={
          <PageHeader title={title}>
            {application.returnReason && (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                <strong>{t('details.returnReason')}:</strong> {application.returnReason}
              </Alert>
            )}
          </PageHeader>
        }
        submit={(values, onProgress) => api.resubmit(id, values, onProgress)}
        onCancel={() => navigate({ to: '/applications/$id', params: { id: String(id) } })}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: applicationKeys.all });
          toast.success(t('form.submitted'));
          navigate({ to: '/applications/$id', params: { id: String(id) } });
        }}
      />
    );

  return (
    <Box sx={{ p: 3.5 }}>
      <PageHeader title={title} />
      <Box sx={{ mt: 3 }}>
        {isPending && <LinearProgress />}
        {error && <Alert severity="error">{localize(error.message)}</Alert>}
        {application && <Alert severity="info">{t('details.onlyReturnedEditable')}</Alert>}
      </Box>
    </Box>
  );
}
