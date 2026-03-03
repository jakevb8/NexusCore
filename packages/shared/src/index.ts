// ─── Enums (mirrored from Prisma for use on the frontend) ─────────────────────

export enum Role {
  SUPERADMIN = 'SUPERADMIN',
  ORG_MANAGER = 'ORG_MANAGER',
  ASSET_MANAGER = 'ASSET_MANAGER',
  VIEWER = 'VIEWER',
}

export enum OrgStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
}

export enum AssetStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED',
}

// ─── API Response Types ────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T
  meta?: {
    total?: number
    page?: number
    perPage?: number
  }
}

export interface ApiError {
  statusCode: number
  message: string
  errors?: Record<string, string[]>
}

// ─── Resource DTOs ─────────────────────────────────────────────────────────────

export interface OrganizationDto {
  id: string
  name: string
  slug: string
  status: OrgStatus
  createdAt: string
}

export interface UserDto {
  id: string
  email: string
  displayName: string | null
  role: Role
  organizationId: string
  createdAt: string
}

export interface AssetDto {
  id: string
  name: string
  sku: string
  description: string | null
  status: AssetStatus
  assignedTo: string | null
  organizationId: string
  createdAt: string
  updatedAt: string
}

export interface AuditLogDto {
  id: string
  action: string
  actorId: string
  actor?: Pick<UserDto, 'id' | 'email' | 'displayName'>
  changes: {
    before: Record<string, unknown> | null
    after: Record<string, unknown> | null
  }
  assetId: string | null
  timestamp: string
}

export interface InviteDto {
  id: string
  email: string
  role: Role
  organizationId: string
  expiresAt: string
  acceptedAt: string | null
}

// ─── Request DTOs ──────────────────────────────────────────────────────────────

export interface CreateAssetDto {
  name: string
  sku: string
  description?: string
  status?: AssetStatus
}

export interface UpdateAssetDto {
  name?: string
  description?: string
  status?: AssetStatus
  assignedTo?: string | null
}

export interface CreateInviteDto {
  email: string
  role: Role
}

// ─── Dashboard / Analytics ─────────────────────────────────────────────────────

export interface GlobalStats {
  totalAssets: number
  byStatus: Record<AssetStatus, number>
  utilizationRate: number // percentage: IN_USE / total
  totalUsers: number
  totalOrganizations?: number // SUPERADMIN only
}

// ─── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number
  perPage?: number
  search?: string
}

// ─── RBAC helpers ─────────────────────────────────────────────────────────────

export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPERADMIN]: 4,
  [Role.ORG_MANAGER]: 3,
  [Role.ASSET_MANAGER]: 2,
  [Role.VIEWER]: 1,
}

export function hasRole(userRole: Role, required: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required]
}
