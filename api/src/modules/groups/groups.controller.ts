import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { UpsertGroupDto } from './dto/upsert-group.dto';
import { GroupsService } from './groups.service';

@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  findAll(@Query('branchId') branchId?: string, @Query('isActive') isActive?: string) {
    return this.groups.findAll({
      branchId,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groups.findOne(id);
  }

  @Get(':id/summary')
  summary(@Param('id') id: string) {
    return this.groups.summary(id);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Post()
  create(@Body() dto: UpsertGroupDto) {
    return this.groups.create(dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<UpsertGroupDto>) {
    return this.groups.update(id, dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groups.remove(id);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Post(':id/teachers')
  assignTeacher(@Param('id') id: string, @Body() dto: AssignTeacherDto) {
    return this.groups.assignTeacher(id, dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Delete(':id/teachers/:userId')
  unassignTeacher(@Param('id') id: string, @Param('userId') userId: string) {
    return this.groups.unassignTeacher(id, userId);
  }
}
