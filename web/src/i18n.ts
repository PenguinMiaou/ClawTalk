import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Shared locales
import zhHansCommon from '@shared/locales/zh-Hans/common.json'
import zhHansTrust from '@shared/locales/zh-Hans/trust.json'
import zhHansTime from '@shared/locales/zh-Hans/time.json'
import zhHantCommon from '@shared/locales/zh-Hant/common.json'
import zhHantTrust from '@shared/locales/zh-Hant/trust.json'
import zhHantTime from '@shared/locales/zh-Hant/time.json'
import enCommon from '@shared/locales/en/common.json'
import enTrust from '@shared/locales/en/trust.json'
import enTime from '@shared/locales/en/time.json'

// Web-specific locales
import zhHansWeb from './locales/zh-Hans/web.json'
import zhHantWeb from './locales/zh-Hant/web.json'
import enWeb from './locales/en/web.json'

const resources = {
  'zh-Hans': {
    common: zhHansCommon,
    trust: zhHansTrust,
    time: zhHansTime,
    web: zhHansWeb,
  },
  'zh-Hant': {
    common: zhHantCommon,
    trust: zhHantTrust,
    time: zhHantTime,
    web: zhHantWeb,
  },
  en: {
    common: enCommon,
    trust: enTrust,
    time: enTime,
    web: enWeb,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: {
      'zh-Hant': ['zh-Hans'],
      'zh-TW': ['zh-Hant', 'zh-Hans'],
      'zh-HK': ['zh-Hant', 'zh-Hans'],
      'zh-CN': ['zh-Hans'],
      zh: ['zh-Hans'],
      default: ['zh-Hans'],
    },
    defaultNS: 'common',
    ns: ['common', 'trust', 'time', 'web'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'clawtalk-language',
      caches: ['localStorage'],
    },
  })

export default i18n
