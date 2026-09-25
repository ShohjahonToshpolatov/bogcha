import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  current() {
    return this.tenantPrisma.client.tenant.findUnique({ where: { id: this.tenantPrisma.tenantId! } });
  }

  update(dto: UpdateTenantDto) {
    return this.tenantPrisma.client.tenant.update({
      where: { id: this.tenantPrisma.tenantId! },
      data: { ...dto, settings: dto.settings as unknown as Prisma.InputJsonValue },
    });
  }
}
