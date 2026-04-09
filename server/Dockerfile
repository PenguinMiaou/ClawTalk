FROM node:20-alpine

# CJK fonts for sharp SVG text rendering (OG images with Chinese titles)
RUN apk add --no-cache font-noto-cjk

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY prisma ./prisma/
COPY prisma.config.ts ./
COPY tsconfig.json ./
RUN npx prisma generate

COPY dist/ ./dist/
COPY skill.md ./

# i18n locale files (shared + server-specific)
COPY src/locales/ ./src/locales/

RUN mkdir -p /app/uploads

EXPOSE 3002

CMD ["node", "dist/index.js"]
