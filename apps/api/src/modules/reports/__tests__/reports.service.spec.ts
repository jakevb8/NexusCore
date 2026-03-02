import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReportsService } from '../reports.service'
import { AssetStatus } from '@nexus-core/database'

const assetGroupByResult = [
  { status: AssetStatus.AVAILABLE, _count: { id: 5 } },
  { status: AssetStatus.IN_USE, _count: { id: 3 } },
  { status: AssetStatus.MAINTENANCE, _count: { id: 1 } },
  { status: AssetStatus.RETIRED, _count: { id: 1 } },
]

const mockDb = {
  asset: {
    groupBy: vi.fn(),
  },
  user: {
    count: vi.fn(),
  },
  organization: {
    count: vi.fn(),
  },
}

describe('ReportsService', () => {
  let service: ReportsService

  beforeEach(() => {
    vi.clearAllMocks()
    // Create a fresh instance each time so the internal cache is empty
    service = new ReportsService(mockDb as any)
  })

  describe('getOrgStats', () => {
    it('returns correct stats and utilization rate', async () => {
      mockDb.asset.groupBy.mockResolvedValue(assetGroupByResult)
      mockDb.user.count.mockResolvedValue(10)

      const result = await service.getOrgStats('org-1')

      expect(result.totalAssets).toBe(10)
      expect(result.byStatus[AssetStatus.AVAILABLE]).toBe(5)
      expect(result.byStatus[AssetStatus.IN_USE]).toBe(3)
      expect(result.byStatus[AssetStatus.MAINTENANCE]).toBe(1)
      expect(result.byStatus[AssetStatus.RETIRED]).toBe(1)
      expect(result.utilizationRate).toBe(30) // 3/10 * 100
      expect(result.totalUsers).toBe(10)
    })

    it('returns 0% utilization rate when no assets exist', async () => {
      mockDb.asset.groupBy.mockResolvedValue([])
      mockDb.user.count.mockResolvedValue(2)

      const result = await service.getOrgStats('org-empty')

      expect(result.totalAssets).toBe(0)
      expect(result.utilizationRate).toBe(0)
    })

    it('returns cached value on second call without hitting DB again', async () => {
      mockDb.asset.groupBy.mockResolvedValue(assetGroupByResult)
      mockDb.user.count.mockResolvedValue(5)

      await service.getOrgStats('org-1')
      await service.getOrgStats('org-1')

      expect(mockDb.asset.groupBy).toHaveBeenCalledTimes(1)
      expect(mockDb.user.count).toHaveBeenCalledTimes(1)
    })

    it('scopes groupBy to the correct organization', async () => {
      mockDb.asset.groupBy.mockResolvedValue([])
      mockDb.user.count.mockResolvedValue(0)

      await service.getOrgStats('org-42')

      expect(mockDb.asset.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-42' } }),
      )
    })

    it('uses separate cache keys per organization', async () => {
      mockDb.asset.groupBy.mockResolvedValue([])
      mockDb.user.count.mockResolvedValue(0)

      await service.getOrgStats('org-1')
      await service.getOrgStats('org-2')

      expect(mockDb.asset.groupBy).toHaveBeenCalledTimes(2)
    })
  })

  describe('getSystemStats', () => {
    it('returns system-wide stats including organization count', async () => {
      mockDb.asset.groupBy.mockResolvedValue(assetGroupByResult)
      mockDb.user.count.mockResolvedValue(50)
      mockDb.organization.count.mockResolvedValue(5)

      const result = await service.getSystemStats()

      expect(result.totalAssets).toBe(10)
      expect(result.totalUsers).toBe(50)
      expect(result.totalOrganizations).toBe(5)
      expect(result.utilizationRate).toBe(30)
    })

    it('returns cached value on second call without hitting DB again', async () => {
      mockDb.asset.groupBy.mockResolvedValue([])
      mockDb.user.count.mockResolvedValue(0)
      mockDb.organization.count.mockResolvedValue(0)

      await service.getSystemStats()
      await service.getSystemStats()

      expect(mockDb.asset.groupBy).toHaveBeenCalledTimes(1)
    })

    it('queries groupBy without org filter for system-wide stats', async () => {
      mockDb.asset.groupBy.mockResolvedValue([])
      mockDb.user.count.mockResolvedValue(0)
      mockDb.organization.count.mockResolvedValue(0)

      await service.getSystemStats()

      expect(mockDb.asset.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ by: ['status'], _count: { id: true } }),
      )
      // Should NOT have a where clause filtering by org
      const call = mockDb.asset.groupBy.mock.calls[0][0]
      expect(call.where).toBeUndefined()
    })
  })
})
