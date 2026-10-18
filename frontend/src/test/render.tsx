import type { RenderOptions } from '@testing-library/react';

import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { themeConfig, ThemeProvider } from 'src/theme';
import { I18nProvider } from 'src/locales/i18n-provider';

import { defaultSettings, SettingsProvider } from 'src/components/settings';

// ----------------------------------------------------------------------

export function renderWithProviders(ui: React.ReactElement, options?: RenderOptions) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <I18nProvider>
      <SettingsProvider defaultSettings={defaultSettings}>
        <ThemeProvider modeStorageKey={themeConfig.modeStorageKey} defaultMode="light">
          <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
        </ThemeProvider>
      </SettingsProvider>
    </I18nProvider>,
    options
  );
}

export const jsonJavob = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
