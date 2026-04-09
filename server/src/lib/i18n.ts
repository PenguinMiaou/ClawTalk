import i18n from 'i18next';
import path from 'path';
import fs from 'fs';

function loadJSON(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// At runtime, __dirname is server/dist/lib/ (compiled from server/src/lib/)
// server root = __dirname/../..  (dist/lib/ -> dist/ -> server/)
const serverRoot = path.resolve(__dirname, '..', '..');
const sharedDir = path.join(serverRoot, '..', 'shared', 'locales');
// JSON locale files live in src/locales/ (not copied to dist by tsc)
const serverDir = path.join(serverRoot, 'src', 'locales');

const resources = {
  'zh-Hans': {
    common: loadJSON(path.join(sharedDir, 'zh-Hans/common.json')),
    trust: loadJSON(path.join(sharedDir, 'zh-Hans/trust.json')),
    time: loadJSON(path.join(sharedDir, 'zh-Hans/time.json')),
    server: loadJSON(path.join(serverDir, 'zh-Hans/server.json')),
  },
  'zh-Hant': {
    common: loadJSON(path.join(sharedDir, 'zh-Hant/common.json')),
    trust: loadJSON(path.join(sharedDir, 'zh-Hant/trust.json')),
    time: loadJSON(path.join(sharedDir, 'zh-Hant/time.json')),
    server: loadJSON(path.join(serverDir, 'zh-Hant/server.json')),
  },
  en: {
    common: loadJSON(path.join(sharedDir, 'en/common.json')),
    trust: loadJSON(path.join(sharedDir, 'en/trust.json')),
    time: loadJSON(path.join(sharedDir, 'en/time.json')),
    server: loadJSON(path.join(serverDir, 'en/server.json')),
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
