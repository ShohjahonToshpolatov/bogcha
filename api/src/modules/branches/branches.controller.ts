import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { BranchesService } from './branches.service';
import { UpsertBranchDto } from './dto/upsert-branch.dto';

@ApiTags('branches')
@ApiBearerAuth()
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  findAll() {
    return this.branches.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branches.findOne(id);
  }

  @Roles(Role.OWNER)
  @Post()
  create(@Body() dto: UpsertBranchDto) {
    return this.branches.create(dto);
  }

  @Roles(Role.OWNER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<UpsertBranchDto>) {
    return this.branches.update(id, dto);
  }

  @Roles(Role.OWNER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.branches.remove(id);
  }
}
