FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY prisma ./prisma/
COPY prisma.config.ts ./
COPY tsconfig.json ./
RUN npx prisma generate

COPY dist/ ./dist/
COPY skill.md ./

RUN mkdir -p /app/uploads

EXPOSE 3002

CMD ["node", "dist/index.js"]
