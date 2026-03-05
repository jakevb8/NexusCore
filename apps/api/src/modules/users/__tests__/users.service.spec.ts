import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UsersService } from '../users.service'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { Role } from '@nexus-core/shared'

const mockDb = {
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  invite: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
  },
}

const mockEmailService = {
  sendInviteEmail: vi.fn().mockResolvedValue(undefined),
}

describe('UsersService', () => {
  let service: UsersService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new UsersService(mockDb as any, mockEmailService as any)
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
      mockDb.user.findUnique
        .mockResolvedValueOnce(null) // email check — no existing user
        .mockResolvedValueOnce({ displayName: 'Alice', email: 'alice@acme.com' }) // inviter lookup
      mockDb.invite.findFirst.mockResolvedValue(null)
      mockDb.organization.findUnique.mockResolvedValue({ name: 'Acme Corp' })
      const invite = { id: 'inv-1', email: 'bob@acme.com', role: Role.VIEWER, token: 'tok-1' }
      mockDb.invite.create.mockResolvedValue(invite)

      const result = await service.createInvite('bob@acme.com', Role.VIEWER, 'org-1', 'inviter-1')

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

      await expect(
        service.createInvite('existing@acme.com', Role.VIEWER, 'org-1', 'inviter-1'),
      ).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException if active invite already exists', async () => {
      mockDb.user.findUnique.mockResolvedValueOnce(null) // email check
      mockDb.invite.findFirst.mockResolvedValue({ id: 'pending-invite' })

      await expect(
        service.createInvite('pending@acme.com', Role.VIEWER, 'org-1', 'inviter-1'),
      ).rejects.toThrow(ConflictException)
    })

    it('sets expiresAt approximately 7 days in the future', async () => {
      mockDb.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ displayName: 'Alice', email: 'alice@acme.com' }) // inviter
      mockDb.invite.findFirst.mockResolvedValue(null)
      mockDb.organization.findUnique.mockResolvedValue({ name: 'Acme Corp' })
      mockDb.invite.create.mockResolvedValue({ id: 'inv-1', token: 'tok-1' })

      await service.createInvite('new@acme.com', Role.ASSET_MANAGER, 'org-1', 'inviter-1')

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

    it('sends an invite email after creating the invite', async () => {
      mockDb.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ displayName: 'Alice', email: 'alice@acme.com' })
      mockDb.invite.findFirst.mockResolvedValue(null)
      mockDb.organization.findUnique.mockResolvedValue({ name: 'Acme Corp' })
      mockDb.invite.create.mockResolvedValue({
        id: 'inv-1',
        email: 'bob@acme.com',
        role: Role.VIEWER,
        token: 'tok-abc',
      })

      await service.createInvite('bob@acme.com', Role.VIEWER, 'org-1', 'inviter-1')

      expect(mockEmailService.sendInviteEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          toEmail: 'bob@acme.com',
          inviteToken: 'tok-abc',
          organizationName: 'Acme Corp',
          inviterName: 'Alice',
        }),
      )
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

  describe('deleteInvite', () => {
    it('deletes a pending invite that belongs to the org', async () => {
      const invite = { id: 'inv-1', organizationId: 'org-1', acceptedAt: null }
      mockDb.invite.findFirst.mockResolvedValue(invite)
      mockDb.invite.delete.mockResolvedValue(invite)

      const result = await service.deleteInvite('inv-1', 'org-1')

      expect(result).toEqual(invite)
      expect(mockDb.invite.delete).toHaveBeenCalledWith({ where: { id: 'inv-1' } })
    })

    it('throws NotFoundException when invite not found in org', async () => {
      mockDb.invite.findFirst.mockResolvedValue(null)

      await expect(service.deleteInvite('bad-id', 'org-1')).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when invite is already accepted', async () => {
      mockDb.invite.findFirst.mockResolvedValue({
        id: 'inv-1',
        organizationId: 'org-1',
        acceptedAt: new Date(),
      })

      await expect(service.deleteInvite('inv-1', 'org-1')).rejects.toThrow(ForbiddenException)
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

  describe('removeMember', () => {
    it('deletes a member that belongs to the org', async () => {
      const user = { id: 'u2', organizationId: 'org-1', role: Role.VIEWER }
      mockDb.user.findFirst.mockResolvedValue(user)
      mockDb.user.delete.mockResolvedValue(user)

      const result = await service.removeMember('u2', 'actor-1', 'org-1')

      expect(result).toEqual(user)
      expect(mockDb.user.delete).toHaveBeenCalledWith({ where: { id: 'u2' } })
    })

    it('throws BadRequestException when actor tries to remove themselves', async () => {
      await expect(service.removeMember('actor-1', 'actor-1', 'org-1')).rejects.toThrow(
        BadRequestException,
      )
    })

    it('throws NotFoundException when user not found in org', async () => {
      mockDb.user.findFirst.mockResolvedValue(null)

      await expect(service.removeMember('u2', 'actor-1', 'org-1')).rejects.toThrow(
        NotFoundException,
      )
    })

    it('throws ForbiddenException when trying to remove a SUPERADMIN', async () => {
      mockDb.user.findFirst.mockResolvedValue({
        id: 'u2',
        organizationId: 'org-1',
        role: Role.SUPERADMIN,
      })

      await expect(service.removeMember('u2', 'actor-1', 'org-1')).rejects.toThrow(
        ForbiddenException,
      )
    })
  })
})
