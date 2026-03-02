import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OrganizationsService } from '../organizations.service'
import { NotFoundException } from '@nestjs/common'

const mockDb = {
  organization: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
}

describe('OrganizationsService', () => {
  let service: OrganizationsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new OrganizationsService(mockDb as any)
  })

  describe('findOne', () => {
    it('returns organization with user and asset counts', async () => {
      const org = { id: 'org-1', name: 'Acme', _count: { users: 5, assets: 12 } }
      mockDb.organization.findUnique.mockResolvedValue(org)

      const result = await service.findOne('org-1')

      expect(result).toEqual(org)
      expect(mockDb.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        include: { _count: { select: { users: true, assets: true } } },
      })
    })

    it('throws NotFoundException when organization does not exist', async () => {
      mockDb.organization.findUnique.mockResolvedValue(null)

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException)
    })
  })

  describe('findAll', () => {
    it('returns all organizations ordered by createdAt desc', async () => {
      const orgs = [
        { id: 'org-2', name: 'Beta Corp', _count: { users: 3, assets: 7 } },
        { id: 'org-1', name: 'Acme', _count: { users: 5, assets: 12 } },
      ]
      mockDb.organization.findMany.mockResolvedValue(orgs)

      const result = await service.findAll()

      expect(result).toEqual(orgs)
      expect(mockDb.organization.findMany).toHaveBeenCalledWith({
        include: { _count: { select: { users: true, assets: true } } },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('returns empty array when no organizations exist', async () => {
      mockDb.organization.findMany.mockResolvedValue([])

      const result = await service.findAll()

      expect(result).toEqual([])
    })
  })
})
