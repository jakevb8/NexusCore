import { Controller, Get, Version } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { OrganizationsService } from './organizations.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { Role } from '@nexus-core/shared'
import { User } from '@nexus-core/database'

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Get('me')
  @ApiOperation({ summary: "Get current user's organization" })
  getMyOrg(@CurrentUser() user: User) {
    return this.orgsService.findOne(user.organizationId)
  }

  @Get()
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'List all organizations (SUPERADMIN only)' })
  findAll() {
    return this.orgsService.findAll()
  }
}
