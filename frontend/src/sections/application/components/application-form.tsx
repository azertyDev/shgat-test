import type { Application } from '../types';
import type { ApplicationFormValues } from '../form-schema';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import useMediaQuery from '@mui/material/useMediaQuery';
import LinearProgress from '@mui/material/LinearProgress';

import { useTranslate } from 'src/locales';

import { ApiError } from '../api';
import { MONO_FONT } from '../styles';
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
  /** title, back link and notes shown above the fields */
  header?: React.ReactNode;
  onCancel?: () => void;
};

/** Standard Schema errors are objects, server errors are strings. */
const firstError = (errors: unknown[]) => {
  const e = errors.find(Boolean) as string | { message?: string } | undefined;
  return typeof e === 'string' ? e : e?.message;
};

export function ApplicationForm({ application, submit, onSuccess, header, onCancel }: Props) {
  const { t, localize } = useTranslate();
  const soato = useQuery(soatoQuery);
  const [progress, setProgress] = useState<number | null>(null);
  // server 422 errors; a field's error is cleared when that field changes
  const [server, setServer] = useState<{ message?: string; fields: Record<string, string> }>({ fields: {} });
  const schema = applicationFormSchema(!application);
  // wide screens: the map fills the right half; narrow ones: it sits between the fields and the files
  const mdUp = useMediaQuery((theme) => theme.breakpoints.up('md'));

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

  const boundaryField = (
    <form.Field name="boundary">
      {(field) => (
        <BoundaryEditor
          value={field.state.value}
          onChange={(g) => {
            field.handleChange(g);
            field.handleBlur();
          }}
          error={fieldError(field.state.meta, field.name)}
        />
      )}
    </form.Field>
  );

  return (
    <Box
      component="form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}
    >
      <Stack
        component="section"
        sx={{ flex: 'none', width: { md: 500, lg: 560 }, minHeight: 0, bgcolor: 'common.white', borderRight: { md: '1px solid #DDE1E7' } }}
      >
        <Box sx={{ px: 3.5, pt: 2.25, pb: 2, borderBottom: '1px solid #DDE1E7' }}>{header}</Box>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: { md: 'auto' }, px: 3.5, pb: 3.5 }}>
          <SectionTitle>{t('form.details')}</SectionTitle>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
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
                  sx={{ gridColumn: '1 / -1' }}
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
                    <MenuItem key={type} value={type} sx={{ fontFamily: MONO_FONT }}>
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
                  slotProps={{
                    input: { readOnly: true, sx: { fontFamily: MONO_FONT, fontWeight: 500, bgcolor: '#F2F4F7' } },
                    inputLabel: { shrink: true },
                  }}
                  sx={{ gridColumn: '1 / -1' }}
                />
              )}
            </form.Subscribe>
          </Box>

          {!mdUp && (
            <>
              <SectionTitle>{t('form.boundary')}</SectionTitle>
              <Box sx={{ height: 400 }}>{boundaryField}</Box>
            </>
          )}

          <SectionTitle hint={application ? t('form.fileKept') : t('form.fileHint')}>{t('form.files')}</SectionTitle>
          <Stack spacing={1.25}>
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
        </Box>

        <form.Subscribe selector={(s) => [s.isSubmitting, s.submissionAttempts, s.isValid] as const}>
          {([isSubmitting, attempts, isValid]) => (
            <Stack spacing={1.5} sx={{ px: 3.5, py: 1.75, borderTop: '1px solid #DDE1E7', bgcolor: 'common.white' }}>
              {progress !== null && (
                <Stack spacing={0.5}>
                  <LinearProgress variant="determinate" value={progress} />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {t('form.uploading', { percent: progress })}
                  </Typography>
                </Stack>
              )}
              {server.message && <Alert severity="error">{localize(server.message)}</Alert>}
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                <Typography variant="body2" sx={{ color: 'error.main' }}>
                  {attempts > 0 && !isSubmitting && !isValid ? t('form.fixErrors') : ''}
                </Typography>
                <Stack direction="row" spacing={1.25}>
                  {onCancel && (
                    <Button variant="outlined" color="inherit" onClick={onCancel}>
                      {t('form.cancel')}
                    </Button>
                  )}
                  <Button type="submit" variant="contained" color="primary" loading={isSubmitting}>
                    {application ? t('form.resubmit') : t('form.submit')}
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          )}
        </form.Subscribe>
      </Stack>

      {mdUp && (
        <Box component="section" aria-label={t('form.boundary')} sx={{ flex: 1, minWidth: 0 }}>
          {boundaryField}
        </Box>
      )}
    </Box>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'baseline', flexWrap: 'wrap', columnGap: 1.25, mt: 2.75, mb: 1.75 }}>
      <Typography component="h2" sx={{ fontSize: 16, fontWeight: 700 }}>
        {children}
      </Typography>
      {hint && (
        <Typography component="span" sx={{ fontSize: 13, color: 'text.secondary' }}>
          {hint}
        </Typography>
      )}
    </Stack>
  );
}
