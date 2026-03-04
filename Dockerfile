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

# Build the NestJS app only (not the Cloud Functions target)
RUN npx tsc --project apps/api/tsconfig.json

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copy manifests and install production deps only
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --omit=dev

# Copy compiled output and generated Prisma client
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001

CMD ["node", "apps/api/dist/main"]
