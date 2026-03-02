import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AssetsService } from '../assets.service'
import { ConflictException, NotFoundException } from '@nestjs/common'
import { AssetStatus } from '@nexus-core/shared'

const mockDb = {
  asset: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}

const mockAuditService = {
  log: vi.fn(),
}

describe('AssetsService', () => {
  let service: AssetsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AssetsService(mockDb as any, mockAuditService as any)
  })

  describe('findAll', () => {
    it('returns paginated assets for the organization', async () => {
      mockDb.asset.findMany.mockResolvedValue([{ id: '1', name: 'Laptop', sku: 'L001' }])
      mockDb.asset.count.mockResolvedValue(1)

      const result = await service.findAll('org-1', { page: 1, perPage: 20 })

      expect(result.data).toHaveLength(1)
      expect(result.meta.total).toBe(1)
      expect(mockDb.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-1' } }),
      )
    })
  })

  describe('findOne', () => {
    it('returns asset when found', async () => {
      const asset = { id: 'asset-1', organizationId: 'org-1' }
      mockDb.asset.findFirst.mockResolvedValue(asset)

      const result = await service.findOne('asset-1', 'org-1')
      expect(result).toEqual(asset)
    })

    it('throws NotFoundException when asset not found', async () => {
      mockDb.asset.findFirst.mockResolvedValue(null)
      await expect(service.findOne('bad-id', 'org-1')).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('creates an asset and logs the action', async () => {
      mockDb.asset.findUnique.mockResolvedValue(null) // no conflict
      const newAsset = { id: 'new-id', name: 'Monitor', sku: 'MON-001', organizationId: 'org-1' }
      mockDb.asset.create.mockResolvedValue(newAsset)

      const result = await service.create(
        { name: 'Monitor', sku: 'MON-001' },
        'org-1',
        'user-1',
      )

      expect(result).toEqual(newAsset)
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ASSET_CREATED', actorId: 'user-1' }),
      )
    })

    it('throws ConflictException if SKU already exists', async () => {
      mockDb.asset.findUnique.mockResolvedValue({ id: 'existing' })
      await expect(
        service.create({ name: 'Dup', sku: 'EXISTING-SKU' }, 'org-1', 'user-1'),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('update', () => {
    it('updates asset and logs changes', async () => {
      const before = { id: 'a1', name: 'Old', status: AssetStatus.AVAILABLE, organizationId: 'org-1' }
      const after = { ...before, status: AssetStatus.IN_USE }
      mockDb.asset.findFirst.mockResolvedValue(before)
      mockDb.asset.update.mockResolvedValue(after)

      const result = await service.update('a1', { status: AssetStatus.IN_USE }, 'org-1', 'user-1')

      expect(result.status).toBe(AssetStatus.IN_USE)
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ASSET_UPDATED',
          changes: expect.objectContaining({ before, after }),
        }),
      )
    })
  })

  describe('remove', () => {
    it('deletes asset after logging', async () => {
      const asset = { id: 'a1', organizationId: 'org-1' }
      mockDb.asset.findFirst.mockResolvedValue(asset)
      mockDb.asset.delete.mockResolvedValue(asset)

      await service.remove('a1', 'org-1', 'user-1')

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ASSET_DELETED' }),
      )
      expect(mockDb.asset.delete).toHaveBeenCalledWith({ where: { id: 'a1' } })
    })
  })
})
