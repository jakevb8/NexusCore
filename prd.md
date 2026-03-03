Specification: Nexus-Core Enterprise SaaS
Version: 1.1.0 (as-built)

Stack: Next.js 15 (static export), NestJS, PostgreSQL/Neon (Prisma), Tailwind, TanStack Query, Firebase Authentication, Firebase Hosting.

> Note: This document reflects the actual stack decisions made during implementation.
> Original spec items that were changed are marked with [CHANGED] and the original intent is noted.

---

1. Executive Summary

Nexus-Core is a multi-tenant Resource Management System (RMS). It allows diverse organizations to manage high-value assets, track lifecycle maintenance, and report on utilization via a centralized dashboard. The primary goals are Security, Scalability, and Auditability.

---

2. System Architecture & Multi-Tenancy

Tenant Isolation: Discriminator Column Strategy — every table carries an `organizationId`. Guards enforce a WHERE clause on every query based on the authenticated user's `organizationId`.

Infrastructure:

- Backend: RESTful NestJS API with Swagger/OpenAPI at `/api/docs` (dev only).
- Frontend: Next.js 15 App Router, compiled to a fully static export (`output: 'export'`). Hosted on Firebase Hosting (Spark / free tier).
- Database: Neon serverless PostgreSQL, accessed via Prisma ORM with a PrismaClient singleton.
- Auth: Firebase Authentication (Email/Password + Google). [CHANGED from Auth0/Clerk]
- Hosting: Firebase Hosting (static) + NestJS API server (designed for Cloud Functions). [CHANGED from Vercel/AWS]

Monorepo layout (TurboRepo):

```
NexusCore/
├── apps/api/        — NestJS REST API
├── apps/web/        — Next.js 15 static frontend
├── packages/database/ — Prisma schema, client singleton, seed
└── packages/shared/   — DTOs, enums, ROLE_HIERARCHY, hasRole()
```

---

3. Database Schema (Prisma — as-built)

```prisma
model Organization {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  users     User[]
  assets    Asset[]
  invites   Invite[]
  createdAt DateTime @default(now())
}

model User {
  id             String       @id @default(uuid())
  firebaseUid    String       @unique
  email          String       @unique
  displayName    String?
  role           Role         @default(VIEWER)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  auditLogs      AuditLog[]
  createdAt      DateTime     @default(now())
}

model Asset {
  id             String      @id @default(uuid())
  name           String
  sku            String      @unique
  description    String?
  status         AssetStatus @default(AVAILABLE)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  auditLogs      AuditLog[]
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
}

model AuditLog {
  id        String   @id @default(uuid())
  action    String
  actorId   String
  changes   Json
  assetId   String?
  asset     Asset?   @relation(fields: [assetId], references: [id])
  actor     User     @relation(fields: [actorId], references: [id])
  timestamp DateTime @default(now())
}

model Invite {
  id             String    @id @default(uuid())
  email          String
  role           Role
  token          String    @unique @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  expiresAt      DateTime
  acceptedAt     DateTime?
  createdAt      DateTime  @default(now())
}

enum Role { SUPERADMIN, ORG_MANAGER, ASSET_MANAGER, VIEWER }
enum AssetStatus { AVAILABLE, IN_USE, MAINTENANCE, RETIRED }
```

Changes from original spec:

- Added `firebaseUid` and `displayName` to User.
- Added `Invite` model for token-based user onboarding.
- `EMPLOYEE` role renamed/replaced with `ASSET_MANAGER` and `VIEWER` with a full `ROLE_HIERARCHY`.

---

4. Feature Requirements (as-built)

FR-01: Identity & Access Management (IAM)

- Firebase Authentication handles JWT issuance (Email/Password + Google). [CHANGED from Auth0/Clerk]
- `FirebaseAuthGuard` verifies every request's Bearer token against Firebase Admin SDK.
- `RolesGuard` + `@Roles()` decorator enforces RBAC on each endpoint.
- ROLE_HIERARCHY (highest → lowest): SUPERADMIN > ORG_MANAGER > ASSET_MANAGER > VIEWER
- `hasRole(userRole, requiredRole)` utility exported from `@nexus-core/shared`.
- First user to register creates a new Organization and is assigned `ORG_MANAGER`.
- Subsequent users join via a 7-day invite token (emailed manually; no transactional email service).

FR-02: Asset Lifecycle Management

- Full CRUD on assets with multi-tenant `organizationId` scoping.
- Pagination, search by name/SKU, and status filtering.
- Bulk CSV import (`POST /assets/import`) parses name + SKU + status columns.
- [CHANGED] Real-time WebSocket updates removed — frontend uses TanStack Query polling/refetch on focus.

FR-03: Enterprise Audit Engine

- Every mutation (create/update/delete) calls `AuditService.log()` inline (synchronous) with before/after JSON diffs.
- [CHANGED] Redis/BullMQ background queue replaced with synchronous inline writes (no Redis dependency).
- `GET /audit` — org-scoped paginated audit log.
- `GET /audit/asset/:id` — per-asset audit history (used in the "History" drawer in the UI).

FR-04: Reporting & Analytics

- `GET /reports/org` — utilization rate + asset counts by status for the current org.
- `GET /reports/system` — system-wide stats (SUPERADMIN only).
- In-memory cache with 5-minute TTL using a `Map<string, CacheEntry>` in `ReportsService`. [CHANGED from Redis]
- Recharts bar + pie charts on the dashboard frontend.

---

5. Non-Functional Requirements

Testing:

- Minimum 80% coverage on service logic (Vitest + v8 coverage provider).
- Coverage scoped to `apps/api/src/modules/**/*.service.ts` only (excludes NestJS DI boilerplate, controllers, decorators).
- 47 unit tests across 6 service files; actual coverage ~91% statements / 96% branches.

API Standards:

- Standard JSON responses with HTTP 200/201/400/401/403/404/409.
- Helmet + express-rate-limit applied globally in `main.ts`.
- Swagger UI at `/api/docs` (dev mode only).

Security:

- Firebase JWT verification on every request (no session cookies).
- `organizationId` always sourced from the verified JWT user record, never from the request body.
- All secrets stored in GitHub Actions secrets; never committed to git.

CI/CD (GitHub Actions — `.github/workflows/ci.yml`):

1. Install dependencies (npm ci with frozen lockfile).
2. Run Vitest with coverage (must pass 80% thresholds).
3. Run Prisma migration against Neon (`prisma migrate deploy`).
4. Build Next.js static export (`next build`).
5. Deploy to Firebase Hosting (`firebase-hosting-deploy` action).

---

6. Deployment

- Frontend: Firebase Hosting (static), project `nexus-core-rms`. SPA rewrites via `firebase.json`.
- Backend: NestJS app structured for Firebase Cloud Functions deployment (not yet deployed as a function; currently run locally / on a server).
- Database: Neon serverless PostgreSQL (connection string stored in `DATABASE_URL` secret, never committed).
- [CHANGED] Original Phase 5 targeted Vercel/AWS — replaced with Firebase Hosting + Cloud Functions.

Manual one-time setup required:

- Enable Firebase Authentication at https://console.firebase.google.com/project/nexus-core-rms/authentication (click "Get started", enable Email/Password and Google providers).

---

7. Implementation Phases (completed)

Phase 1: TurboRepo scaffold + Prisma schema + Firebase Auth handshake.
Phase 2: Organization onboarding flow + invite system.
Phase 3: Asset CRUD with multi-tenant filtering + CSV bulk import.
Phase 4: Inline audit logging + in-memory cached reports + Recharts dashboard.
Phase 5: Firebase Hosting static deploy + GitHub Actions CI/CD pipeline.
