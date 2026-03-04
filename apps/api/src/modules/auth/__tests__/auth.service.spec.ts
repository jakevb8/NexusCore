import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from '../auth.service'
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common'

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

// Mock Firebase Admin app — verifyIdToken returns a decoded token
const mockVerifyIdToken = vi.fn()
const mockFirebaseApp = {
  auth: () => ({ verifyIdToken: mockVerifyIdToken }),
}

// Helpers
const VALID_TOKEN = 'valid-firebase-token'
const makeDecoded = (uid: string, email: string) => ({ uid, email })

describe('AuthService', () => {
  let service: AuthService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AuthService(mockDb as any, mockFirebaseApp as any)
  })

  describe('registerNewOrganization', () => {
    it('creates org and user in a transaction', async () => {
      mockVerifyIdToken.mockResolvedValue(makeDecoded('firebase-uid-1', 'admin@acme.com'))
      mockDb.user.findUnique.mockResolvedValue(null)
      mockDb.organization.findUnique.mockResolvedValue(null)

      const org = { id: 'org-1', name: 'Acme', slug: 'acme' }
      const user = { id: 'user-1', email: 'admin@acme.com', role: 'ORG_MANAGER' }
      mockTx.organization.create.mockResolvedValue(org)
      mockTx.user.create.mockResolvedValue(user)

      const result = await service.registerNewOrganization(VALID_TOKEN, {
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

    it('throws UnauthorizedException if Firebase token is invalid', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Token expired'))

      await expect(
        service.registerNewOrganization('bad-token', {
          organizationName: 'Acme',
          organizationSlug: 'acme',
        }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('throws ConflictException if Firebase UID already registered', async () => {
      mockVerifyIdToken.mockResolvedValue(makeDecoded('firebase-uid-1', 'admin@acme.com'))
      mockDb.user.findUnique.mockResolvedValue({ id: 'existing-user' })

      await expect(
        service.registerNewOrganization(VALID_TOKEN, {
          organizationName: 'Acme',
          organizationSlug: 'acme',
        }),
      ).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException if org slug is already taken', async () => {
      mockVerifyIdToken.mockResolvedValue(makeDecoded('firebase-uid-1', 'admin@acme.com'))
      mockDb.user.findUnique.mockResolvedValue(null)
      mockDb.organization.findUnique.mockResolvedValue({ id: 'org-existing' })

      await expect(
        service.registerNewOrganization(VALID_TOKEN, {
          organizationName: 'Acme',
          organizationSlug: 'taken-slug',
        }),
      ).rejects.toThrow(ConflictException)
    })

    it('sets displayName to null when not provided', async () => {
      mockVerifyIdToken.mockResolvedValue(makeDecoded('uid', 'a@b.com'))
      mockDb.user.findUnique.mockResolvedValue(null)
      mockDb.organization.findUnique.mockResolvedValue(null)
      mockTx.organization.create.mockResolvedValue({ id: 'org-1' })
      mockTx.user.create.mockResolvedValue({ id: 'user-1' })

      await service.registerNewOrganization(VALID_TOKEN, {
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
      mockVerifyIdToken.mockResolvedValue(makeDecoded('firebase-uid-2', 'bob@acme.com'))
      mockDb.invite.findUnique.mockResolvedValue(validInvite)
      mockDb.user.findUnique.mockResolvedValue(null)
      const newUser = { id: 'user-2', email: 'bob@acme.com', role: 'VIEWER' }
      mockTx.user.create.mockResolvedValue(newUser)
      mockTx.invite.update.mockResolvedValue({})

      const result = await service.acceptInvite(VALID_TOKEN, {
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

    it('throws UnauthorizedException if Firebase token is invalid', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Token expired'))

      await expect(service.acceptInvite('bad-token', { token: 'tok-abc' })).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('throws NotFoundException when invite token not found', async () => {
      mockVerifyIdToken.mockResolvedValue(makeDecoded('uid', 'bob@acme.com'))
      mockDb.invite.findUnique.mockResolvedValue(null)

      await expect(service.acceptInvite(VALID_TOKEN, { token: 'bad-token' })).rejects.toThrow(
        NotFoundException,
      )
    })

    it('throws ConflictException when invite already used', async () => {
      mockVerifyIdToken.mockResolvedValue(makeDecoded('uid', 'bob@acme.com'))
      mockDb.invite.findUnique.mockResolvedValue({ ...validInvite, acceptedAt: new Date() })

      await expect(service.acceptInvite(VALID_TOKEN, { token: 'tok-abc' })).rejects.toThrow(
        ConflictException,
      )
    })

    it('throws ConflictException when invite has expired', async () => {
      mockVerifyIdToken.mockResolvedValue(makeDecoded('uid', 'bob@acme.com'))
      mockDb.invite.findUnique.mockResolvedValue({
        ...validInvite,
        expiresAt: new Date(Date.now() - 1000),
      })

      await expect(service.acceptInvite(VALID_TOKEN, { token: 'tok-abc' })).rejects.toThrow(
        ConflictException,
      )
    })

    it('throws ConflictException when invite email does not match', async () => {
      mockVerifyIdToken.mockResolvedValue(makeDecoded('uid', 'other@acme.com'))
      mockDb.invite.findUnique.mockResolvedValue(validInvite)

      await expect(service.acceptInvite(VALID_TOKEN, { token: 'tok-abc' })).rejects.toThrow(
        ConflictException,
      )
    })

    it('throws ConflictException when Firebase UID already registered', async () => {
      mockVerifyIdToken.mockResolvedValue(makeDecoded('uid', 'bob@acme.com'))
      mockDb.invite.findUnique.mockResolvedValue(validInvite)
      mockDb.user.findUnique.mockResolvedValue({ id: 'existing' })

      await expect(service.acceptInvite(VALID_TOKEN, { token: 'tok-abc' })).rejects.toThrow(
        ConflictException,
      )
    })
  })

  describe('getMe', () => {
    it('returns user with organization when found', async () => {
      const user = {
        id: 'user-1',
        email: 'a@b.com',
        organization: { id: 'org-1', name: 'Acme', slug: 'acme' },
      }
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
