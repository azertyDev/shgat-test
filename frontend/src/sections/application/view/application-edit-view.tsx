import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { useTranslate } from 'src/locales';

import { toast } from 'src/components/snackbar';

import { api } from '../api';
import { arizaKeys, arizaQuery } from '../queries';
import { ArizaForm } from '../components/application-form';

// ----------------------------------------------------------------------

export function ArizaEditView({ id }: { id: number }) {
  const { t, tr } = useTranslate();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: ariza, isPending, error } = useQuery(arizaQuery(id));

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3 }}>
        {t('forma.tahrir')} #{id}
      </Typography>

      {isPending && <LinearProgress />}
      {error && <Alert severity="error">{tr(error.message)}</Alert>}
      {ariza && ariza.holat !== 'qaytarilgan' && (
        <Alert severity="info">{tr('Faqat qaytarilgan arizani tuzatib qayta yuborish mumkin')}</Alert>
      )}
      {ariza?.qaytarish_sababi && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>{t('batafsil.qaytarishSababi')}:</strong> {ariza.qaytarish_sababi}
        </Alert>
      )}
      {ariza?.holat === 'qaytarilgan' && (
        <ArizaForm
          ariza={ariza}
          onYuborish={(data, onProgress) => api.tuzat(id, data, onProgress)}
          onMuvaffaqiyat={() => {
            qc.invalidateQueries({ queryKey: arizaKeys.all });
            toast.success(t('forma.yuborildi'));
            navigate({ to: '/applications/$id', params: { id: String(id) } });
          }}
        />
      )}
    </Container>
  );
}
