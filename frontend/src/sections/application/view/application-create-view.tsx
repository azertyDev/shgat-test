import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { useTranslate } from 'src/locales';

import { toast } from 'src/components/snackbar';

import { api } from '../api';
import { arizaKeys } from '../queries';
import { ArizaForm } from '../components/application-form';

// ----------------------------------------------------------------------

export function ArizaCreateView() {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const qc = useQueryClient();

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3 }}>
        {t('forma.yangi')}
      </Typography>
      <ArizaForm
        onYuborish={api.yarat}
        onMuvaffaqiyat={(id) => {
          qc.invalidateQueries({ queryKey: arizaKeys.all });
          toast.success(t('forma.yuborildi'));
          navigate({ to: '/applications/$id', params: { id: String(id) } });
        }}
      />
    </Container>
  );
}
