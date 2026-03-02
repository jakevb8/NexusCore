import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  Version,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger'
import { IsString, IsOptional, IsEnum, IsNumberString } from 'class-validator'
import { AssetsService } from './assets.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { Role, AssetStatus, CreateAssetDto, UpdateAssetDto } from '@nexus-core/shared'
import { User } from '@nexus-core/database'
import { parse } from 'csv-parse/sync'

class AssetQueryDto {
  @IsOptional() @IsNumberString() page?: string
  @IsOptional() @IsNumberString() perPage?: string
  @IsOptional() @IsString() search?: string
}

class CreateAssetBody implements CreateAssetDto {
  @IsString() name!: string
  @IsString() sku!: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsEnum(AssetStatus) status?: AssetStatus
}

class UpdateAssetBody implements UpdateAssetDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsEnum(AssetStatus) status?: AssetStatus
  @IsOptional() @IsString() assignedTo?: string | null
}

@ApiTags('Assets')
@ApiBearerAuth()
@Controller({ path: 'assets', version: '1' })
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'List all assets for the current organization' })
  findAll(@CurrentUser() user: User, @Query() query: AssetQueryDto) {
    return this.assetsService.findAll(user.organizationId, {
      page: query.page ? parseInt(query.page) : 1,
      perPage: query.perPage ? parseInt(query.perPage) : 20,
      search: query.search,
    })
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.assetsService.findOne(id, user.organizationId)
  }

  @Post()
  @Roles(Role.ORG_MANAGER)
  @ApiOperation({ summary: 'Create a new asset (ORG_MANAGER+)' })
  create(@Body() body: CreateAssetBody, @CurrentUser() user: User) {
    return this.assetsService.create(body, user.organizationId, user.id)
  }

  @Put(':id')
  @Roles(Role.ORG_MANAGER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateAssetBody,
    @CurrentUser() user: User,
  ) {
    return this.assetsService.update(id, body, user.organizationId, user.id)
  }

  @Delete(':id')
  @Roles(Role.ORG_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.assetsService.remove(id, user.organizationId, user.id)
  }

  @Post('import/csv')
  @Roles(Role.ORG_MANAGER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk import assets from CSV' })
  async importCsv(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: User) {
    const records = parse(file.buffer.toString(), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as CreateAssetDto[]

    return this.assetsService.bulkImport(records, user.organizationId, user.id)
  }
}
