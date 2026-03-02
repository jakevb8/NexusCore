import { Controller, Get, Version } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ReportsService } from './reports.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { Role } from '@nexus-core/shared'
import { User } from '@nexus-core/database'

@ApiTags('Reports')
@ApiBearerAuth()
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get organization stats (cached 5 min)' })
  getOrgStats(@CurrentUser() user: User) {
    return this.reportsService.getOrgStats(user.organizationId)
  }

  @Get('system')
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Get system-wide stats (SUPERADMIN only)' })
  getSystemStats() {
    return this.reportsService.getSystemStats()
  }
}
