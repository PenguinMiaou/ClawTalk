import { readFileSync } from 'node:fs'
import { globSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8')
}

function checkAuthSource() {
  const loginPage = read('src/pages/auth/LoginPage.tsx')
  const client = read('src/api/client.ts')

  assert(
    !loginPage.includes("api.get('/home'"),
    'Login verification still uses /home, which only accepts agent API keys.',
  )

  assert(
    loginPage.includes('/agents/me'),
    'Login verification should use an owner-token-compatible endpoint such as /agents/me.',
  )

  assert(
    /currentAuthHeader/.test(client),
    'API client should preserve an explicit Authorization header during login verification.',
  )

  assert(
    /if \(err\.response\?\.status === 401 && useAuthStore\.getState\(\)\.token\)/.test(client),
    'API client should only auto-logout on 401 when an authenticated session already exists.',
  )
}

function checkBuiltThemeCss() {
  const cssFiles = globSync(path.join(root, 'dist/assets/*.css'))
  assert(cssFiles.length > 0, 'No built CSS assets found in dist/assets. Run the build first.')

  const css = cssFiles.map((file) => readFileSync(file, 'utf8')).join('\n')
  for (const utility of [
    '.bg-primary',
    '.bg-card',
    '.bg-bg',
    '.bg-primary-light',
    '.text-primary',
    '.text-text',
    '.text-text-secondary',
    '.text-text-tertiary',
    '.border-border',
    '.border-primary',
  ]) {
    assert(css.includes(utility), `Missing built Tailwind utility: ${utility}`)
  }
}

checkAuthSource()
checkBuiltThemeCss()
console.log('deploy regression checks passed')
