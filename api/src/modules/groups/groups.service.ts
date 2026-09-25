import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceStatus } from '@prisma/client';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { UpsertGroupDto } from './dto/upsert-group.dto';

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

@Injectable()
export class GroupsService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  findAll(filters: { branchId?: string; isActive?: boolean }) {
    return this.tenantPrisma.client.group.findMany({
      where: {
        branchId: filters.branchId,
        isActive: filters.isActive,
      },
      include: {
        branch: { select: { id: true, name: true } },
        teachers: { include: { user: { select: { id: true, fullName: true, avatarUrl: true } } } },
        _count: { select: { children: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const group = await this.tenantPrisma.client.group.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        teachers: { include: { user: { select: { id: true, fullName: true, avatarUrl: true, phone: true } } } },
      },
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');
    return group;
  }

  async summary(id: string) {
    await this.findOne(id);
    const [childrenCount, presentToday, teachers] = await Promise.all([
      this.tenantPrisma.client.child.count({ where: { groupId: id, status: 'ACTIVE' } }),
      this.tenantPrisma.client.attendance.count({
        where: { groupId: id, date: todayDateOnly(), status: AttendanceStatus.PRESENT },
      }),
      this.tenantPrisma.client.groupTeacher.findMany({
        where: { groupId: id },
        include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
      }),
    ]);
    const group = await this.tenantPrisma.client.group.findUnique({ where: { id }, select: { capacity: true } });
    return { childrenCount, presentToday, teachers, capacity: group?.capacity ?? 0 };
  }

  create(dto: UpsertGroupDto) {
    return this.tenantPrisma.client.group.create({ data: { ...dto, tenantId: this.tenantPrisma.tenantId! } });
  }

  async update(id: string, dto: Partial<UpsertGroupDto>) {
    await this.findOne(id);
    return this.tenantPrisma.client.group.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.tenantPrisma.client.group.update({ where: { id }, data: { isActive: false, deletedAt: new Date() } });
  }

  async assignTeacher(groupId: string, dto: AssignTeacherDto) {
    await this.findOne(groupId);
    return this.tenantPrisma.client.groupTeacher.upsert({
      where: { groupId_userId: { groupId, userId: dto.userId } },
      update: { isMain: dto.isMain ?? false },
      create: { groupId, userId: dto.userId, isMain: dto.isMain ?? false },
    });
  }

  async unassignTeacher(groupId: string, userId: string) {
    await this.tenantPrisma.client.groupTeacher.deleteMany({ where: { groupId, userId } });
  }
}
