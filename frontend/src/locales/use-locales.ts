import type { LangCode } from './locales-config';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { setStorage } from 'minimal-shared/utils';

import { lotindanKirillga } from './kirill';
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

  /** Serverdan kelgan (lotin) matnni joriy yozuvga moslaydi: xato xabarlari, hudud nomlari. */
  const tr = useCallback(
    (matn: string | null | undefined) =>
      !matn ? '' : currentLang.value === 'uz-Cyrl' ? lotindanKirillga(matn) : matn,
    [currentLang.value]
  );

  return { t, tr, i18n, currentLang, onChangeLang };
}
