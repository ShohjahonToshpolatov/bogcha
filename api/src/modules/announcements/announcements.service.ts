import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { UpsertAnnouncementDto } from './dto/upsert-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private scopeForUser(user: AuthenticatedUser): Prisma.AnnouncementWhereInput {
    if (user.role === Role.TEACHER) {
      return { OR: [{ groupId: null }, { groupId: { in: user.assignedGroupIds ?? [] } }] };
    }
    if (user.role === Role.PARENT) {
      return {
        OR: [
          { groupId: null },
          { group: { children: { some: { id: { in: user.guardianOfChildIds ?? [] } } } } },
        ],
      };
    }
    return {};
  }

  async findAll(user: AuthenticatedUser) {
    const announcements = await this.tenantPrisma.client.announcement.findMany({
      where: this.scopeForUser(user),
      include: {
        author: { select: { id: true, fullName: true } },
        group: { select: { id: true, name: true } },
        _count: { select: { reads: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { publishAt: 'desc' }],
    });
    return announcements;
  }

  create(dto: UpsertAnnouncementDto, authorId: string) {
    return this.tenantPrisma.client.announcement.create({
      data: {
        ...dto,
        authorId,
        tenantId: this.tenantPrisma.tenantId!,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  update(id: string, dto: Partial<UpsertAnnouncementDto>) {
    return this.tenantPrisma.client.announcement.update({
      where: { id },
      data: { ...dto, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined },
    });
  }

  remove(id: string) {
    return this.tenantPrisma.client.announcement.delete({ where: { id } });
  }

  async markRead(id: string, userId: string) {
    await this.tenantPrisma.client.announcementRead.upsert({
      where: { announcementId_userId: { announcementId: id, userId } },
      update: {},
      create: { announcementId: id, userId },
    });
  }

  readStats(id: string) {
    return this.tenantPrisma.client.announcementRead.findMany({
      where: { announcementId: id },
      include: { user: { select: { id: true, fullName: true } } },
    });
  }
}
