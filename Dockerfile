# ==========================================
# 1. Bağımlılıklar (Deps) Aşaması
# ==========================================
FROM node:20-slim AS deps
WORKDIR /app

# Paket tanımlarını kopyala ve kurulum yap
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# ==========================================
# 2. Derleme (Builder) Aşaması
# ==========================================
FROM node:20-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build argümanları (Client-side Next.js için derleme sırasında işlenir)
ARG NEXT_PUBLIC_API_URL=https://acillazım.net
ARG NEXT_PUBLIC_API_BASE_URL=https://acillazım.net

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Next.js standalone build oluştur (BuildKit cache ile hızlandırılmış)
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ==========================================
# 3. Çalıştırma (Runner) Aşaması
# ==========================================
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 -g nodejs nextjs

# Statik ve standalone dosyaları kopyala
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
