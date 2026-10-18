import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { useTranslate } from 'src/locales';

import { toast } from 'src/components/snackbar';

import { api } from '../api';
import { applicationKeys } from '../queries';
import { ApplicationForm } from '../components/application-form';

// ----------------------------------------------------------------------

export function ApplicationCreateView() {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3 }}>
        {t('form.createTitle')}
      </Typography>
      <ApplicationForm
        submit={api.create}
        onSuccess={(id) => {
          queryClient.invalidateQueries({ queryKey: applicationKeys.all });
          toast.success(t('form.submitted'));
          navigate({ to: '/applications/$id', params: { id: String(id) } });
        }}
      />
    </Container>
  );
}
