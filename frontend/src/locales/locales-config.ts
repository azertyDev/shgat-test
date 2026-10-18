import type { InitOptions } from 'i18next';

import { lugatniOgir } from './kirill';
import { uzLatn } from './langs/uz-latn';

// ----------------------------------------------------------------------

export const supportedLngs = ['uz-Latn', 'uz-Cyrl'] as const;
export type LangCode = (typeof supportedLngs)[number];

export const fallbackLng: LangCode = 'uz-Latn';
export const defaultNS = 'common';

export const storageConfig = {
  localStorage: { key: 'i18nextLng' },
} as const;

// ----------------------------------------------------------------------

export type LangOption = {
  value: LangCode;
  label: string;
  numberFormat: { code: string; currency: string };
};

export const allLangs: LangOption[] = [
  { value: 'uz-Latn', label: 'Lotin', numberFormat: { code: 'uz-Latn-UZ', currency: 'UZS' } },
  { value: 'uz-Cyrl', label: 'Кирилл', numberFormat: { code: 'uz-Cyrl-UZ', currency: 'UZS' } },
];

export const resources = {
  'uz-Latn': { [defaultNS]: uzLatn },
  'uz-Cyrl': { [defaultNS]: lugatniOgir(uzLatn) },
};

export function i18nOptions(lang: LangCode = fallbackLng): InitOptions {
  return {
    resources,
    supportedLngs,
    fallbackLng,
    lng: lang,
    defaultNS,
    ns: [defaultNS],
    interpolation: { escapeValue: false },
  };
}

export function getCurrentLang(lang?: string): LangOption {
  return allLangs.find((l) => l.value === lang) ?? allLangs[0];
}
