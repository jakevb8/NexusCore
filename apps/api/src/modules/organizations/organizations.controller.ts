import { Controller, Get, Patch, Param, ParseUUIDPipe } from '@nestjs/common'
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

  @Get('pending')
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'List organizations awaiting approval (SUPERADMIN only)' })
  findPending() {
    return this.orgsService.findPending()
  }

  @Patch(':id/approve')
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Approve a pending organization (SUPERADMIN only)' })
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.approve(id)
  }

  @Patch(':id/reject')
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Reject a pending organization (SUPERADMIN only)' })
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.reject(id)
  }
}
