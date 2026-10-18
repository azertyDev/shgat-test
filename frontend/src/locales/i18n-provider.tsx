import type { LangCode } from './locales-config';

import i18next from 'i18next';
import { getStorage } from 'minimal-shared/utils';
import { initReactI18next, I18nextProvider as Provider } from 'react-i18next';

import { i18nOptions, fallbackLng, storageConfig, supportedLngs } from './locales-config';

// ----------------------------------------------------------------------

const saqlangan = getStorage(storageConfig.localStorage.key) as LangCode | null;
const lng = saqlangan && supportedLngs.includes(saqlangan) ? saqlangan : fallbackLng;

i18next.use(initReactI18next).init(i18nOptions(lng));

// ----------------------------------------------------------------------

type I18nProviderProps = {
  children: React.ReactNode;
};

export function I18nProvider({ children }: I18nProviderProps) {
  return <Provider i18n={i18next}>{children}</Provider>;
}
