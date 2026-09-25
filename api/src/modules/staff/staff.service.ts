import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

const STAFF_ROLES: Role[] = [Role.ADMIN, Role.TEACHER, Role.NURSE, Role.COOK];

@Injectable()
export class StaffService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  findAll() {
    return this.tenantPrisma.client.user.findMany({
      where: { role: { in: STAFF_ROLES } },
      omit: { passwordHash: true, twoFactorSecret: true },
      include: {
        staffProfile: true,
        groupTeacherLinks: { include: { group: { select: { id: true, name: true } } } },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.tenantPrisma.client.user.findFirst({
      where: { id, role: { in: STAFF_ROLES } },
      omit: { passwordHash: true, twoFactorSecret: true },
      include: {
        staffProfile: true,
        groupTeacherLinks: { include: { group: { select: { id: true, name: true } } } },
      },
    });
    if (!user) throw new NotFoundException('Xodim topilmadi');
    return user;
  }

  async invite(dto: InviteStaffDto) {
    const tenantId = this.tenantPrisma.tenantId;
    if (!tenantId) throw new BadRequestException('Tenant aniqlanmadi');

    const existing = await this.tenantPrisma.client.user.findUnique({
      where: { tenantId_phone: { tenantId, phone: dto.phone } },
    });
    if (existing) throw new BadRequestException('Bu telefon raqam bilan foydalanuvchi allaqachon mavjud');

    const tempPassword = crypto.randomBytes(4).toString('hex');
    const passwordHash = await argon2.hash(tempPassword);

    const user = await this.tenantPrisma.client.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { phone: dto.phone, fullName: dto.fullName, role: dto.role, passwordHash, status: 'INVITED' },
      });

      if (dto.position) {
        await tx.staffProfile.create({
          data: { userId: created.id, position: dto.position, hireDate: new Date(), salaryAmount: 0 },
        });
      }

      if (dto.role === Role.TEACHER && dto.groupIds?.length) {
        await tx.groupTeacher.createMany({
          data: dto.groupIds.map((groupId) => ({ groupId, userId: created.id })),
        });
      }

      return created;
    });

    const { passwordHash: _passwordHash, twoFactorSecret: _twoFactorSecret, ...safeUser } = user;
    return { ...safeUser, tempPassword };
  }

  async update(id: string, dto: UpdateStaffDto) {
    const user = await this.findOne(id);
    return this.tenantPrisma.client.user.update({
      where: { id: user.id },
      omit: { passwordHash: true, twoFactorSecret: true },
      data: {
        fullName: dto.fullName,
        status: dto.status,
        staffProfile: dto.position || dto.salaryAmount
          ? {
              upsert: {
                update: { position: dto.position, salaryAmount: dto.salaryAmount },
                create: {
                  position: dto.position ?? 'Xodim',
                  hireDate: new Date(),
                  salaryAmount: dto.salaryAmount ?? 0,
                },
              },
            }
          : undefined,
      },
    });
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.tenantPrisma.client.user.update({ where: { id: user.id }, data: { status: 'BLOCKED' } });
  }

  async attendanceForMonth(userId: string, month: string) {
    const [year, mon] = month.split('-').map(Number);
    const from = new Date(Date.UTC(year, mon - 1, 1));
    const to = new Date(Date.UTC(year, mon, 0));
    return this.tenantPrisma.client.staffAttendance.findMany({
      where: { userId, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });
  }

  checkIn(userId: string) {
    const date = new Date(new Date().toDateString());
    return this.tenantPrisma.client.staffAttendance.upsert({
      where: { userId_date: { userId, date } },
      update: { checkIn: new Date() },
      create: { userId, date, checkIn: new Date() },
    });
  }

  checkOut(userId: string) {
    const date = new Date(new Date().toDateString());
    return this.tenantPrisma.client.staffAttendance.upsert({
      where: { userId_date: { userId, date } },
      update: { checkOut: new Date() },
      create: { userId, date, checkOut: new Date() },
    });
  }
}
