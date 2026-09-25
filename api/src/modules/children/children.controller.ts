import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CheckOwnership } from '../../common/decorators/resource-ownership.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { ChildrenService } from './children.service';
import { ArchiveChildDto } from './dto/archive-child.dto';
import { CreateChildDto } from './dto/create-child.dto';
import { GuardianDto } from './dto/guardian.dto';
import { QueryChildrenDto } from './dto/query-children.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@ApiTags('children')
@ApiBearerAuth()
@Controller('children')
export class ChildrenController {
  constructor(private readonly children: ChildrenService) {}

  @Get()
  findAll(@Query() query: QueryChildrenDto, @CurrentUser() user: AuthenticatedUser) {
    return this.children.findAll(query, user);
  }

  @CheckOwnership({ type: 'child' })
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.children.findOne(id, user);
  }

  @CheckOwnership({ type: 'child' })
  @Get(':id/timeline')
  timeline(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.children.timeline(id, user, from, to);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Post()
  create(@Body() dto: CreateChildDto) {
    return this.children.create(dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateChildDto) {
    return this.children.update(id, dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Post(':id/archive')
  archive(@Param('id') id: string, @Body() dto: ArchiveChildDto) {
    return this.children.archive(id, dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Post(':id/guardians')
  addGuardian(@Param('id') id: string, @Body() dto: GuardianDto) {
    return this.children.addGuardian(id, dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Delete(':id/guardians/:guardianId')
  removeGuardian(@Param('id') id: string, @Param('guardianId') guardianId: string) {
    return this.children.removeGuardian(id, guardianId);
  }
}
