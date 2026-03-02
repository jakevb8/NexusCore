import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaClient, Asset, AssetStatus } from '@nexus-core/database'
import { CreateAssetDto, UpdateAssetDto, PaginationParams } from '@nexus-core/shared'
import { AuditService } from '../audit/audit.service'

@Injectable()
export class AssetsService {
  constructor(
    @Inject('PRISMA') private readonly db: PrismaClient,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string, params: PaginationParams = {}) {
    const { page = 1, perPage = 20, search } = params
    const skip = (page - 1) * perPage

    const where = {
      organizationId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { sku: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      this.db.asset.findMany({ where, skip, take: perPage, orderBy: { createdAt: 'desc' } }),
      this.db.asset.count({ where }),
    ])

    return { data, meta: { total, page, perPage } }
  }

  async findOne(id: string, organizationId: string): Promise<Asset> {
    const asset = await this.db.asset.findFirst({ where: { id, organizationId } })
    if (!asset) throw new NotFoundException(`Asset ${id} not found`)
    return asset
  }

  async create(dto: CreateAssetDto, organizationId: string, actorId: string): Promise<Asset> {
    const existing = await this.db.asset.findUnique({ where: { sku: dto.sku } })
    if (existing) throw new ConflictException(`SKU "${dto.sku}" already exists`)

    const asset = await this.db.asset.create({
      data: { ...dto, organizationId },
    })

    await this.auditService.log({
      action: 'ASSET_CREATED',
      actorId,
      assetId: asset.id,
      changes: { before: null, after: asset },
    })

    return asset
  }

  async update(
    id: string,
    dto: UpdateAssetDto,
    organizationId: string,
    actorId: string,
  ): Promise<Asset> {
    const before = await this.findOne(id, organizationId)

    const after = await this.db.asset.update({
      where: { id },
      data: dto,
    })

    await this.auditService.log({
      action: 'ASSET_UPDATED',
      actorId,
      assetId: after.id,
      changes: { before, after },
    })

    return after
  }

  async remove(id: string, organizationId: string, actorId: string): Promise<void> {
    const asset = await this.findOne(id, organizationId)

    await this.auditService.log({
      action: 'ASSET_DELETED',
      actorId,
      assetId: asset.id,
      changes: { before: asset, after: null },
    })

    await this.db.asset.delete({ where: { id } })
  }

  async bulkImport(
    records: CreateAssetDto[],
    organizationId: string,
    actorId: string,
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (const record of records) {
      try {
        await this.create(record, organizationId, actorId)
        created++
      } catch (err: any) {
        if (err instanceof ConflictException) {
          skipped++
        } else {
          errors.push(`SKU ${record.sku}: ${err.message}`)
        }
      }
    }

    return { created, skipped, errors }
  }
}
