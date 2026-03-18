# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci

# Copy source
COPY apps/api ./apps/api
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared
COPY tsconfig.base.json ./

# Generate Prisma client
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Build with nest build (webpack) from apps/api — bundles monorepo packages inline
# Output: apps/api/dist/main.js
WORKDIR /app/apps/api
RUN npx nest build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/

# Skip postinstall prisma generate during npm ci — we run it explicitly below
# after the schema is present, so the generated client is always up to date.
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=true npm ci --omit=dev

# Copy schema so prisma generate can run in the runner stage
COPY packages/database/prisma/schema.prisma ./packages/database/prisma/schema.prisma

# Generate the Prisma client against the correct Linux target (no native binary
# needed — the Neon HTTP adapter bypasses the query engine entirely).
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Copy compiled webpack bundle
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

CMD ["node", "apps/api/dist/main"]
