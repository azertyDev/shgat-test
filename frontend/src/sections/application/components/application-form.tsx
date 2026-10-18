import type { Application } from '../types';
import type { ApplicationFormValues } from '../form-schema';

import { useState } from 'react';
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

import { ApiError } from '../api';
import { soatoQuery } from '../queries';
import { FileUploadField } from './file-field';
import { BoundaryEditor } from './boundary-editor';
import { FILE_FIELDS, DOCUMENT_TYPES } from '../types';
import { today, applicationFormSchema, futureRegistrationNumber } from '../form-schema';

// ----------------------------------------------------------------------

type Props = {
  /** edit mode: the returned application; files become optional */
  application?: Application;
  submit: (values: ApplicationFormValues, onProgress: (percent: number) => void) => Promise<{ id: number }>;
  onSuccess: (id: number) => void;
};

/** Standard Schema errors are objects, server errors are strings. */
const firstError = (errors: unknown[]) => {
  const e = errors.find(Boolean) as string | { message?: string } | undefined;
  return typeof e === 'string' ? e : e?.message;
};

export function ApplicationForm({ application, submit, onSuccess }: Props) {
  const { t, localize } = useTranslate();
  const soato = useQuery(soatoQuery);
  const [progress, setProgress] = useState<number | null>(null);
  // server 422 errors; a field's error is cleared when that field changes
  const [server, setServer] = useState<{ message?: string; fields: Record<string, string> }>({ fields: {} });
  const schema = applicationFormSchema(!application);

  const form = useForm({
    defaultValues: {
      documentName: application?.documentName ?? '',
      documentType: application?.documentType ?? '',
      soatoCode: application?.soatoCode ?? '',
      approvalDate: application?.approvalDate ?? '',
      approvalDecree: application?.approvalDecree ?? '',
      boundary: application?.boundary ?? null,
      mainDrawing: null,
      explanatoryNote: null,
      approvalDocument: null,
    } as ApplicationFormValues,
    validators: { onChange: schema, onSubmit: schema },
    listeners: {
      onChange: ({ fieldApi }) =>
        setServer((p) => (p.fields[fieldApi.name] ? { ...p, fields: { ...p.fields, [fieldApi.name]: '' } } : p)),
    },
    onSubmit: async ({ value }) => {
      setServer({ fields: {} });
      setProgress(0);
      try {
        const { id } = await submit(value, setProgress);
        onSuccess(id);
      } catch (e) {
        const error = e instanceof ApiError ? e : new ApiError(0, t('error.generic'));
        setServer({ message: error.message, fields: error.fieldErrors ?? {} });
      } finally {
        setProgress(null);
      }
    },
  });

  const fieldError = (meta: { errors: unknown[]; isTouched: boolean }, name: string) =>
    localize((meta.isTouched || form.state.submissionAttempts > 0 ? firstError(meta.errors) : '') || server.fields[name]);

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
            <CardHeader title={t('form.details')} />
            <Stack spacing={2.5} sx={{ p: 3 }}>
              <form.Field name="documentName">
                {(field) => (
                  <TextField
                    fullWidth
                    label={t('form.documentName')}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    error={!!fieldError(field.state.meta, field.name)}
                    helperText={fieldError(field.state.meta, field.name)}
                    slotProps={{ htmlInput: { maxLength: 255 } }}
                  />
                )}
              </form.Field>

              <form.Field name="documentType">
                {(field) => (
                  <TextField
                    select
                    fullWidth
                    label={t('form.documentType')}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    error={!!fieldError(field.state.meta, field.name)}
                    helperText={fieldError(field.state.meta, field.name)}
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </form.Field>

              <form.Field name="soatoCode">
                {(field) => (
                  <Autocomplete
                    options={soato.data ?? []}
                    loading={soato.isPending}
                    value={soato.data?.find((r) => r.code === field.state.value) ?? null}
                    onChange={(_, v) => field.handleChange(v?.code ?? '')}
                    onBlur={field.handleBlur}
                    getOptionLabel={(r) => `${r.code} — ${localize(r.name)}`}
                    isOptionEqualToValue={(a, b) => a.code === b.code}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('form.soatoCode')}
                        error={!!fieldError(field.state.meta, field.name) || soato.isError}
                        helperText={fieldError(field.state.meta, field.name) || (soato.isError ? localize(soato.error.message) : '')}
                      />
                    )}
                  />
                )}
              </form.Field>

              <form.Field name="approvalDate">
                {(field) => (
                  <TextField
                    fullWidth
                    type="date"
                    label={t('form.approvalDate')}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    error={!!fieldError(field.state.meta, field.name)}
                    helperText={fieldError(field.state.meta, field.name)}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }}
                  />
                )}
              </form.Field>

              <form.Field name="approvalDecree">
                {(field) => (
                  <TextField
                    fullWidth
                    label={t('form.approvalDecree')}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    error={!!fieldError(field.state.meta, field.name)}
                    helperText={fieldError(field.state.meta, field.name)}
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                  />
                )}
              </form.Field>

              <form.Subscribe selector={(s) => futureRegistrationNumber(s.values)}>
                {(number) => (
                  <TextField
                    fullWidth
                    label={t('form.futureNumber')}
                    value={number}
                    placeholder="БР-1703401-2026"
                    helperText={t('form.futureNumberHint')}
                    slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }}
                  />
                )}
              </form.Subscribe>
            </Stack>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardHeader title={t('form.files')} subheader={application ? t('form.fileKept') : undefined} />
            <Stack spacing={1.5} sx={{ p: 3 }}>
              {FILE_FIELDS.map((name) => (
                <form.Field key={name} name={name}>
                  {(field) => (
                    <FileUploadField
                      label={t(`form.file.${name}`)}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={fieldError(field.state.meta, field.name)}
                      currentName={application?.files.find((f) => f.field === name)?.name}
                    />
                  )}
                </form.Field>
              ))}
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardHeader title={t('form.boundary')} />
            <form.Field name="boundary">
              {(field) => (
                <Stack sx={{ p: 3 }}>
                  <BoundaryEditor
                    value={field.state.value}
                    onChange={(g) => {
                      field.handleChange(g);
                      field.handleBlur();
                    }}
                    error={fieldError(field.state.meta, field.name)}
                  />
                </Stack>
              )}
            </form.Field>
          </Card>

          <form.Subscribe selector={(s) => [s.isSubmitting, s.submissionAttempts, s.isValid] as const}>
            {([isSubmitting, urinishlar, isValid]) => (
              <Stack spacing={2} sx={{ mt: 3 }}>
                {progress !== null && (
                  <Stack spacing={0.5}>
                    <LinearProgress variant="determinate" value={progress} />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {t('form.uploading', { percent: progress })}
                    </Typography>
                  </Stack>
                )}
                {server.message && <Alert severity="error">{localize(server.message)}</Alert>}
                {urinishlar > 0 && !isSubmitting && !isValid && (
                  <Alert severity="warning">{t('form.fixErrors')}</Alert>
                )}
                <Button type="submit" size="large" variant="contained" loading={isSubmitting} sx={{ alignSelf: 'flex-end' }}>
                  {application ? t('form.resubmit') : t('form.submit')}
                </Button>
              </Stack>
            )}
          </form.Subscribe>
        </Grid>
      </Grid>
    </form>
  );
}
