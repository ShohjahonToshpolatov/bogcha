import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { CopyWeekDto, UpsertMenuDayDto } from './dto/upsert-menu-day.dto';

@Injectable()
export class MenuService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  findAll(branchId: string, from: string, to: string) {
    return this.tenantPrisma.client.menuDay.findMany({
      where: { branchId, date: { gte: new Date(from), lte: new Date(to) } },
      orderBy: [{ date: 'asc' }, { mealType: 'asc' }],
    });
  }

  upsert(dto: UpsertMenuDayDto) {
    const dishes = dto.dishes as unknown as Prisma.InputJsonValue;
    return this.tenantPrisma.client.menuDay.upsert({
      where: { branchId_date_mealType: { branchId: dto.branchId, date: new Date(dto.date), mealType: dto.mealType } },
      update: { dishes },
      create: {
        tenantId: this.tenantPrisma.tenantId!,
        branchId: dto.branchId,
        date: new Date(dto.date),
        mealType: dto.mealType,
        dishes,
      },
    });
  }

  async copyWeek(dto: CopyWeekDto) {
    const from = new Date(dto.fromWeekStart);
    const to = new Date(dto.toWeekStart);
    const source = await this.tenantPrisma.client.menuDay.findMany({
      where: { branchId: dto.branchId, date: { gte: from, lt: new Date(from.getTime() + 7 * 86400000) } },
    });

    const dayOffset = Math.round((to.getTime() - from.getTime()) / 86400000);
    for (const item of source) {
      const newDate = new Date(item.date.getTime() + dayOffset * 86400000);
      const dishes = item.dishes as unknown as Prisma.InputJsonValue;
      await this.tenantPrisma.client.menuDay.upsert({
        where: { branchId_date_mealType: { branchId: dto.branchId, date: newDate, mealType: item.mealType } },
        update: { dishes },
        create: {
          tenantId: this.tenantPrisma.tenantId!,
          branchId: dto.branchId,
          date: newDate,
          mealType: item.mealType,
          dishes,
        },
      });
    }
    return { copied: source.length };
  }

  remove(id: string) {
    return this.tenantPrisma.client.menuDay.delete({ where: { id } });
  }
}
