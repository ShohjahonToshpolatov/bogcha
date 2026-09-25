import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { UpsertBranchDto } from './dto/upsert-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  findAll() {
    return this.tenantPrisma.client.branch.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const branch = await this.tenantPrisma.client.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Filial topilmadi');
    return branch;
  }

  create(dto: UpsertBranchDto) {
    return this.tenantPrisma.client.branch.create({ data: { ...dto, tenantId: this.tenantPrisma.tenantId! } });
  }

  async update(id: string, dto: Partial<UpsertBranchDto>) {
    await this.findOne(id);
    return this.tenantPrisma.client.branch.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.tenantPrisma.client.branch.update({ where: { id }, data: { isActive: false, deletedAt: new Date() } });
  }
}
