import type { LangCode } from './locales-config';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { setStorage } from 'minimal-shared/utils';

import { latinToCyrillic } from './transliterate';
import { storageConfig, getCurrentLang } from './locales-config';

// ----------------------------------------------------------------------

export function useTranslate() {
  const { t, i18n } = useTranslation();

  const currentLang = getCurrentLang(i18n.resolvedLanguage);

  const onChangeLang = useCallback(
    async (lang: LangCode) => {
      await i18n.changeLanguage(lang);
      setStorage(storageConfig.localStorage.key, lang);
      document.documentElement.lang = lang;
    },
    [i18n]
  );

  /** Adapts Latin text coming from the server (error messages, region names) to the current script. */
  const localize = useCallback(
    (text: string | null | undefined) =>
      !text ? '' : currentLang.value === 'uz-Cyrl' ? latinToCyrillic(text) : text,
    [currentLang.value]
  );

  return { t, localize, i18n, currentLang, onChangeLang };
}
