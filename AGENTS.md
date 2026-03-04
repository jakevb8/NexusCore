# NexusCore — Agent Instructions

## Project Overview

Multi-tenant Resource Management SaaS (NexusCore). TurboRepo monorepo with a Next.js 15 static frontend and NestJS REST API, backed by Neon PostgreSQL via Prisma, Firebase Auth, and deployed to Firebase Hosting + Cloud Functions.

## Monorepo Structure

```
NexusCore/
├── apps/api/          — NestJS REST API (Firebase Cloud Functions target)
├── apps/web/          — Next.js 15 static export (Firebase Hosting)
├── packages/database/ — Prisma schema, PrismaClient singleton, seed script
└── packages/shared/   — DTOs, enums, ROLE_HIERARCHY, hasRole()
```

## Key Commands

```bash
# Root (TurboRepo)
npm run dev            # run all apps in parallel
npm run build          # build all apps
npm run test           # run all tests
npm run type-check     # typecheck all packages
npm run format         # prettier format everything

# API only
cd apps/api
npm run dev            # nest start --watch
npm run build          # nest build → dist/
npm run test           # vitest run
npm run test:coverage  # vitest run --coverage (must pass 80% threshold)
npm run type-check     # tsc --noEmit

# Web only
cd apps/web
npm run dev            # next dev
npm run build          # next build (static export to out/)

# Database
npx prisma generate --schema=packages/database/prisma/schema.prisma
npx prisma migrate dev --schema=packages/database/prisma/schema.prisma
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
npx prisma studio --schema=packages/database/prisma/schema.prisma
```

## Architecture Decisions

- **Auth**: Firebase Authentication only (Email/Password + Google). The NestJS `FirebaseAuthGuard` is registered as a global `APP_GUARD` — every route is protected unless decorated with `@Public()`.
- **Multi-tenancy**: Discriminator column — every query is scoped by `organizationId` sourced from the verified JWT user, never from the request body.
- **RBAC**: `SUPERADMIN > ORG_MANAGER > ASSET_MANAGER > VIEWER`. Use `@Roles(Role.X)` + `hasRole()` from `@nexus-core/shared`.
- **No Redis**: Audit logs are written synchronously inline. Reports use an in-memory `Map` cache with 5-min TTL.
- **No WebSockets**: Frontend uses TanStack Query refetch-on-focus.
- **Static frontend**: Next.js `output: 'export'`. No SSR, no API routes. All data fetching is client-side via axios (`apps/web/src/lib/api.ts`) which auto-attaches Firebase ID tokens.

## Deployment

- **Frontend**: Firebase Hosting, project `nexus-core-rms`. Deployed automatically by CI on push to `main`.
- **Backend**: Railway (free tier). Deployed via `Dockerfile` at repo root. Entry point: `apps/api/src/main.ts` → `apps/api/dist/main`.
- **Database**: Neon serverless PostgreSQL. Connection string in `DATABASE_URL` / `DATABASE_DIRECT_URL` secrets.
- **CI/CD**: `.github/workflows/ci.yml` — test → migrate → build web → deploy hosting.

## Environment Variables

### apps/web/.env.local (frontend)

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=nexus-core-rms
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_API_URL=https://us-central1-nexus-core-rms.cloudfunctions.net/api/v1
```

### apps/api/.env.local (backend / Cloud Functions env)

```
DATABASE_URL=
DATABASE_DIRECT_URL=
FIREBASE_PROJECT_ID=nexus-core-rms
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FRONTEND_URL=https://nexus-core-rms.web.app
NODE_ENV=production
```

## CORS Policy

Allowed origins are hardcoded in `apps/api/src/main.ts`:

- `http://localhost:3000` (local dev)
- `https://nexus-core-rms.web.app` (Firebase Hosting)
- `https://nexus-core-rms.firebaseapp.com` (Firebase Hosting alternate)
- `process.env.FRONTEND_URL` if set (additional override)

`enableCors()` must be called **before** `app.use(helmet())`.

## Firebase Project

- Project ID: `nexus-core-rms`
- CLI installed; authenticated via `firebase login`
- `firebase.json` controls hosting (static from `apps/web/out/`) + functions

## Testing

- Framework: Vitest + `@vitest/coverage-v8`
- Scope: `apps/api/src/modules/**/*.service.ts` only
- Threshold: 80% statements, 80% branches (enforced in CI)
- Run: `npx vitest run --config apps/api/vitest.config.ts --coverage`

## Code Conventions

- TypeScript strict mode throughout
- NestJS modules: one module per feature under `apps/api/src/modules/`
- DTOs live in `packages/shared/src/` and are imported as `@nexus-core/shared`
- Prisma client imported from `@nexus-core/database`
- Frontend components use Tailwind v4, sonner for toasts, react-hook-form + zod for forms
- Prettier enforced on all `.ts/.tsx/.json` files

## Common Pitfalls

- `FIREBASE_PRIVATE_KEY` in env must have literal `\n` replaced: `.replace(/\\n/g, '\n')` is done in `firebase.module.ts` already.
- Prisma schema is in `packages/database/prisma/schema.prisma`, not in `apps/api/`.
- `organizationId` must NEVER come from the request body — always from `request.user.organizationId`.
- Cloud Functions wraps the NestJS Express app via `onRequest` — do not call `app.listen()` in the functions entry point.
- After completing any task that modifies files, always commit and push to the current branch without asking for confirmation.
- Re-run `npx prisma generate --schema=packages/database/prisma/schema.prisma` whenever the Prisma schema changes to keep the generated client and compiled declaration files in sync.
