# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests for layer caching
COPY package.json ./

RUN npm install

# Copy Prisma schema so we can generate the client
COPY prisma ./prisma

RUN npx prisma generate --schema=prisma/schema.prisma

# Copy source
COPY . .

# Build with nest build (webpack)
# Output: dist/main.js
RUN npx nest build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json ./

RUN npm install --omit=dev

# Copy Prisma schema + generated client for production
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy compiled bundle
COPY --from=builder /app/dist ./dist

CMD ["node", "dist/main"]
