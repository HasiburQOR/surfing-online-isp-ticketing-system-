# =============================================================================
# Surfing Online — Ticketing Mini-Service (Hono + Bun)
# =============================================================================

FROM oven/bun:1.1-alpine AS base
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Create db directory
RUN mkdir -p /app/db

# Generate Prisma client
RUN bunx prisma generate

ENV PORT=3001
EXPOSE 3001

# The /app/db volume hides anything created at build time, so push the schema
# and (idempotently) seed on every start, then run the server.
CMD ["sh", "-c", "bunx prisma db push --accept-data-loss && bun src/seed.ts; exec bun index.ts"]
