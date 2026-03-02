import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuditService } from '../audit.service'

const mockDb = {
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  asset: {
    findFirst: vi.fn(),
  },
}

describe('AuditService', () => {
  let service: AuditService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AuditService(mockDb as any)
  })

  describe('log', () => {
    it('creates an audit log entry with correct data', async () => {
      const entry = { id: 'log-1', action: 'ASSET_CREATED', actorId: 'user-1' }
      mockDb.auditLog.create.mockResolvedValue(entry)

      const result = await service.log({
        action: 'ASSET_CREATED',
        actorId: 'user-1',
        assetId: 'asset-1',
        changes: { before: null, after: { name: 'Laptop' } },
      })

      expect(result).toEqual(entry)
      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'ASSET_CREATED',
          actorId: 'user-1',
          assetId: 'asset-1',
          changes: { before: null, after: { name: 'Laptop' } },
        },
      })
    })

    it('sets assetId to null when not provided', async () => {
      mockDb.auditLog.create.mockResolvedValue({ id: 'log-2' })

      await service.log({
        action: 'USER_INVITED',
        actorId: 'user-1',
        changes: { before: null, after: null },
      })

      expect(mockDb.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ assetId: null }) }),
      )
    })
  })

  describe('findForAsset', () => {
    it('returns audit logs when asset belongs to org', async () => {
      const asset = { id: 'asset-1', organizationId: 'org-1' }
      const logs = [{ id: 'log-1', action: 'ASSET_CREATED' }]
      mockDb.asset.findFirst.mockResolvedValue(asset)
      mockDb.auditLog.findMany.mockResolvedValue(logs)

      const result = await service.findForAsset('asset-1', 'org-1')

      expect(result).toEqual(logs)
      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { assetId: 'asset-1' } }),
      )
    })

    it('returns empty array when asset does not belong to org', async () => {
      mockDb.asset.findFirst.mockResolvedValue(null)

      const result = await service.findForAsset('asset-1', 'wrong-org')

      expect(result).toEqual([])
      expect(mockDb.auditLog.findMany).not.toHaveBeenCalled()
    })
  })

  describe('findAll', () => {
    it('returns paginated audit logs scoped to organization', async () => {
      const logs = [{ id: 'log-1' }, { id: 'log-2' }]
      mockDb.auditLog.findMany.mockResolvedValue(logs)
      mockDb.auditLog.count.mockResolvedValue(2)

      const result = await service.findAll('org-1', 1, 50)

      expect(result.data).toEqual(logs)
      expect(result.meta).toEqual({ total: 2, page: 1, perPage: 50 })
      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { asset: { organizationId: 'org-1' } },
          skip: 0,
          take: 50,
        }),
      )
    })

    it('calculates correct skip for page 2', async () => {
      mockDb.auditLog.findMany.mockResolvedValue([])
      mockDb.auditLog.count.mockResolvedValue(0)

      await service.findAll('org-1', 2, 25)

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 25, take: 25 }),
      )
    })

    it('defaults to page 1 perPage 50', async () => {
      mockDb.auditLog.findMany.mockResolvedValue([])
      mockDb.auditLog.count.mockResolvedValue(0)

      await service.findAll('org-1')

      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 50 }),
      )
    })
  })
})
