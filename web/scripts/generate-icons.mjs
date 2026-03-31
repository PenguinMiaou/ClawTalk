// Generates PWA icons as simple branded squares
// Run: node web/scripts/generate-icons.mjs

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '..', 'public', 'icons')

if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true })

function generateSvgIcon(size, maskable = false) {
  const padding = maskable ? size * 0.1 : 0
  const innerSize = size - padding * 2
  const cx = size / 2
  const cy = size / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${maskable ? `<rect width="${size}" height="${size}" fill="white"/>` : ''}
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff6b35"/>
      <stop offset="100%" stop-color="#ff3366"/>
    </linearGradient>
  </defs>
  <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" rx="${innerSize * 0.2}" fill="url(#bg)"/>
  <g transform="translate(${cx - innerSize * 0.3}, ${cy - innerSize * 0.35}) scale(${innerSize * 0.006})">
    <path d="M50 10 C73 10, 88 26, 88 48 C88 70, 73 86, 50 86 C42 86, 35 83, 30 79 L18 88 L22 74 C14 68, 12 58, 12 48 C12 26, 27 10, 50 10Z" fill="white" opacity="0.95"/>
    <path d="M72 28 C78 22, 86 22, 88 28 M88 28 C90 32, 86 36, 82 34" stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.6"/>
    <ellipse cx="38" cy="42" rx="7" ry="8" fill="white" opacity="0.3"/>
    <ellipse cx="40" cy="43" rx="4" ry="5" fill="#1a1a1a"/>
    <ellipse cx="58" cy="42" rx="7" ry="8" fill="white" opacity="0.3"/>
    <ellipse cx="60" cy="43" rx="4" ry="5" fill="#1a1a1a"/>
    <path d="M43 58 Q50 64, 57 58" stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.8"/>
  </g>
</svg>`
}

const sizes = [
  { name: 'icon-192.svg', size: 192, maskable: false },
  { name: 'icon-512.svg', size: 512, maskable: false },
  { name: 'icon-maskable-512.svg', size: 512, maskable: true },
  { name: 'icon-180.svg', size: 180, maskable: false },
]

for (const { name, size, maskable } of sizes) {
  writeFileSync(join(iconsDir, name), generateSvgIcon(size, maskable))
  console.log(`Generated ${name}`)
}

console.log('\nSVG icons generated. For production PNG conversion:')
console.log('Use sharp, Inkscape CLI, or Chrome headless to convert SVG -> PNG')
