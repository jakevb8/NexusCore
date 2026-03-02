import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from '../auth.service'
import { ConflictException, NotFoundException } from '@nestjs/common'

const mockTx = {
  organization: { create: vi.fn() },
  user: { create: vi.fn() },
  invite: { update: vi.fn() },
}

const mockDb = {
  user: {
    findUnique: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
  },
  invite: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
}

const mockFirebaseApp = {}

describe('AuthService', () => {
  let service: AuthService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AuthService(mockDb as any, mockFirebaseApp as any)
  })

  describe('registerNewOrganization', () => {
    it('creates org and user in a transaction', async () => {
      mockDb.user.findUnique.mockResolvedValue(null)
      mockDb.organization.findUnique.mockResolvedValue(null)

      const org = { id: 'org-1', name: 'Acme', slug: 'acme' }
      const user = { id: 'user-1', email: 'admin@acme.com', role: 'ORG_MANAGER' }
      mockTx.organization.create.mockResolvedValue(org)
      mockTx.user.create.mockResolvedValue(user)

      const result = await service.registerNewOrganization('firebase-uid-1', 'admin@acme.com', {
        organizationName: 'Acme',
        organizationSlug: 'acme',
        displayName: 'Admin',
      })

      expect(result).toEqual(user)
      expect(mockTx.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'Acme', slug: 'acme' } }),
      )
      expect(mockTx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firebaseUid: 'firebase-uid-1',
            email: 'admin@acme.com',
            role: 'ORG_MANAGER',
            organizationId: 'org-1',
          }),
        }),
      )
    })

    it('throws ConflictException if Firebase UID already registered', async () => {
      mockDb.user.findUnique.mockResolvedValue({ id: 'existing-user' })

      await expect(
        service.registerNewOrganization('firebase-uid-1', 'admin@acme.com', {
          organizationName: 'Acme',
          organizationSlug: 'acme',
        }),
      ).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException if org slug is already taken', async () => {
      mockDb.user.findUnique.mockResolvedValue(null)
      mockDb.organization.findUnique.mockResolvedValue({ id: 'org-existing' })

      await expect(
        service.registerNewOrganization('firebase-uid-1', 'admin@acme.com', {
          organizationName: 'Acme',
          organizationSlug: 'taken-slug',
        }),
      ).rejects.toThrow(ConflictException)
    })

    it('sets displayName to null when not provided', async () => {
      mockDb.user.findUnique.mockResolvedValue(null)
      mockDb.organization.findUnique.mockResolvedValue(null)
      mockTx.organization.create.mockResolvedValue({ id: 'org-1' })
      mockTx.user.create.mockResolvedValue({ id: 'user-1' })

      await service.registerNewOrganization('uid', 'a@b.com', {
        organizationName: 'Acme',
        organizationSlug: 'acme',
      })

      expect(mockTx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ displayName: null }),
        }),
      )
    })
  })

  describe('acceptInvite', () => {
    const validInvite = {
      id: 'invite-1',
      token: 'tok-abc',
      email: 'bob@acme.com',
      role: 'VIEWER',
      organizationId: 'org-1',
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 86400_000), // 1 day from now
    }

    it('creates user and marks invite as accepted', async () => {
      mockDb.invite.findUnique.mockResolvedValue(validInvite)
      mockDb.user.findUnique.mockResolvedValue(null)
      const newUser = { id: 'user-2', email: 'bob@acme.com', role: 'VIEWER' }
      mockTx.user.create.mockResolvedValue(newUser)
      mockTx.invite.update.mockResolvedValue({})

      const result = await service.acceptInvite('firebase-uid-2', 'bob@acme.com', {
        token: 'tok-abc',
        displayName: 'Bob',
      })

      expect(result).toEqual(newUser)
      expect(mockTx.invite.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'invite-1' },
          data: expect.objectContaining({ acceptedAt: expect.any(Date) }),
        }),
      )
    })

    it('throws NotFoundException when invite token not found', async () => {
      mockDb.invite.findUnique.mockResolvedValue(null)

      await expect(
        service.acceptInvite('uid', 'bob@acme.com', { token: 'bad-token' }),
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when invite already used', async () => {
      mockDb.invite.findUnique.mockResolvedValue({ ...validInvite, acceptedAt: new Date() })

      await expect(
        service.acceptInvite('uid', 'bob@acme.com', { token: 'tok-abc' }),
      ).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when invite has expired', async () => {
      mockDb.invite.findUnique.mockResolvedValue({
        ...validInvite,
        expiresAt: new Date(Date.now() - 1000),
      })

      await expect(
        service.acceptInvite('uid', 'bob@acme.com', { token: 'tok-abc' }),
      ).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when invite email does not match', async () => {
      mockDb.invite.findUnique.mockResolvedValue(validInvite)

      await expect(
        service.acceptInvite('uid', 'other@acme.com', { token: 'tok-abc' }),
      ).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when Firebase UID already registered', async () => {
      mockDb.invite.findUnique.mockResolvedValue(validInvite)
      mockDb.user.findUnique.mockResolvedValue({ id: 'existing' })

      await expect(
        service.acceptInvite('uid', 'bob@acme.com', { token: 'tok-abc' }),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('getMe', () => {
    it('returns user with organization when found', async () => {
      const user = { id: 'user-1', email: 'a@b.com', organization: { id: 'org-1', name: 'Acme', slug: 'acme' } }
      mockDb.user.findUnique.mockResolvedValue(user)

      const result = await service.getMe('user-1')

      expect(result).toEqual(user)
      expect(mockDb.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { organization: true },
      })
    })

    it('throws NotFoundException when user not found', async () => {
      mockDb.user.findUnique.mockResolvedValue(null)

      await expect(service.getMe('nonexistent')).rejects.toThrow(NotFoundException)
    })
  })
})
