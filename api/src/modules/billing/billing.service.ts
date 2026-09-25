import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, PaymentMethod, Prisma } from '@prisma/client';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { AssignTariffDto } from './dto/assign-tariff.dto';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { UpsertTariffDto } from './dto/upsert-tariff.dto';

function invoiceStatusFrom(total: number, paid: number, dueDate: Date): InvoiceStatus {
  if (paid <= 0) return dueDate < new Date() ? InvoiceStatus.OVERDUE : InvoiceStatus.UNPAID;
  if (paid < total) return InvoiceStatus.PARTIAL;
  return InvoiceStatus.PAID;
}

@Injectable()
export class BillingService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // ---------- Tariflar ----------
  tariffs() {
    return this.tenantPrisma.client.tariff.findMany({ orderBy: { name: 'asc' } });
  }

  createTariff(dto: UpsertTariffDto) {
    return this.tenantPrisma.client.tariff.create({ data: { ...dto, tenantId: this.tenantPrisma.tenantId! } });
  }

  updateTariff(id: string, dto: Partial<UpsertTariffDto>) {
    return this.tenantPrisma.client.tariff.update({ where: { id }, data: dto });
  }

  removeTariff(id: string) {
    return this.tenantPrisma.client.tariff.update({ where: { id }, data: { isActive: false } });
  }

  assignTariff(childId: string, dto: AssignTariffDto) {
    return this.tenantPrisma.client.childTariff.create({
      data: { childId, tariffId: dto.tariffId, customAmount: dto.customAmount, discountPct: dto.discountPct ?? 0, discountNote: dto.discountNote, validFrom: new Date(dto.validFrom) },
    });
  }

  // ---------- Hisob-fakturalar ----------
  invoices(filters: { status?: InvoiceStatus; period?: string; childId?: string }) {
    return this.tenantPrisma.client.invoice.findMany({
      where: filters,
      include: { child: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async generateInvoices(dto: GenerateInvoicesDto) {
    const [year, month] = dto.period.split('-').map(Number);
    const dueDate = new Date(Date.UTC(year, month - 1, 10));

    const children = await this.tenantPrisma.client.child.findMany({
      where: {
        status: 'ACTIVE',
        groupId: dto.groupId,
        id: dto.childIds ? { in: dto.childIds } : undefined,
      },
      include: {
        childTariffs: { orderBy: { validFrom: 'desc' }, take: 1, include: { tariff: true } },
      },
    });

    const created = [];
    for (const child of children) {
      const activeTariff = child.childTariffs[0];
      if (!activeTariff) continue;

      const existing = await this.tenantPrisma.client.invoice.findFirst({
        where: { childId: child.id, period: dto.period },
      });
      if (existing) continue;

      const baseAmount = activeTariff.customAmount ?? activeTariff.tariff.monthlyAmount;
      const discount = (Number(baseAmount) * (activeTariff.discountPct ?? 0)) / 100;
      const totalAmount = Number(baseAmount) - discount;
      const count = await this.tenantPrisma.client.invoice.count();
      const number = `INV-${year}-${String(count + 1).padStart(4, '0')}`;

      const invoice = await this.tenantPrisma.client.invoice.create({
        data: {
          tenantId: this.tenantPrisma.tenantId!,
          childId: child.id,
          number,
          period: dto.period,
          baseAmount,
          discount,
          totalAmount,
          dueDate,
          status: InvoiceStatus.UNPAID,
        },
      });
      created.push(invoice);
    }
    return { created: created.length, invoices: created };
  }

  async cancelInvoice(id: string) {
    const invoice = await this.tenantPrisma.client.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException("Hisob-faktura topilmadi");
    return this.tenantPrisma.client.invoice.update({ where: { id }, data: { status: InvoiceStatus.CANCELLED } });
  }

  // ---------- To'lovlar ----------
  payments(filters: { from?: string; to?: string; method?: PaymentMethod }) {
    const where: Prisma.PaymentWhereInput = {
      method: filters.method,
      paidAt: filters.from || filters.to ? { gte: filters.from ? new Date(filters.from) : undefined, lte: filters.to ? new Date(filters.to) : undefined } : undefined,
    };
    return this.tenantPrisma.client.payment.findMany({
      where,
      include: { child: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { paidAt: 'desc' },
    });
  }

  async recordPayment(dto: RecordPaymentDto, receivedById: string) {
    const amount = Number(dto.amount);
    if (amount <= 0) throw new BadRequestException("Summani to'g'ri kiriting");

    // invoiceId ko'rsatilmagan bo'lsa — bolaning eng eski to'lanmagan hisob-fakturasiga
    // avtomatik biriktiramiz (naqd to'lovni tez kiritish ssenariysi uchun qulaylik).
    let invoiceId = dto.invoiceId;
    if (!invoiceId) {
      const oldestUnpaid = await this.tenantPrisma.client.invoice.findFirst({
        where: { childId: dto.childId, status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE] } },
        orderBy: { dueDate: 'asc' },
      });
      invoiceId = oldestUnpaid?.id;
    }

    const payment = await this.tenantPrisma.client.payment.create({
      data: {
        tenantId: this.tenantPrisma.tenantId!,
        childId: dto.childId,
        invoiceId,
        amount: dto.amount,
        method: dto.method,
        note: dto.note,
        receivedById,
        status: 'COMPLETED',
      },
    });

    if (invoiceId) {
      const invoice = await this.tenantPrisma.client.invoice.findUnique({ where: { id: invoiceId } });
      if (invoice) {
        const paidAmount = Number(invoice.paidAmount) + amount;
        await this.tenantPrisma.client.invoice.update({
          where: { id: invoiceId },
          data: { paidAmount, status: invoiceStatusFrom(Number(invoice.totalAmount), paidAmount, invoice.dueDate) },
        });
      }
    }
    return payment;
  }

  // ---------- Qarzdorlar ----------
  private annotateDebt<T extends { totalAmount: unknown; paidAmount: unknown; dueDate: Date }>(inv: T) {
    const now = Date.now();
    return {
      ...inv,
      remaining: Number(inv.totalAmount) - Number(inv.paidAmount),
      daysOverdue: Math.max(0, Math.floor((now - inv.dueDate.getTime()) / 86400000)),
    };
  }

  async debts(groupId?: string) {
    const invoices = await this.tenantPrisma.client.invoice.findMany({
      where: {
        status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE] },
        child: groupId ? { groupId } : undefined,
      },
      include: { child: { select: { id: true, firstName: true, lastName: true, groupId: true } } },
      orderBy: { dueDate: 'asc' },
    });
    return invoices.map((inv) => this.annotateDebt(inv));
  }

  async debtsForChildren(childIds: string[]) {
    if (childIds.length === 0) return [];
    const invoices = await this.tenantPrisma.client.invoice.findMany({
      where: {
        childId: { in: childIds },
        status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE] },
      },
      include: { child: { select: { id: true, firstName: true, lastName: true, groupId: true } } },
      orderBy: { dueDate: 'asc' },
    });
    return invoices.map((inv) => this.annotateDebt(inv));
  }
}
