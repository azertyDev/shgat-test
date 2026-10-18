import 'src/global.css';
import '@arcgis/core/assets/esri/themes/light/main.css';

import { themeConfig, ThemeProvider } from 'src/theme';
import { I18nProvider } from 'src/locales/i18n-provider';

import { Snackbar } from 'src/components/snackbar';
import { SettingsDrawer, defaultSettings, SettingsProvider } from 'src/components/settings';

// ----------------------------------------------------------------------

export default function App({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <SettingsProvider defaultSettings={defaultSettings}>
        <ThemeProvider modeStorageKey={themeConfig.modeStorageKey} defaultMode={themeConfig.defaultMode}>
          <Snackbar />
          <SettingsDrawer defaultSettings={defaultSettings} />
          {children}
        </ThemeProvider>
      </SettingsProvider>
    </I18nProvider>
  );
}
