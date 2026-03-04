# NexusCore

Multi-tenant Resource Management SaaS built as a full-stack portfolio project. Organizations track physical or digital assets, manage team members with role-based access, and view analytics — all behind Firebase Authentication and an admin-approval workflow.

**Live demo:** https://nexus-core-rms.web.app

---

## Tech Stack

| Layer    | Technology                                                                         |
| -------- | ---------------------------------------------------------------------------------- |
| Frontend | Next.js 15 (static export), Tailwind CSS v4, TanStack Query, react-hook-form + Zod |
| Backend  | NestJS 10 (REST API), deployed to Railway                                          |
| Database | PostgreSQL on Neon (serverless), Prisma ORM                                        |
| Auth     | Firebase Authentication (Google sign-in)                                           |
| Hosting  | Firebase Hosting (frontend) + Railway (API)                                        |
| Monorepo | TurboRepo with shared `packages/`                                                  |
| CI/CD    | GitHub Actions — test → migrate → build → deploy on every push to `main`           |

---

## Features

- **Multi-tenancy** — every resource is scoped to an organization; `organizationId` is always sourced from the verified JWT, never the request body
- **RBAC** — four-level role hierarchy: `SUPERADMIN > ORG_MANAGER > ASSET_MANAGER > VIEWER`
- **Admin approval flow** — new organizations start as `PENDING`; a SUPERADMIN must approve before users can access the app
- **Asset management** — full CRUD with status tracking (`AVAILABLE / IN_USE / MAINTENANCE / RETIRED`) and CSV bulk-import
- **Audit log** — every mutating action is recorded synchronously with before/after diffs
- **Reports & analytics** — utilization rate, asset-by-status breakdown, in-memory 5-minute TTL cache (no Redis required)
- **Team invites** — ORG_MANAGERs can invite team members by email with a scoped role
- **Rate limiting** — 300 req/15 min global; 5 req/hour per IP on the registration endpoint
- **Security** — Helmet headers, CORS locked to known origins, Firebase ID token verification on every request

---

## Monorepo Structure

```
NexusCore/
├── apps/
│   ├── api/          — NestJS REST API (deployed to Railway)
│   └── web/          — Next.js 15 static export (Firebase Hosting)
├── packages/
│   ├── database/     — Prisma schema, PrismaClient singleton, seed script
│   └── shared/       — DTOs, enums, ROLE_HIERARCHY, hasRole()
└── .github/
    └── workflows/
        └── ci.yml    — test → migrate → build → deploy
```

---

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+
- A [Firebase project](https://console.firebase.google.com) with Authentication enabled
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/your-username/NexusCore.git
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
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

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
# Generate the Prisma client
npx prisma generate --schema=packages/database/prisma/schema.prisma

# Apply migrations
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma

# (Optional) seed demo data
npx prisma db seed --schema=packages/database/prisma/schema.prisma
```

### 4. Run

```bash
npm run dev   # starts API on :3001 and web on :3000 in parallel
```

---

## Testing

```bash
npm run test            # run all API unit tests
npm run test:coverage   # must pass 80% statement/branch threshold
npm run type-check      # TypeScript strict check across all packages
```

Tests live in `apps/api/src/modules/**/__tests__/` and use Vitest with mocked PrismaClient.

---

## Deployment

Deployment is fully automated via GitHub Actions on push to `main`. The pipeline:

1. Runs type-check + Vitest coverage (80% threshold enforced)
2. Applies Prisma migrations against the production Neon database
3. Builds the Next.js static export
4. Deploys frontend to Firebase Hosting

The NestJS API is hosted on **Railway** (free tier). Railway auto-deploys from the `main` branch via the `Dockerfile` at the repo root.

### Railway setup (one-time)

1. Go to [railway.com](https://railway.com) → New Project → Deploy from GitHub repo
2. Select this repo — Railway will detect the `Dockerfile` automatically
3. In the service Settings → Networking, note the public port (default is **8080**). Do **not** add a `PORT` variable — Railway injects `PORT` automatically and it must match what the networking config exposes.
4. Add the following environment variables in the Railway dashboard:
   - `DATABASE_URL`
   - `DATABASE_DIRECT_URL`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `FRONTEND_URL` → set to `https://nexus-core-rms.web.app`
   - `NODE_ENV` → `production`
5. Copy the Railway public URL (e.g. `https://nexuscore-api-production.up.railway.app`)
6. Set `NEXT_PUBLIC_API_URL` in GitHub Actions secrets to `<railway-url>/api/v1`
7. Redeploy the frontend from the Actions tab so it picks up the new API URL

### Required GitHub Secrets

| Secret                     | Description                                               |
| -------------------------- | --------------------------------------------------------- |
| `DATABASE_URL`             | Neon pooled connection string                             |
| `DATABASE_DIRECT_URL`      | Neon direct (non-pooled) connection string                |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON (for Hosting deploy action) |
| `NEXT_PUBLIC_FIREBASE_*`   | Firebase web SDK config values                            |
| `NEXT_PUBLIC_API_URL`      | Railway API URL + `/api/v1`                               |
| `CODECOV_TOKEN`            | (Optional) Codecov upload token                           |

---

## API Overview

All routes are prefixed `/api/v1` and require a Firebase ID token in the `Authorization: Bearer <token>` header unless marked public.

| Method | Path                         | Role                    | Description                                  |
| ------ | ---------------------------- | ----------------------- | -------------------------------------------- |
| POST   | `/auth/register`             | Firebase token (public) | Register a new organization (starts PENDING) |
| POST   | `/auth/accept-invite`        | Firebase token (public) | Accept an org invite                         |
| GET    | `/auth/me`                   | any DB user             | Get current user                             |
| GET    | `/organizations/me`          | any                     | Get own organization                         |
| GET    | `/organizations`             | SUPERADMIN              | List all organizations                       |
| GET    | `/organizations/pending`     | SUPERADMIN              | List pending organizations                   |
| PATCH  | `/organizations/:id/approve` | SUPERADMIN              | Approve a pending org                        |
| PATCH  | `/organizations/:id/reject`  | SUPERADMIN              | Reject a pending org                         |
| GET    | `/assets`                    | VIEWER+                 | List assets (paginated, searchable)          |
| POST   | `/assets`                    | ASSET_MANAGER+          | Create an asset                              |
| PATCH  | `/assets/:id`                | ASSET_MANAGER+          | Update an asset                              |
| DELETE | `/assets/:id`                | ORG_MANAGER+            | Delete an asset                              |
| POST   | `/assets/import`             | ASSET_MANAGER+          | Bulk import via CSV                          |
| GET    | `/users`                     | ORG_MANAGER+            | List org members                             |
| POST   | `/users/invite`              | ORG_MANAGER+            | Invite a new member                          |
| GET    | `/reports/summary`           | VIEWER+                 | Asset utilization summary                    |
| GET    | `/audit-logs`                | ORG_MANAGER+            | Paginated audit log                          |

Swagger UI is available at `/api/docs` in non-production environments.

---

## License

MIT
