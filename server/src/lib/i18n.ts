import i18n from 'i18next';

// Shared locales (bundled at compile time via JSON import)
import zhHansCommon from '../../../shared/locales/zh-Hans/common.json';
import zhHansTrust from '../../../shared/locales/zh-Hans/trust.json';
import zhHansTime from '../../../shared/locales/zh-Hans/time.json';
import zhHantCommon from '../../../shared/locales/zh-Hant/common.json';
import zhHantTrust from '../../../shared/locales/zh-Hant/trust.json';
import zhHantTime from '../../../shared/locales/zh-Hant/time.json';
import enCommon from '../../../shared/locales/en/common.json';
import enTrust from '../../../shared/locales/en/trust.json';
import enTime from '../../../shared/locales/en/time.json';

// Server-specific locales
import zhHansServer from '../locales/zh-Hans/server.json';
import zhHantServer from '../locales/zh-Hant/server.json';
import enServer from '../locales/en/server.json';

const resources = {
  'zh-Hans': {
    common: zhHansCommon,
    trust: zhHansTrust,
    time: zhHansTime,
    server: zhHansServer,
  },
  'zh-Hant': {
    common: zhHantCommon,
    trust: zhHantTrust,
    time: zhHantTime,
    server: zhHantServer,
  },
  en: {
    common: enCommon,
    trust: enTrust,
    time: enTime,
    server: enServer,
  },
};

i18n.init({
  resources,
  fallbackLng: { 'zh-Hant': ['zh-Hans'], default: ['zh-Hans'] },
  defaultNS: 'common',
  ns: ['common', 'trust', 'time', 'server'],
  interpolation: { escapeValue: false },
});

/** Get a t() function for a specific language */
export function getT(lang: string) {
  const resolved =
    lang.startsWith('zh-Hant') || lang.startsWith('zh-TW') || lang.startsWith('zh-HK')
      ? 'zh-Hant'
      : lang.startsWith('zh')
        ? 'zh-Hans'
        : lang.startsWith('en')
          ? 'en'
          : 'zh-Hans';
  return i18n.getFixedT(resolved);
}

/** Detect language from Express request */
export function detectLanguage(req: {
  query?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
}): string {
  const queryLang = req.query?.lang as string | undefined;
  if (queryLang && ['zh-Hans', 'zh-Hant', 'en'].includes(queryLang)) return queryLang;

  const raw = req.headers?.['accept-language'];
  const accept = Array.isArray(raw) ? raw[0] ?? '' : raw ?? '';
  if (accept.includes('zh-TW') || accept.includes('zh-Hant') || accept.includes('zh-HK'))
    return 'zh-Hant';
  if (accept.includes('en')) return 'en';
  return 'zh-Hans';
}

export default i18n;
