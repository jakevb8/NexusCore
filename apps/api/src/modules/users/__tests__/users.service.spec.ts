import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UsersService } from '../users.service'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { Role } from '@nexus-core/shared'

const mockDb = {
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  invite: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
}

describe('UsersService', () => {
  let service: UsersService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new UsersService(mockDb as any)
  })

  describe('findAll', () => {
    it('returns all users for the organization', async () => {
      const users = [{ id: 'u1', email: 'a@b.com', role: 'VIEWER' }]
      mockDb.user.findMany.mockResolvedValue(users)

      const result = await service.findAll('org-1')

      expect(result).toEqual(users)
      expect(mockDb.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-1' } }),
      )
    })
  })

  describe('createInvite', () => {
    it('creates an invite for a new user', async () => {
      mockDb.user.findUnique.mockResolvedValue(null)
      mockDb.invite.findFirst.mockResolvedValue(null)
      const invite = { id: 'inv-1', email: 'bob@acme.com', role: Role.VIEWER }
      mockDb.invite.create.mockResolvedValue(invite)

      const result = await service.createInvite('bob@acme.com', Role.VIEWER, 'org-1')

      expect(result).toEqual(invite)
      expect(mockDb.invite.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'bob@acme.com',
            role: Role.VIEWER,
            organizationId: 'org-1',
          }),
        }),
      )
    })

    it('throws ConflictException if user with email already exists', async () => {
      mockDb.user.findUnique.mockResolvedValue({ id: 'existing-user' })

      await expect(service.createInvite('existing@acme.com', Role.VIEWER, 'org-1')).rejects.toThrow(
        ConflictException,
      )
    })

    it('throws ConflictException if active invite already exists', async () => {
      mockDb.user.findUnique.mockResolvedValue(null)
      mockDb.invite.findFirst.mockResolvedValue({ id: 'pending-invite' })

      await expect(service.createInvite('pending@acme.com', Role.VIEWER, 'org-1')).rejects.toThrow(
        ConflictException,
      )
    })

    it('sets expiresAt approximately 7 days in the future', async () => {
      mockDb.user.findUnique.mockResolvedValue(null)
      mockDb.invite.findFirst.mockResolvedValue(null)
      mockDb.invite.create.mockResolvedValue({ id: 'inv-1' })

      await service.createInvite('new@acme.com', Role.ASSET_MANAGER, 'org-1')

      const call = mockDb.invite.create.mock.calls[0][0]
      const expiresAt: Date = call.data.expiresAt
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

      // Verify expiresAt is within the range [now+7days-2h, now+7days+2h]
      // (generous tolerance to account for clock skew in the test environment)
      const twoHoursMs = 2 * 60 * 60 * 1000
      const now = Date.now()
      expect(expiresAt.getTime()).toBeGreaterThan(now + sevenDaysMs - twoHoursMs)
      expect(expiresAt.getTime()).toBeLessThan(now + sevenDaysMs + twoHoursMs)
    })
  })

  describe('listInvites', () => {
    it('returns all invites for the organization', async () => {
      const invites = [{ id: 'inv-1' }, { id: 'inv-2' }]
      mockDb.invite.findMany.mockResolvedValue(invites)

      const result = await service.listInvites('org-1')

      expect(result).toEqual(invites)
      expect(mockDb.invite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-1' } }),
      )
    })
  })

  describe('updateRole', () => {
    it('updates user role when user belongs to org', async () => {
      const user = { id: 'u1', organizationId: 'org-1', role: Role.VIEWER }
      const updated = { ...user, role: Role.ASSET_MANAGER }
      mockDb.user.findFirst.mockResolvedValue(user)
      mockDb.user.update.mockResolvedValue(updated)

      const result = await service.updateRole('u1', Role.ASSET_MANAGER, 'org-1')

      expect(result.role).toBe(Role.ASSET_MANAGER)
      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { role: Role.ASSET_MANAGER },
      })
    })

    it('throws NotFoundException when user not in org', async () => {
      mockDb.user.findFirst.mockResolvedValue(null)

      await expect(service.updateRole('bad-id', Role.VIEWER, 'org-1')).rejects.toThrow(
        NotFoundException,
      )
    })

    it('throws BadRequestException when trying to assign SUPERADMIN', async () => {
      mockDb.user.findFirst.mockResolvedValue({ id: 'u1', organizationId: 'org-1' })

      await expect(service.updateRole('u1', Role.SUPERADMIN, 'org-1')).rejects.toThrow(
        BadRequestException,
      )
    })
  })
})
