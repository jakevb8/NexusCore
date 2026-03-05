# NexusCoreJS

Multi-tenant Resource Management SaaS. Organizations track physical or digital assets, manage team members with role-based access, and view utilization analytics — all behind Firebase Authentication and an admin-approval workflow.

> **Sister repo:** [NexusCoreDotNet](https://github.com/jakevb8/NexusCoreDotNet) — identical feature set built with ASP.NET Core 8 Razor Pages + Entity Framework Core.

**Live demo:** https://nexus-core-rms.web.app

---

## Tech Stack

| Layer    | Technology                                                                          |
| -------- | ----------------------------------------------------------------------------------- |
| Frontend | Next.js 15 (static export), Tailwind CSS v4, TanStack Query, react-hook-form + Zod  |
| Backend  | NestJS 10 (REST API), deployed to Railway                                           |
| Database | PostgreSQL on Neon (serverless), Prisma ORM                                         |
| Auth     | Firebase Authentication — **Google sign-in only**                                   |
| Hosting  | Firebase Hosting (frontend) + Railway (API)                                         |
| Monorepo | TurboRepo with shared `packages/`                                                   |
| CI/CD    | GitHub Actions — test → migrate → build → deploy on push to `main`                  |

---

## Features

- **Multi-tenancy** — every resource is scoped to an organization; `organizationId` is sourced from the verified JWT, never the request body
- **RBAC** — four-level role hierarchy: `SUPERADMIN > ORG_MANAGER > ASSET_MANAGER > VIEWER`
- **Admin approval flow** — new organizations auto-approve if daily approvals < 5 and total active orgs < 50; otherwise start as `PENDING` for manual review
- **Asset management** — full CRUD with status tracking (`AVAILABLE / IN_USE / MAINTENANCE / RETIRED`), CSV bulk-import, and a 100-asset trial limit
- **Audit log** — every mutating action is recorded synchronously with before/after diffs
- **Reports & analytics** — utilization rate and asset-by-status breakdown, with an in-memory 5-minute TTL cache
- **Team invites** — ORG_MANAGERs invite members by email (via Resend) with a scoped role; invites expire after 7 days; copy-link fallback available
- **Remove members** — ORG_MANAGERs can remove team members; self-removal and SUPERADMIN removal are blocked
- **Rate limiting** — 300 req/15 min global; 5 req/hour per IP on the registration endpoint
- **Security** — Helmet headers, CORS locked to known origins, Firebase ID token verification on every protected request

---

## Monorepo Structure

```
NexusCoreJS/
├── apps/
│   ├── api/          — NestJS REST API (deployed to Railway)
│   └── web/          — Next.js 15 static export (Firebase Hosting)
├── packages/
│   ├── database/     — Prisma schema, PrismaClient singleton
│   └── shared/       — DTOs, enums, ROLE_HIERARCHY, hasRole()
└── .github/
    └── workflows/
        └── ci.yml    — test → migrate → build → deploy
```

---

## Local Development

### Prerequisites

- Node.js 20+
- A [Firebase project](https://console.firebase.google.com) with **Google sign-in** enabled under Authentication → Sign-in method
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/jakevb8/NexusCore.git
cd NexusCore
npm install
```

### 2. Configure environment variables

**`apps/api/.env.local`**

```env
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
DATABASE_DIRECT_URL=postgresql://user:pass@host/dbname?sslmode=require
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FRONTEND_URL=http://localhost:3000
RESEND_API_KEY=re_xxxx          # optional — invite emails fall back to console log if absent
NODE_ENV=development
```

> Do **not** wrap values in quotes. The code strips surrounding quotes defensively, but it is cleaner to omit them.

**`apps/web/.env.local`**

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### 3. Set up the database

```bash
npx prisma generate --schema=packages/database/prisma/schema.prisma
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
```

### 4. Run

```bash
npm run dev   # starts API on :3001 and web on :3000 in parallel
```

### 5. Bootstrap the first SUPERADMIN

The first user to register becomes `ORG_MANAGER` of a `PENDING` organization (unless auto-approval fires). To approve the org and promote yourself to SUPERADMIN, run this SQL in your Neon console:

```sql
UPDATE "Organization"
SET status = 'ACTIVE'
WHERE id = (SELECT "organizationId" FROM "User" WHERE email = 'your@email.com');

UPDATE "User"
SET role = 'SUPERADMIN'
WHERE email = 'your@email.com';
```

---

## Testing

```bash
npm run test            # run all API unit tests
npm run test:coverage   # must pass 80% statement/branch threshold
npm run type-check      # TypeScript strict check across all packages
```

Tests live in `apps/api/src/modules/**/__tests__/` and use Vitest with a mocked PrismaClient. 71 tests, all passing.

---

## Deployment

Deployment is fully automated via GitHub Actions on push to `main`:

1. Type-check + Vitest coverage (80% threshold enforced)
2. Prisma migrations applied against production Neon database
3. Next.js static export built with injected env vars
4. Frontend deployed to Firebase Hosting

The NestJS API is hosted on **Railway** and auto-deploys from `main` via the `Dockerfile` at the repo root.

### Railway setup (one-time)

1. Go to [railway.com](https://railway.com) → New Project → Deploy from GitHub repo
2. Select this repo — Railway detects the `Dockerfile` automatically
3. In Settings → Networking, note the public port (default **8080**). Do **not** add a `PORT` variable — Railway injects it automatically
4. Add environment variables (without surrounding quotes):
   - `DATABASE_URL`, `DATABASE_DIRECT_URL`
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
   - `FRONTEND_URL` → `https://your-firebase-project.web.app`
   - `RESEND_API_KEY` → your Resend API key (invite emails use `onboarding@resend.dev`)
   - `NODE_ENV` → `production`
5. Copy the Railway public URL and set `NEXT_PUBLIC_API_URL` in GitHub secrets to `<railway-url>/api/v1`

### Required GitHub Secrets

| Secret                     | Description                                               |
| -------------------------- | --------------------------------------------------------- |
| `DATABASE_URL`             | Neon pooled connection string                             |
| `DATABASE_DIRECT_URL`      | Neon direct (non-pooled) connection string                |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON (for Hosting deploy action) |
| `NEXT_PUBLIC_FIREBASE_*`   | Firebase web SDK config values (6 variables)              |
| `NEXT_PUBLIC_API_URL`      | Railway API base URL + `/api/v1`                          |

---

## API Overview

All routes are prefixed `/api/v1` and require a Firebase ID token via `Authorization: Bearer <token>` unless marked public.

| Method | Path                         | Role required           | Description                                  |
| ------ | ---------------------------- | ----------------------- | -------------------------------------------- |
| POST   | `/auth/register`             | public (Firebase token) | Register a new organization                  |
| POST   | `/auth/accept-invite`        | public (Firebase token) | Accept an org invite                         |
| GET    | `/auth/me`                   | any DB user             | Get current user + organization              |
| GET    | `/organizations`             | SUPERADMIN              | List all organizations                       |
| GET    | `/organizations/pending`     | SUPERADMIN              | List pending organizations                   |
| PATCH  | `/organizations/:id/approve` | SUPERADMIN              | Approve a pending org                        |
| PATCH  | `/organizations/:id/reject`  | SUPERADMIN              | Reject a pending org                         |
| GET    | `/assets`                    | VIEWER+                 | List assets (paginated + search)             |
| POST   | `/assets`                    | ORG_MANAGER+            | Create an asset (100-asset trial limit)      |
| PUT    | `/assets/:id`                | ORG_MANAGER+            | Update an asset                              |
| DELETE | `/assets/:id`                | ORG_MANAGER+            | Delete an asset                              |
| POST   | `/assets/import/csv`         | ORG_MANAGER+            | Bulk import via CSV (stops at trial limit)   |
| GET    | `/users`                     | ORG_MANAGER+            | List org members                             |
| POST   | `/users/invite`              | ORG_MANAGER+            | Invite a new member by email                 |
| GET    | `/users/invites`             | ORG_MANAGER+            | List pending invites                         |
| DELETE | `/users/invites/:id`         | ORG_MANAGER+            | Delete a pending invite                      |
| PATCH  | `/users/:id/role`            | ORG_MANAGER+            | Update a member's role                       |
| DELETE | `/users/:id`                 | ORG_MANAGER+            | Remove a member from the org                 |
| GET    | `/reports/stats`             | VIEWER+                 | Asset utilization + status breakdown         |
| GET    | `/audit/asset/:id`           | VIEWER+                 | Audit log for a specific asset               |

---

## License

MIT
