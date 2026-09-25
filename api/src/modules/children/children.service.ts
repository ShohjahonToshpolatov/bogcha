import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChildStatus, Prisma, Role } from '@prisma/client';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { ArchiveChildDto } from './dto/archive-child.dto';
import { CreateChildDto } from './dto/create-child.dto';
import { GuardianDto } from './dto/guardian.dto';
import { QueryChildrenDto } from './dto/query-children.dto';
import { UpdateChildDto } from './dto/update-child.dto';

const CHILD_LIST_INCLUDE = {
  group: { select: { id: true, name: true, colorHex: true } },
  guardians: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
  allergies: true,
} satisfies Prisma.ChildInclude;

@Injectable()
export class ChildrenService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  /** TEACHER faqat o'z guruhini, PARENT faqat o'z bolasini ko'radi. */
  private scopeForUser(user: AuthenticatedUser): Prisma.ChildWhereInput {
    if (user.role === Role.TEACHER) {
      return { groupId: { in: user.assignedGroupIds ?? [] } };
    }
    if (user.role === Role.PARENT) {
      return { id: { in: user.guardianOfChildIds ?? [] } };
    }
    return {};
  }

  async findAll(query: QueryChildrenDto, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ChildWhereInput = {
      AND: [
        this.scopeForUser(user),
        query.groupId ? { groupId: query.groupId } : {},
        query.status ? { status: query.status } : {},
        query.search
          ? {
              OR: [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    };

    const [items, total] = await Promise.all([
      this.tenantPrisma.client.child.findMany({
        where,
        include: CHILD_LIST_INCLUDE,
        orderBy: { firstName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.tenantPrisma.client.child.count({ where }),
    ]);

    return { data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const child = await this.tenantPrisma.client.child.findFirst({
      where: { id, ...this.scopeForUser(user) },
      include: {
        ...CHILD_LIST_INCLUDE,
        branch: { select: { id: true, name: true } },
        pickupPersons: true,
        childTariffs: { include: { tariff: true }, orderBy: { validFrom: 'desc' }, take: 1 },
      },
    });
    if (!child) throw new NotFoundException('Bola topilmadi');
    return child;
  }

  async timeline(id: string, user: AuthenticatedUser, from?: string, to?: string) {
    await this.findOne(id, user);
    const dateFilter = from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined;

    const [attendance, posts, health, meals] = await Promise.all([
      this.tenantPrisma.client.attendance.findMany({ where: { childId: id, date: dateFilter }, orderBy: { date: 'desc' } }),
      this.tenantPrisma.client.dailyPost.findMany({ where: { childId: id }, orderBy: { postedAt: 'desc' }, take: 50 }),
      this.tenantPrisma.client.healthRecord.findMany({ where: { childId: id }, orderBy: { occurredAt: 'desc' }, take: 50 }),
      this.tenantPrisma.client.mealLog.findMany({ where: { childId: id, date: dateFilter }, orderBy: { date: 'desc' } }),
    ]);

    return { attendance, posts, health, meals };
  }

  async create(dto: CreateChildDto) {
    return this.tenantPrisma.client.$transaction(async (tx) => {
      const child = await tx.child.create({
        data: {
          tenantId: this.tenantPrisma.tenantId!,
          firstName: dto.firstName,
          lastName: dto.lastName,
          middleName: dto.middleName,
          birthDate: new Date(dto.birthDate),
          gender: dto.gender,
          branchId: dto.branchId,
          groupId: dto.groupId,
          address: dto.address,
          birthCertNo: dto.birthCertNo,
          bloodType: dto.bloodType,
          specialNotes: dto.specialNotes,
          enrolledAt: dto.enrolledAt ? new Date(dto.enrolledAt) : new Date(),
        },
      });

      for (const guardian of dto.guardians ?? []) {
        await this.linkGuardian(tx, child.id, guardian, this.tenantPrisma.tenantId!);
      }

      return child;
    });
  }

  async update(id: string, dto: UpdateChildDto) {
    await this.assertExists(id);
    return this.tenantPrisma.client.child.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        enrolledAt: dto.enrolledAt ? new Date(dto.enrolledAt) : undefined,
      },
    });
  }

  async archive(id: string, dto: ArchiveChildDto) {
    await this.assertExists(id);
    return this.tenantPrisma.client.child.update({
      where: { id },
      data: { status: ChildStatus.LEFT, leftAt: new Date(), leftReason: dto.reason },
    });
  }

  async addGuardian(childId: string, dto: GuardianDto) {
    await this.assertExists(childId);
    return this.tenantPrisma.client.$transaction((tx) =>
      this.linkGuardian(tx, childId, dto, this.tenantPrisma.tenantId!),
    );
  }

  async removeGuardian(childId: string, guardianId: string) {
    await this.tenantPrisma.client.guardian.deleteMany({ where: { id: guardianId, childId } });
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.tenantPrisma.client.child.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Bola topilmadi');
  }

  private async linkGuardian(
    tx: Prisma.TransactionClient,
    childId: string,
    guardian: GuardianDto,
    tenantId: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant aniqlanmadi');

    let user = await tx.user.findUnique({
      where: { tenantId_phone: { tenantId, phone: guardian.phone } },
    });
    if (!user) {
      user = await tx.user.create({
        data: { tenantId, phone: guardian.phone, fullName: guardian.fullName, role: Role.PARENT },
      });
    }

    return tx.guardian.upsert({
      where: { childId_userId: { childId, userId: user.id } },
      update: {
        relation: guardian.relation,
        isPrimary: guardian.isPrimary ?? false,
        canPickup: guardian.canPickup ?? true,
        canPay: guardian.canPay ?? true,
      },
      create: {
        childId,
        userId: user.id,
        relation: guardian.relation,
        isPrimary: guardian.isPrimary ?? false,
        canPickup: guardian.canPickup ?? true,
        canPay: guardian.canPay ?? true,
      },
    });
  }
}
