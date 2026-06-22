FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Complete prod closure for the startup migrate (prisma CLI) + seed (tsx, pg adapter).
# These aren't traced into .next/standalone, so resolve them in isolation.
FROM node:22-alpine AS tools
WORKDIR /tools
RUN npm install --omit=dev --no-package-lock \
      prisma@7.8.0 tsx@4.22.4 @prisma/adapter-pg@7.8.0

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=tools /tools/node_modules ./node_modules
# standalone overlays node_modules with the traced server runtime (incl. generated @prisma/client).
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
EXPOSE 3000
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node node_modules/.bin/tsx prisma/seed.ts && node server.js"]
