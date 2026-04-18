import { Injectable, Inject } from '@nestjs/common'
import { PrismaClient } from '@nexus-core/database'

interface LogPayload {
  action: string
  actorId: string
  assetId?: string
  organizationId?: string
  changes: { before: unknown; after: unknown }
}

@Injectable()
export class AuditService {
  constructor(@Inject('PRISMA') private readonly db: PrismaClient) {}

  async log(payload: LogPayload) {
    return this.db.auditLog.create({
      data: {
        action: payload.action,
        actorId: payload.actorId,
        assetId: payload.assetId ?? null,
        organizationId: payload.organizationId ?? null,
        changes: payload.changes as any,
      },
    })
  }

  async findForAsset(assetId: string, organizationId: string) {
    // Verify the asset belongs to the org (security check)
    const asset = await this.db.asset.findFirst({ where: { id: assetId, organizationId } })
    if (!asset) return []

    return this.db.auditLog.findMany({
      where: { assetId },
      include: {
        actor: { select: { id: true, email: true, displayName: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    })
  }

  async findAll(organizationId: string, page = 1, perPage = 50) {
    const skip = (page - 1) * perPage

    // Scope to the org: either via an asset that belongs to the org (asset-level events)
    // or via the direct organizationId field (org-level events such as ORG_DELETED).
    const where = {
      OR: [{ asset: { organizationId } }, { organizationId }],
    }

    const [data, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, email: true, displayName: true } },
          asset: { select: { id: true, name: true, sku: true } },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: perPage,
      }),
      this.db.auditLog.count({ where }),
    ])

    return { data, meta: { total, page, perPage } }
  }
}
