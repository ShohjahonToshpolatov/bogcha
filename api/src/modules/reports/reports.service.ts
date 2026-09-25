import { Injectable } from '@nestjs/common';
import { AttendanceStatus, InvoiceStatus } from '@prisma/client';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

@Injectable()
export class ReportsService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async dashboard() {
    const today = todayDateOnly();
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

    const [totalActive, presentToday, capacityAgg, monthPayments, debtInvoices, newWaitlist, staffCount, staffActive] =
      await Promise.all([
        this.tenantPrisma.client.child.count({ where: { status: 'ACTIVE' } }),
        this.tenantPrisma.client.attendance.count({ where: { date: today, status: AttendanceStatus.PRESENT } }),
        this.tenantPrisma.client.group.aggregate({ _sum: { capacity: true }, where: { isActive: true } }),
        this.tenantPrisma.client.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: monthStart }, status: 'COMPLETED' } }),
        this.tenantPrisma.client.invoice.findMany({
          where: { status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE] } },
          select: { totalAmount: true, paidAmount: true, childId: true },
        }),
        this.tenantPrisma.client.waitlist.count({ where: { status: 'NEW' } }),
        this.tenantPrisma.client.user.count({ where: { role: { in: ['ADMIN', 'TEACHER', 'NURSE', 'COOK'] } } }),
        this.tenantPrisma.client.user.count({ where: { role: { in: ['ADMIN', 'TEACHER', 'NURSE', 'COOK'] }, status: 'ACTIVE' } }),
      ]);

    const debtTotal = debtInvoices.reduce((sum, i) => sum + (Number(i.totalAmount) - Number(i.paidAmount)), 0);
    const debtChildCount = new Set(debtInvoices.map((i) => i.childId)).size;

    return {
      presentToday,
      totalActive,
      capacity: capacityAgg._sum.capacity ?? 0,
      monthRevenue: monthPayments._sum.amount ?? 0,
      debtTotal,
      debtChildCount,
      newWaitlist,
      staffCount,
      staffActive,
    };
  }

  async occupancy() {
    const groups = await this.tenantPrisma.client.group.findMany({
      where: { isActive: true },
      select: { id: true, name: true, capacity: true, _count: { select: { children: true } } },
    });
    return groups.map((g) => ({
      groupId: g.id,
      name: g.name,
      capacity: g.capacity,
      enrolled: g._count.children,
      percentage: g.capacity ? Math.round((g._count.children / g.capacity) * 100) : 0,
    }));
  }

  /** Oxirgi N kunlik davomat tendensiyasi — chiziqli grafik uchun. */
  async attendanceTrend(days: number) {
    const today = todayDateOnly();
    const from = new Date(today);
    from.setUTCDate(from.getUTCDate() - (days - 1));

    const records = await this.tenantPrisma.client.attendance.findMany({
      where: { date: { gte: from, lte: today } },
      select: { date: true, status: true },
    });

    const byDate = new Map<string, { present: number; absent: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setUTCDate(d.getUTCDate() + i);
      byDate.set(d.toISOString().slice(0, 10), { present: 0, absent: 0 });
    }
    for (const record of records) {
      const key = record.date.toISOString().slice(0, 10);
      const bucket = byDate.get(key);
      if (!bucket) continue;
      if (record.status === AttendanceStatus.PRESENT) bucket.present += 1;
      else bucket.absent += 1;
    }

    return Array.from(byDate.entries()).map(([date, counts]) => ({ date, ...counts }));
  }

  /** Faol bolalarning jinsi bo'yicha taqsimoti — donut grafik uchun. */
  async genderBreakdown() {
    const [male, female] = await Promise.all([
      this.tenantPrisma.client.child.count({ where: { status: 'ACTIVE', gender: 'MALE' } }),
      this.tenantPrisma.client.child.count({ where: { status: 'ACTIVE', gender: 'FEMALE' } }),
    ]);
    return { male, female };
  }

  async churn(from: string, to: string) {
    const children = await this.tenantPrisma.client.child.findMany({
      where: { status: 'LEFT', leftAt: { gte: new Date(from), lte: new Date(to) } },
      select: { id: true, firstName: true, lastName: true, leftAt: true, leftReason: true },
    });
    return children;
  }
}
