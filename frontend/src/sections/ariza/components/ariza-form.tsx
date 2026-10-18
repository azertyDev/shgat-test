import type { ArizaToliq } from '../types';
import type { ArizaFormValues } from '../schema';

import { useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import LinearProgress from '@mui/material/LinearProgress';

import { useTranslate } from 'src/locales';

import { ApiXato } from '../api';
import { soatoQuery } from '../queries';
import { FaylMaydon } from './fayl-maydon';
import { ChegaraXarita } from './chegara-xarita';
import { FAYL_TURLARI, HUJJAT_TURLARI } from '../types';
import { bugun, bolajakId, formDataga, arizaFormSchema } from '../schema';

// ----------------------------------------------------------------------

type Props = {
  /** tahrirda — qaytarilgan arizaning joriy ma'lumotlari; fayllar ixtiyoriy bo'ladi */
  ariza?: ArizaToliq;
  onYuborish: (data: FormData, onProgress: (foiz: number) => void) => Promise<{ id: number }>;
  onMuvaffaqiyat: (id: number) => void;
};

/** Standard Schema xatosi obyekt, server xatosi — matn. */
const birinchiXato = (errors: unknown[]) => {
  const e = errors.find(Boolean) as string | { message?: string } | undefined;
  return typeof e === 'string' ? e : e?.message;
};

export function ArizaForm({ ariza, onYuborish, onMuvaffaqiyat }: Props) {
  const { t, tr } = useTranslate();
  const soato = useQuery(soatoQuery);
  const [foiz, setFoiz] = useState<number | null>(null);
  const natija = useRef<{ id: number } | null>(null);
  const schema = arizaFormSchema(!ariza);

  const form = useForm({
    defaultValues: {
      hujjat_nomi: ariza?.hujjat_nomi ?? '',
      hujjat_turi: ariza?.hujjat_turi ?? '',
      soato_kodi: ariza?.soato_kodi ?? '',
      tasdiq_sanasi: ariza?.tasdiq_sanasi ?? '',
      tasdiq_hujjati: ariza?.tasdiq_hujjati ?? '',
      chegara: ariza?.chegara ?? null,
      asosiy_chizma: null,
      tushuntirish_xati: null,
      tasdiqlovchi_hujjat: null,
    } as ArizaFormValues,
    validators: {
      onChange: schema,
      onSubmit: schema,
      // server 422 qaytarsa — xatolar shu maydonlar yonida ko'rinadi
      onSubmitAsync: async ({ value }) => {
        setFoiz(0);
        try {
          natija.current = await onYuborish(formDataga(value), setFoiz);
          return null;
        } catch (e) {
          const x = e instanceof ApiXato ? e : new ApiXato(0, t('xato.umumiy'));
          return { form: x.message, fields: x.maydonlar ?? {} };
        } finally {
          setFoiz(null);
        }
      },
    },
    onSubmit: () => {
      if (natija.current) onMuvaffaqiyat(natija.current.id);
    },
  });

  const xatosi = (meta: { errors: unknown[]; isTouched: boolean }) =>
    meta.isTouched || form.state.submissionAttempts > 0 ? tr(birinchiXato(meta.errors)) : '';

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardHeader title={t('forma.asosiy')} />
            <Stack spacing={2.5} sx={{ p: 3 }}>
              <form.Field name="hujjat_nomi">
                {(field) => (
                  <TextField
                    fullWidth
                    label={t('forma.hujjat_nomi')}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    error={!!xatosi(field.state.meta)}
                    helperText={xatosi(field.state.meta)}
                    slotProps={{ htmlInput: { maxLength: 255 } }}
                  />
                )}
              </form.Field>

              <form.Field name="hujjat_turi">
                {(field) => (
                  <TextField
                    select
                    fullWidth
                    label={t('forma.hujjat_turi')}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    error={!!xatosi(field.state.meta)}
                    helperText={xatosi(field.state.meta)}
                  >
                    {HUJJAT_TURLARI.map((tur) => (
                      <MenuItem key={tur} value={tur}>
                        {tur}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </form.Field>

              <form.Field name="soato_kodi">
                {(field) => (
                  <Autocomplete
                    options={soato.data ?? []}
                    loading={soato.isPending}
                    value={soato.data?.find((s) => s.kod === field.state.value) ?? null}
                    onChange={(_, v) => field.handleChange(v?.kod ?? '')}
                    onBlur={field.handleBlur}
                    getOptionLabel={(s) => `${s.kod} — ${tr(s.nomi)}`}
                    isOptionEqualToValue={(a, b) => a.kod === b.kod}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('forma.soato_kodi')}
                        error={!!xatosi(field.state.meta) || soato.isError}
                        helperText={xatosi(field.state.meta) || (soato.isError ? tr(soato.error.message) : '')}
                      />
                    )}
                  />
                )}
              </form.Field>

              <form.Field name="tasdiq_sanasi">
                {(field) => (
                  <TextField
                    fullWidth
                    type="date"
                    label={t('forma.tasdiq_sanasi')}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    error={!!xatosi(field.state.meta)}
                    helperText={xatosi(field.state.meta)}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: bugun() } }}
                  />
                )}
              </form.Field>

              <form.Field name="tasdiq_hujjati">
                {(field) => (
                  <TextField
                    fullWidth
                    label={t('forma.tasdiq_hujjati')}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    error={!!xatosi(field.state.meta)}
                    helperText={xatosi(field.state.meta)}
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                  />
                )}
              </form.Field>

              <form.Subscribe selector={(s) => bolajakId(s.values)}>
                {(id) => (
                  <TextField
                    fullWidth
                    label={t('forma.bolajakId')}
                    value={id}
                    placeholder="БР-1703401-2026"
                    helperText={t('forma.bolajakIdIzoh')}
                    slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }}
                  />
                )}
              </form.Subscribe>
            </Stack>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardHeader title={t('forma.fayllar')} subheader={ariza ? t('forma.faylSaqlanadi') : undefined} />
            <Stack spacing={1.5} sx={{ p: 3 }}>
              {FAYL_TURLARI.map((tur) => (
                <form.Field key={tur} name={tur}>
                  {(field) => (
                    <FaylMaydon
                      label={t(`forma.fayl.${tur}`)}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={xatosi(field.state.meta)}
                      joriyNomi={ariza?.fayllar.find((f) => f.tur === tur)?.nomi}
                    />
                  )}
                </form.Field>
              ))}
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardHeader title={t('forma.chegara')} />
            <form.Field name="chegara">
              {(field) => (
                <Stack sx={{ p: 3 }}>
                  <ChegaraXarita
                    value={field.state.value}
                    onChange={(g) => {
                      field.handleChange(g);
                      field.handleBlur();
                    }}
                    error={xatosi(field.state.meta)}
                  />
                </Stack>
              )}
            </form.Field>
          </Card>

          <form.Subscribe selector={(s) => [s.errorMap.onSubmit, s.isSubmitting, s.submissionAttempts] as const}>
            {([formXato, isSubmitting, urinishlar]) => (
              <Stack spacing={2} sx={{ mt: 3 }}>
                {foiz !== null && (
                  <Stack spacing={0.5}>
                    <LinearProgress variant="determinate" value={foiz} />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {t('forma.yuklanmoqda', { foiz })}
                    </Typography>
                  </Stack>
                )}
                {typeof formXato === 'string' && formXato && <Alert severity="error">{tr(formXato)}</Alert>}
                {urinishlar > 0 && !isSubmitting && !form.state.isValid && !formXato && (
                  <Alert severity="warning">{t('forma.xatolar')}</Alert>
                )}
                <Button type="submit" size="large" variant="contained" loading={isSubmitting} sx={{ alignSelf: 'flex-end' }}>
                  {ariza ? t('forma.qaytaYuborish') : t('forma.yuborish')}
                </Button>
              </Stack>
            )}
          </form.Subscribe>
        </Grid>
      </Grid>
    </form>
  );
}
