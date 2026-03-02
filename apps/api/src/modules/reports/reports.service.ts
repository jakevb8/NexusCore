import { Injectable, Inject } from '@nestjs/common'
import { PrismaClient, AssetStatus } from '@nexus-core/database'
import { GlobalStats, Role } from '@nexus-core/shared'

// Simple in-memory cache since we don't have Redis (5-minute TTL)
interface CacheEntry<T> {
  value: T
  expiresAt: number
}

@Injectable()
export class ReportsService {
  private cache = new Map<string, CacheEntry<unknown>>()

  constructor(@Inject('PRISMA') private readonly db: PrismaClient) {}

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    return entry.value as T
  }

  private setCached<T>(key: string, value: T, ttlSeconds = 300): void {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
  }

  async getOrgStats(organizationId: string): Promise<GlobalStats> {
    const cacheKey = `org-stats:${organizationId}`
    const cached = this.getCached<GlobalStats>(cacheKey)
    if (cached) return cached

    const [assets, users] = await Promise.all([
      this.db.asset.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { id: true },
      }),
      this.db.user.count({ where: { organizationId } }),
    ])

    const byStatus = {
      [AssetStatus.AVAILABLE]: 0,
      [AssetStatus.IN_USE]: 0,
      [AssetStatus.MAINTENANCE]: 0,
      [AssetStatus.RETIRED]: 0,
    } as Record<AssetStatus, number>

    for (const row of assets) {
      byStatus[row.status] = row._count.id
    }

    const totalAssets = Object.values(byStatus).reduce((a, b) => a + b, 0)
    const utilizationRate = totalAssets > 0 ? (byStatus.IN_USE / totalAssets) * 100 : 0

    const stats: GlobalStats = {
      totalAssets,
      byStatus,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      totalUsers: users,
    }

    this.setCached(cacheKey, stats, 300) // 5 minutes
    return stats
  }

  async getSystemStats(): Promise<GlobalStats & { totalOrganizations: number }> {
    const cacheKey = 'system-stats'
    const cached = this.getCached<GlobalStats & { totalOrganizations: number }>(cacheKey)
    if (cached) return cached

    const [assets, users, orgs] = await Promise.all([
      this.db.asset.groupBy({ by: ['status'], _count: { id: true } }),
      this.db.user.count(),
      this.db.organization.count(),
    ])

    const byStatus = {
      [AssetStatus.AVAILABLE]: 0,
      [AssetStatus.IN_USE]: 0,
      [AssetStatus.MAINTENANCE]: 0,
      [AssetStatus.RETIRED]: 0,
    } as Record<AssetStatus, number>

    for (const row of assets) {
      byStatus[row.status] = row._count.id
    }

    const totalAssets = Object.values(byStatus).reduce((a, b) => a + b, 0)
    const utilizationRate = totalAssets > 0 ? (byStatus.IN_USE / totalAssets) * 100 : 0

    const stats = {
      totalAssets,
      byStatus,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      totalUsers: users,
      totalOrganizations: orgs,
    }

    this.setCached(cacheKey, stats, 300)
    return stats
  }
}
