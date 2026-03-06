# NexusCoreJS — Agent Instructions

## Project Overview

NexusCoreJS is the JavaScript/TypeScript implementation of the NexusCore multi-tenant Resource Management SaaS. TurboRepo monorepo with a Next.js 15 static frontend and NestJS REST API, backed by Neon PostgreSQL via Prisma, Firebase Auth, and deployed to Firebase Hosting + Railway.

**Sister repo:** `NexusCoreDotNet` at `/Users/jake/projects/NexusCoreDotNet` (GitHub: `jakevb8/NexusCoreDotNet`) — an ASP.NET Core 8 Razor Pages implementation of the same feature set, sharing the same Neon PostgreSQL database via Entity Framework Core.

## Cross-Repo Feature Parity

Both repos implement **exactly the same product features**. When a feature is added, changed, or removed in one repo, the equivalent change MUST be made in the other repo in the same session. This includes:

- API endpoints (routes, request/response shapes, validation rules, error codes)
- Business logic (e.g. trial limits, auto-approval thresholds, RBAC rules)
- UI behaviour (e.g. form fields, table columns, modal flows, toast messages)
- Email content and sender address

**Canonical feature list** (both repos must always implement all of these):

| Feature                   | Details                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| Multi-tenancy             | All queries scoped by `organizationId` from verified JWT                                             |
| RBAC                      | `SUPERADMIN > ORG_MANAGER > ASSET_MANAGER > VIEWER`                                                  |
| Auto org approval         | Auto-approve if daily approvals < 5 AND total active orgs < 50                                       |
| Asset CRUD                | Create/read/update/delete with status: `AVAILABLE / IN_USE / MAINTENANCE / RETIRED`                  |
| Asset trial limit         | 100 assets per org; enforced on create and CSV import                                                |
| Asset CSV import          | Bulk import; stops at trial limit; returns `{ created, skipped, limitReached, errors }`              |
| Asset CSV sample download | Download a sample CSV template                                                                       |
| Audit log                 | Every mutation logged synchronously with before/after snapshot                                       |
| Reports/analytics         | Utilization rate + asset-by-status breakdown, 5-min in-memory cache                                  |
| Team invites              | ORG_MANAGER invites by email (Resend, sender `onboarding@resend.dev`); 7-day TTL; copy-link fallback |
| Remove members            | ORG_MANAGER can remove members; blocks self-removal and SUPERADMIN removal                           |
| Role management           | ORG_MANAGER can change member roles; cannot assign SUPERADMIN                                        |
| Rate limiting             | 300 req/15 min global; 5 req/hour on registration                                                    |

**When working in this repo (NexusCoreJS):** After completing any feature change, note what the equivalent change would be in NexusCoreDotNet and implement it there too (open the NexusCoreDotNet project, make the corresponding change, commit, and push). If you cannot determine the equivalent .NET implementation, state clearly what was changed here and what needs to change in NexusCoreDotNet so the user can action it.

**When working in NexusCoreDotNet:** Same rule applies in reverse — propagate to NexusCoreJS.

## Monorepo Structure

```
NexusCore/
├── apps/api/          — NestJS REST API (deployed to Railway)
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
npm run build          # prisma generate + nest build → dist/main.js
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

- **Auth**: Firebase Authentication — **Google sign-in only**. Email/Password is not enabled. Both Firebase accounts use Google OAuth exclusively.
- **FirebaseAuthGuard**: Registered as a global `APP_GUARD` in **`AppModule`** (not in a feature module) — this is required so the `Reflector` has full metadata context and `@Public()` is respected. Routes are protected unless decorated with `@Public()`.
- **Public registration endpoints**: `POST /auth/register` and `POST /auth/accept-invite` are `@Public()` because the user has no DB record yet. They verify the Firebase token themselves inside `AuthService.verifyToken()`.
- **Multi-tenancy**: Discriminator column — every query is scoped by `organizationId` sourced from the verified JWT user, never from the request body.
- **RBAC**: `SUPERADMIN > ORG_MANAGER > ASSET_MANAGER > VIEWER`. Use `@Roles(Role.X)` + `hasRole()` from `@nexus-core/shared`.
- **No Redis**: Audit logs are written synchronously inline. Reports use an in-memory `Map` cache with 5-min TTL.
- **No WebSockets**: Frontend uses TanStack Query refetch-on-focus.
- **Static frontend**: Next.js `output: 'export'`. No SSR, no API routes. All data fetching is client-side via axios (`apps/web/src/lib/api.ts`) which auto-attaches Firebase ID tokens.

## Deployment

- **Frontend**: Firebase Hosting, project `nexus-core-rms`. Deployed automatically by CI on push to `main`.
- **Backend**: Railway (free tier). Deployed via `Dockerfile` at repo root. Webpack bundles the NestJS app into `apps/api/dist/main.js`. Public URL: `https://nexus-coreapi-production.up.railway.app`.
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
NEXT_PUBLIC_API_URL=https://nexus-coreapi-production.up.railway.app/api/v1
```

### apps/api/.env.local (backend)

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
- `firebase.json` controls hosting (static from `apps/web/out/`)
- **Google sign-in only** — do not attempt Email/Password login

## Testing

- Framework: Vitest + `@vitest/coverage-v8`
- Scope: `apps/api/src/modules/**/*.service.ts` only
- Threshold: 80% statements, 80% branches (enforced in CI)
- Run: `npx vitest run --config apps/api/vitest.config.ts --coverage`
- When service signatures change, update the corresponding `__tests__/*.spec.ts` mocks to match

## Code Conventions

- TypeScript strict mode throughout
- NestJS modules: one module per feature under `apps/api/src/modules/`
- DTOs live in `packages/shared/src/` and are imported as `@nexus-core/shared`
- Prisma client imported from `@nexus-core/database`
- Frontend components use Tailwind v4, sonner for toasts, react-hook-form + zod for forms
- Prettier enforced on all `.ts/.tsx/.json` files

## Common Pitfalls

- **`APP_GUARD` must be in `AppModule`**, not a feature module. Registering `FirebaseAuthGuard` via `APP_GUARD` inside `AuthModule` causes the `Reflector` to lose metadata context, making `@Public()` silently ignored.
- **`@Public()` endpoints that need Firebase identity** (register, accept-invite) must call `firebaseApp.auth().verifyIdToken(bearerToken)` manually inside the service. Do not rely on the guard to populate `request.user` for these routes.
- **Railway env var quoting**: When setting variables in the Railway dashboard, do NOT wrap values in quotes. Railway stores them literally, so `"nexus-core-rms"` (with quotes) is a different value than `nexus-core-rms`. This caused Firebase Admin to initialize with a project ID of `"nexus-core-rms"` and reject every token because the JWT `aud` claim was `nexus-core-rms`. The code in `firebase.module.ts` defensively strips surrounding quotes via `.replace(/^"|"$/g, '')`, but the Railway vars should be set without quotes in the first place.
- **SUPERADMIN bootstrap**: The first user to register gets `ORG_MANAGER` role and their org starts as `PENDING`. There is no UI to approve orgs or promote users until a SUPERADMIN exists. To bootstrap: run the following SQL directly in the Neon console against `neondb`: `UPDATE "Organization" SET status = 'APPROVED' WHERE id = (SELECT "organizationId" FROM "User" WHERE email = 'your@email.com'); UPDATE "User" SET role = 'SUPERADMIN' WHERE email = 'your@email.com';`
- **Railway port**: Do NOT set a `PORT` variable in Railway Variables. Railway injects `PORT` automatically to match the port shown in Settings → Networking (default 8080). Adding `PORT=3001` causes a mismatch where the app binds to 3001 but Railway routes external traffic to 8080 → 502 on every request.
- **Railway uses the Dockerfile** when `railway.json` specifies `"builder": "DOCKERFILE"`. The webpack build outputs `apps/api/dist/main.js` (flat, not `dist/apps/api/src/main.js`).
- **`nest build` (webpack) entry**: With `webpack: true` in `nest-cli.json` and the custom `webpack.config.js`, the output is a single `dist/main.js`. The start script must be `node dist/main`.
- **`@nexus-core/*` packages** must be bundled inline by webpack (not treated as externals) because they are TypeScript source files that Node cannot `require()` at runtime. See `apps/api/webpack.config.js`.
- **Prisma native binary**: `prisma generate` must run before `nest build`. It is included in the `build` script: `"build": "prisma generate --schema=... && nest build"`. The Dockerfile also runs it in the builder stage.
- **Stale Prisma LSP types**: After schema changes, run `npx prisma generate --schema=packages/database/prisma/schema.prisma` from the repo root. The LSP may show false errors — always verify with `tsc --noEmit`.
- **PostgreSQL error 55P04**: `ALTER TYPE ADD VALUE` and any `UPDATE` using the new enum value cannot be in the same transaction. Split into two migration files.
- `FIREBASE_PRIVATE_KEY` in env must have literal `\n` replaced: `.replace(/\\n/g, '\n')` is done in `firebase.module.ts` already.
- Prisma schema is in `packages/database/prisma/schema.prisma`, not in `apps/api/`.
- `organizationId` must NEVER come from the request body — always from `request.user.organizationId`.
- After completing any task that modifies files, always commit and push to the current branch without asking for confirmation.
- Re-run `npx prisma generate --schema=packages/database/prisma/schema.prisma` whenever the Prisma schema changes to keep the generated client and compiled declaration files in sync.
- **NexusCoreDotNet EF/Npgsql type mapping rules** — whenever the Prisma schema changes, the corresponding EF mappings in NexusCoreDotNet's `AppDbContext.cs` must be updated following these rules:
  - **ID columns**: Prisma `@id @default(uuid())` → PostgreSQL `text` column. .NET `Guid` properties require `.HasConversion<string>()` or they crash with `Reading as 'System.Guid' is not supported for fields having DataTypeName 'text'`.
  - **Native PG enum columns**: Prisma `enum` types (e.g., `Role`, `AssetStatus`, `OrgStatus`) → PostgreSQL native enum types. In `AppDbContext`, use `.HasColumnType("\"EnumName\"")` only (quoted, case-sensitive). The `MapEnum<T>()` calls in `Program.cs` register Npgsql's native type handler for reads and writes. Do NOT add `.HasConversion<string>()` — it overrides `MapEnum` and causes `column "status" is of type "AssetStatus" but expression is of type text` on every write.
  - **Json columns**: Prisma `Json` → PostgreSQL `jsonb`. Use `.HasColumnType("jsonb")` + a `HasConversion` that round-trips through raw JSON string.
  - **Column names**: Prisma uses camelCase field names which become camelCase column names (e.g., `organizationId`, `firebaseUid`, `createdAt`). Map with `.HasColumnName("organizationId")` — NOT snake_case.

When making function calls using tools that accept array or object parameters ensure those are structured using JSON. For example:

```json
[{ "color": "orange", "options": { "option_key_1": true, "option_key_2": "value" } }]
```
