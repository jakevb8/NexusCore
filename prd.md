Specification: Nexus-Core Enterprise SaaS
Version: 1.0.0

Stack: Next.js 15, NestJS, PostgreSQL (Prisma), Redis, Tailwind/Shadcn.

1. Executive Summary
Nexus-Core is a multi-tenant Resource Management System (RMS). It allows diverse organizations to manage high-value assets, track lifecycle maintenance, and automate workflows via a centralized dashboard. The primary goal is to demonstrate Security, Scalability, and Auditability.

2. System Architecture & Multi-Tenancy
Tenant Isolation: Use a Discriminator Column Strategy (organizationId on all tables) with a Middleware layer that enforces a WHERE clause on every query based on the authenticated user's session.

Infrastructure: * Backend: RESTful API using NestJS with Swagger/OpenAPI documentation.

Frontend: Next.js App Router using Server Actions for mutations and TanStack Query for client-side state.

3. Database Schema (Prisma Lean Spec)
Code snippet
model Organization {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  users     User[]
  assets    Asset[]
  createdAt DateTime @default(now())
}

model User {
  id             String       @id @default(uuid())
  email          String       @unique
  role           Role         @default(EMPLOYEE)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
}

model Asset {
  id             String       @id @default(uuid())
  name           String
  sku            String       @unique
  status         AssetStatus  @default(AVAILABLE)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  auditLogs      AuditLog[]
}

model AuditLog {
  id        String   @id @default(uuid())
  action    String   // e.g., "ASSET_UPDATE"
  actorId   String
  changes   Json     // Store before/after state
  assetId   String?
  asset     Asset?   @relation(fields: [assetId], references: [id])
  timestamp DateTime @default(now())
}

enum Role { SUPERADMIN, ORG_MANAGER, EMPLOYEE }
enum AssetStatus { AVAILABLE, IN_USE, MAINTENANCE, RETIRED }
4. Feature Requirements
FR-01: Identity & Access Management (IAM)
Integrate Auth0/Clerk for JWT-based authentication.

RBAC Middleware: * SUPERADMIN: View all system metrics.

ORG_MANAGER: Full CRUD on assets and user management within their organizationId.

EMPLOYEE: Read-only access to assigned assets.

FR-02: Asset Lifecycle Management
Bulk Import: Support CSV uploads for initial asset inventory.

Real-time Updates: Use WebSockets (Socket.io) or Server-Sent Events (SSE) to update the dashboard when an asset status changes.

FR-03: Enterprise Audit Engine
Requirement: Every PUT or DELETE request must trigger a background job (Redis/BullMQ) to create an AuditLog entry.

Interface: A "History" tab on each asset showing the timeline of who moved/edited it.

FR-04: Reporting & Analytics
Aggregations: SQL queries to calculate "Utilization Rate" (In-Use vs. Total).

Caching: Use Redis to cache the results of the "Global Stats" dashboard for 5 minutes to reduce DB load.

5. Non-Functional Requirements
Testing: Minimum 80% coverage on service logic using Vitest.

API Standards: All endpoints must return standard JSON:API responses with appropriate HTTP status codes (200, 201, 403, 429).

Security: Implement helmet for headers, express-rate-limit for DDoS protection, and CSRF protection.

6. Implementation Roadmap (Phased)
Phase 1: Setup Monorepo (TurboRepo) + Database Schema + Auth Handshake.

Phase 2: Build Organization Onboarding & User Invite System.

Phase 3: Core Asset CRUD with Multi-tenant filtering.

Phase 4: Audit Log background workers & Dashboard Visualizations.

Phase 5: Deployment to Vercel/AWS with CI/CD pipeline.

Would you like me to generate the first set of NestJS Boilerplate files or the Prisma migration script based on this spec?