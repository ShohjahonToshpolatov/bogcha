import { ForbiddenException, Injectable } from '@nestjs/common';
import { AttendanceStatus, Prisma, Role } from '@prisma/client';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

function dateOnly(value: string | Date): Date {
  const d = new Date(value);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

@Injectable()
export class AttendanceService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private assertGroupAccess(groupId: string, user: AuthenticatedUser): void {
    if (user.role === Role.TEACHER && !(user.assignedGroupIds ?? []).includes(groupId)) {
      throw new ForbiddenException('Bu guruh sizga biriktirilmagan');
    }
  }

  /** Guruhning kunlik jadvali — barcha faol bolalar + ular uchun bugungi davomat yozuvi (bo'lsa). */
  async dailyByGroup(groupId: string, date: string, user: AuthenticatedUser) {
    this.assertGroupAccess(groupId, user);
    const day = dateOnly(date);

    const [children, attendances] = await Promise.all([
      this.tenantPrisma.client.child.findMany({
        where: { groupId, status: 'ACTIVE' },
        include: { allergies: true, group: { select: { id: true, name: true, colorHex: true } } },
        orderBy: { firstName: 'asc' },
      }),
      this.tenantPrisma.client.attendance.findMany({ where: { groupId, date: day } }),
    ]);

    const byChildId = new Map(attendances.map((a) => [a.childId, a]));
    return children.map((child) => ({ child, attendance: byChildId.get(child.id) ?? null }));
  }

  async checkIn(dto: CheckInDto, user: AuthenticatedUser) {
    const child = await this.tenantPrisma.client.child.findUniqueOrThrow({
      where: { id: dto.childId },
      select: { groupId: true },
    });
    if (child.groupId) this.assertGroupAccess(child.groupId, user);

    const date = dateOnly(new Date());
    return this.tenantPrisma.client.attendance.upsert({
      where: { childId_date: { childId: dto.childId, date } },
      update: {
        status: AttendanceStatus.PRESENT,
        checkInAt: new Date(),
        checkedInById: user.userId,
        temperature: dto.temperature,
        note: dto.note,
      },
      create: {
        tenantId: this.tenantPrisma.tenantId!,
        childId: dto.childId,
        groupId: child.groupId!,
        date,
        status: AttendanceStatus.PRESENT,
        checkInAt: new Date(),
        checkedInById: user.userId,
        temperature: dto.temperature,
        note: dto.note,
      },
    });
  }

  async checkOut(dto: CheckOutDto, user: AuthenticatedUser) {
    const date = dateOnly(new Date());
    return this.tenantPrisma.client.attendance.update({
      where: { childId_date: { childId: dto.childId, date } },
      data: { checkOutAt: new Date(), checkOutToId: dto.pickupPersonId, note: dto.note ?? undefined },
    });
  }

  async mark(dto: MarkAttendanceDto, user: AuthenticatedUser) {
    const child = await this.tenantPrisma.client.child.findUniqueOrThrow({
      where: { id: dto.childId },
      select: { groupId: true },
    });
    if (child.groupId) this.assertGroupAccess(child.groupId, user);

    const date = dateOnly(dto.date);
    return this.tenantPrisma.client.attendance.upsert({
      where: { childId_date: { childId: dto.childId, date } },
      update: { status: dto.status, absenceReason: dto.absenceReason, note: dto.note },
      create: {
        tenantId: this.tenantPrisma.tenantId!,
        childId: dto.childId,
        groupId: child.groupId!,
        date,
        status: dto.status,
        absenceReason: dto.absenceReason,
        note: dto.note,
      },
    });
  }

  /** Oflayn navbatdan kelgan amallar — clientRequestId orqali idempotent. */
  async bulk(dto: BulkAttendanceDto, user: AuthenticatedUser) {
    this.assertGroupAccess(dto.groupId, user);
    const date = dateOnly(dto.date);

    const results = [];
    for (const item of dto.items) {
      const already = await this.tenantPrisma.client.attendance.findUnique({
        where: { clientRequestId: item.clientRequestId },
      });
      if (already) {
        results.push(already);
        continue;
      }
      const record = await this.tenantPrisma.client.attendance.upsert({
        where: { childId_date: { childId: item.childId, date } },
        update: { status: item.status, clientRequestId: item.clientRequestId },
        create: {
          tenantId: this.tenantPrisma.tenantId!,
          childId: item.childId,
          groupId: dto.groupId,
          date,
          status: item.status,
          clientRequestId: item.clientRequestId,
        },
      });
      results.push(record);
    }
    return results;
  }

  async summary(groupId: string, from: string, to: string, user: AuthenticatedUser) {
    this.assertGroupAccess(groupId, user);
    const where: Prisma.AttendanceWhereInput = {
      groupId,
      date: { gte: dateOnly(from), lte: dateOnly(to) },
    };
    const records = await this.tenantPrisma.client.attendance.findMany({ where });
    const total = records.length;
    const present = records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    return { total, present, absent: total - present, percentage: total ? Math.round((present / total) * 100) : 0 };
  }

  async childCalendar(childId: string, month: string, user: AuthenticatedUser) {
    if (user.role === Role.PARENT && !(user.guardianOfChildIds ?? []).includes(childId)) {
      throw new ForbiddenException('Bu ma\'lumot sizga tegishli emas');
    }
    const [year, mon] = month.split('-').map(Number);
    const from = new Date(Date.UTC(year, mon - 1, 1));
    const to = new Date(Date.UTC(year, mon, 0));
    return this.tenantPrisma.client.attendance.findMany({
      where: { childId, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });
  }
}
