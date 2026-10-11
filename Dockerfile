# =============================================================================
# Surfing Online ISP — Main Website (Next.js 16)
# Multi-stage Dockerfile with standalone output
# =============================================================================

# ---------- Stage 1: Install dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app

# Install bun for dependency resolution (lockfile is bun-based)
RUN npm install -g bun

# Copy package files and lockfile
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install

# ---------- Stage 2: Build the application ----------
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g bun

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set the DATABASE_URL for build time (Prisma generate needs it)
ENV DATABASE_URL="file:/app/db/custom.db"

# NEXT_PUBLIC_* values are baked into the build (canonical URLs, sitemap, structured
# data), so the real public address must be known HERE, not only at runtime.
ARG NEXT_PUBLIC_SITE_URL=http://localhost
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

# Generate Prisma client
RUN bunx prisma generate

# Create a throwaway build-time DB so pages that query Prisma can prerender
RUN mkdir -p /app/db && bunx prisma db push --accept-data-loss

# Build Next.js (standalone output)
RUN bun run build

# ---------- Stage 3: Production runner ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/db/custom.db"
ENV NEXT_PUBLIC_SITE_URL="http://localhost"
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create db directory for SQLite
RUN mkdir -p /app/db

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma files for runtime queries
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Prisma CLI (pinned to the generated client's version) for `db push` at start,
# installed in its own directory so it brings its full dependency tree
RUN npm install --prefix /opt/prisma --no-audit --no-fund prisma@6.19.3

# Copy the entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

# Entrypoint: push schema + seed, then start server
ENTRYPOINT ["/app/docker-entrypoint.sh"]
