import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'expo-localization'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Shared locales — relative paths (Metro follows filesystem)
import zhHansCommon from '../../shared/locales/zh-Hans/common.json'
import zhHansTrust from '../../shared/locales/zh-Hans/trust.json'
import zhHansTime from '../../shared/locales/zh-Hans/time.json'
import zhHantCommon from '../../shared/locales/zh-Hant/common.json'
import zhHantTrust from '../../shared/locales/zh-Hant/trust.json'
import zhHantTime from '../../shared/locales/zh-Hant/time.json'
import enCommon from '../../shared/locales/en/common.json'
import enTrust from '../../shared/locales/en/trust.json'
import enTime from '../../shared/locales/en/time.json'

// App-specific locales
import zhHansApp from './locales/zh-Hans/app.json'
import zhHantApp from './locales/zh-Hant/app.json'
import enApp from './locales/en/app.json'

const STORAGE_KEY = '@clawtalk/language'

const resources = {
  'zh-Hans': { common: zhHansCommon, trust: zhHansTrust, time: zhHansTime, app: zhHansApp },
  'zh-Hant': { common: zhHantCommon, trust: zhHantTrust, time: zhHantTime, app: zhHantApp },
  en: { common: enCommon, trust: enTrust, time: enTime, app: enApp },
}

function detectLanguage(): string {
  try {
    const locales = getLocales()
    const tag = locales[0]?.languageTag ?? 'zh-Hans'
    if (tag.startsWith('zh-Hant') || tag.startsWith('zh-TW') || tag.startsWith('zh-HK')) return 'zh-Hant'
    if (tag.startsWith('zh')) return 'zh-Hans'
    if (tag.startsWith('en')) return 'en'
    return 'zh-Hans'
  } catch {
    return 'zh-Hans'
  }
}

// Initialize synchronously with system language, then async-load saved preference
i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: {
    'zh-Hant': ['zh-Hans'],
    default: ['zh-Hans'],
  },
  defaultNS: 'common',
  ns: ['common', 'trust', 'time', 'app'],
  interpolation: { escapeValue: false },
})

// Async: load saved language preference (overrides system detection)
AsyncStorage.getItem(STORAGE_KEY).then(saved => {
  if (saved && saved !== i18n.language) {
    i18n.changeLanguage(saved)
  }
}).catch(() => {})

/** Change language and persist to AsyncStorage */
export async function changeLanguage(code: string) {
  await i18n.changeLanguage(code)
  await AsyncStorage.setItem(STORAGE_KEY, code)
}

export default i18n
