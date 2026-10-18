import { useNavigate } from '@tanstack/react-router';

import Typography from '@mui/material/Typography';

import { useTranslate } from 'src/locales';

import { toast } from 'src/components/snackbar';

import { useCreateApplication } from '../queries';
import { PageHeader } from '../components/page-header';
import { ApplicationForm } from '../components/application-form';

// ----------------------------------------------------------------------

export function ApplicationCreateView() {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const create = useCreateApplication();

  return (
    <ApplicationForm
      header={
        <PageHeader title={t('form.createTitle')}>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: 'text.secondary' }}>{t('form.createHint')}</Typography>
        </PageHeader>
      }
      submit={(values, onProgress) => create.mutateAsync({ values, onProgress })}
      onCancel={() => navigate({ to: '/' })}
      onSuccess={(id) => {
        toast.success(t('form.submitted'));
        navigate({ to: '/applications/$id', params: { id: String(id) } });
      }}
    />
  );
}
