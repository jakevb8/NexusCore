import { Controller, Get, Param, Query, ParseUUIDPipe, Version } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AuditService } from './audit.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '@nexus-core/database'

@ApiTags('Audit')
@ApiBearerAuth()
@Controller({ path: 'audit', version: '1' })
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List all audit logs for the organization' })
  findAll(@CurrentUser() user: User, @Query('page') page?: string, @Query('perPage') perPage?: string) {
    return this.auditService.findAll(
      user.organizationId,
      page ? parseInt(page) : 1,
      perPage ? parseInt(perPage) : 50,
    )
  }

  @Get('asset/:assetId')
  @ApiOperation({ summary: 'Get audit history for a specific asset' })
  findForAsset(@Param('assetId', ParseUUIDPipe) assetId: string, @CurrentUser() user: User) {
    return this.auditService.findForAsset(assetId, user.organizationId)
  }
}
