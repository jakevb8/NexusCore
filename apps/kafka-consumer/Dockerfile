# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests for layer caching
COPY package.json ./

RUN npm install

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

# Copy compiled bundle
COPY --from=builder /app/dist ./dist

CMD ["node", "dist/main"]
