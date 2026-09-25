import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants/current')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  current() {
    return this.tenants.current();
  }

  @Roles(Role.OWNER)
  @Patch()
  update(@Body() dto: UpdateTenantDto) {
    return this.tenants.update(dto);
  }
}
