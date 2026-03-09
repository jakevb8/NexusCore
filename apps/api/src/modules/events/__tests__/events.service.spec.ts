import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventsService } from '../events.service'

const mockDb = {
  kafkaEvent: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
}

describe('EventsService', () => {
  let service: EventsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new EventsService(mockDb as any)
  })

  describe('findAll', () => {
    it('returns paginated events scoped to organization', async () => {
      const events = [
        {
          id: 'evt-1',
          organizationId: 'org-1',
          assetId: 'asset-1',
          assetName: 'Laptop',
          previousStatus: 'AVAILABLE',
          newStatus: 'IN_USE',
          actorId: 'user-1',
          occurredAt: new Date(),
          createdAt: new Date(),
        },
      ]
      mockDb.kafkaEvent.findMany.mockResolvedValue(events)
      mockDb.kafkaEvent.count.mockResolvedValue(1)

      const result = await service.findAll('org-1', 1, 50)

      expect(result.data).toEqual(events)
      expect(result.meta).toEqual({ total: 1, page: 1, perPage: 50 })
      expect(mockDb.kafkaEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-1' },
          orderBy: { occurredAt: 'desc' },
          skip: 0,
          take: 50,
        }),
      )
    })

    it('returns empty list when org has no events', async () => {
      mockDb.kafkaEvent.findMany.mockResolvedValue([])
      mockDb.kafkaEvent.count.mockResolvedValue(0)

      const result = await service.findAll('org-1')

      expect(result.data).toEqual([])
      expect(result.meta.total).toBe(0)
    })

    it('calculates correct skip for page 2', async () => {
      mockDb.kafkaEvent.findMany.mockResolvedValue([])
      mockDb.kafkaEvent.count.mockResolvedValue(0)

      await service.findAll('org-1', 2, 25)

      expect(mockDb.kafkaEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 25, take: 25 }),
      )
    })

    it('does not return events from other organizations', async () => {
      mockDb.kafkaEvent.findMany.mockResolvedValue([])
      mockDb.kafkaEvent.count.mockResolvedValue(0)

      await service.findAll('org-2')

      expect(mockDb.kafkaEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-2' } }),
      )
    })
  })
})
