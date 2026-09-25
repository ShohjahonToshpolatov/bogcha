import { Injectable, NotFoundException } from '@nestjs/common';
import { WaitlistStatus } from '@prisma/client';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { UpsertWaitlistDto } from './dto/upsert-waitlist.dto';

@Injectable()
export class WaitlistService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  findAll(status?: WaitlistStatus) {
    return this.tenantPrisma.client.waitlist.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: UpsertWaitlistDto) {
    return this.tenantPrisma.client.waitlist.create({
      data: {
        ...dto,
        birthDate: new Date(dto.birthDate),
        desiredStart: new Date(dto.desiredStart),
        tenantId: this.tenantPrisma.tenantId!,
      },
    });
  }

  async update(id: string, dto: Partial<UpsertWaitlistDto>) {
    const exists = await this.tenantPrisma.client.waitlist.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Ariza topilmadi');
    return this.tenantPrisma.client.waitlist.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        desiredStart: dto.desiredStart ? new Date(dto.desiredStart) : undefined,
      },
    });
  }

  /** Arizani bola sifatida ro'yxatga o'tkazadi (bosqichma-bosqich CRM voronkasi). */
  async convert(id: string) {
    const item = await this.tenantPrisma.client.waitlist.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Ariza topilmadi');
    if (!item.branchId) throw new NotFoundException("Ariza uchun filial tanlanmagan");

    const [firstName, ...rest] = item.childName.split(' ');
    const child = await this.tenantPrisma.client.child.create({
      data: {
        tenantId: this.tenantPrisma.tenantId!,
        firstName: firstName || item.childName,
        lastName: rest.join(' ') || '-',
        birthDate: item.birthDate,
        gender: 'MALE',
        branchId: item.branchId,
        groupId: item.groupId,
        enrolledAt: item.desiredStart,
      },
    });

    await this.tenantPrisma.client.waitlist.update({
      where: { id },
      data: { status: WaitlistStatus.ENROLLED },
    });

    return child;
  }

  remove(id: string) {
    return this.tenantPrisma.client.waitlist.delete({ where: { id } });
  }
}
