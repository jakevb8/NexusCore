import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OrganizationsService } from '../organizations.service'
import { BadRequestException, NotFoundException } from '@nestjs/common'

const mockDb = {
  organization: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
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

  describe('findPending', () => {
    it('returns organizations with PENDING status', async () => {
      const pending = [
        { id: 'org-1', name: 'New Co', status: 'PENDING', _count: { users: 1 }, users: [] },
      ]
      mockDb.organization.findMany.mockResolvedValue(pending)

      const result = await service.findPending()

      expect(result).toEqual(pending)
      expect(mockDb.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'PENDING' } }),
      )
    })
  })

  describe('approve', () => {
    it('sets status to ACTIVE for a PENDING org', async () => {
      const org = { id: 'org-1', status: 'PENDING' }
      const updated = { ...org, status: 'ACTIVE' }
      mockDb.organization.findUnique.mockResolvedValue(org)
      mockDb.organization.update.mockResolvedValue(updated)

      const result = await service.approve('org-1')

      expect(result).toEqual(updated)
      expect(mockDb.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { status: 'ACTIVE' },
      })
    })

    it('throws NotFoundException when org does not exist', async () => {
      mockDb.organization.findUnique.mockResolvedValue(null)

      await expect(service.approve('missing')).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when org is already ACTIVE', async () => {
      mockDb.organization.findUnique.mockResolvedValue({ id: 'org-1', status: 'ACTIVE' })

      await expect(service.approve('org-1')).rejects.toThrow(BadRequestException)
    })
  })

  describe('reject', () => {
    it('sets status to REJECTED for a PENDING org', async () => {
      const org = { id: 'org-1', status: 'PENDING' }
      const updated = { ...org, status: 'REJECTED' }
      mockDb.organization.findUnique.mockResolvedValue(org)
      mockDb.organization.update.mockResolvedValue(updated)

      const result = await service.reject('org-1')

      expect(result).toEqual(updated)
      expect(mockDb.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { status: 'REJECTED' },
      })
    })

    it('throws NotFoundException when org does not exist', async () => {
      mockDb.organization.findUnique.mockResolvedValue(null)

      await expect(service.reject('missing')).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when org is already REJECTED', async () => {
      mockDb.organization.findUnique.mockResolvedValue({ id: 'org-1', status: 'REJECTED' })

      await expect(service.reject('org-1')).rejects.toThrow(BadRequestException)
    })
  })
})
