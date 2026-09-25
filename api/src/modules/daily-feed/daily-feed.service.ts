import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { CreatePostDto } from './dto/create-post.dto';
import { QueryFeedDto } from './dto/query-feed.dto';

@Injectable()
export class DailyFeedService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private scopeForUser(user: AuthenticatedUser): Prisma.DailyPostWhereInput {
    if (user.role === Role.TEACHER) {
      return { groupId: { in: user.assignedGroupIds ?? [] } };
    }
    if (user.role === Role.PARENT) {
      return {
        OR: [
          { childId: { in: user.guardianOfChildIds ?? [] } },
          { AND: [{ childId: null }, { group: { children: { some: { id: { in: user.guardianOfChildIds ?? [] } } } } }] },
        ],
      };
    }
    return {};
  }

  async findAll(query: QueryFeedDto, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.DailyPostWhereInput = {
      AND: [
        this.scopeForUser(user),
        query.groupId ? { groupId: query.groupId } : {},
        query.childId ? { childId: query.childId } : {},
      ],
    };

    const [items, total] = await Promise.all([
      this.tenantPrisma.client.dailyPost.findMany({
        where,
        include: {
          author: { select: { id: true, fullName: true, avatarUrl: true } },
          child: { select: { id: true, firstName: true, lastName: true } },
          group: { select: { id: true, name: true, colorHex: true } },
        },
        orderBy: { postedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.tenantPrisma.client.dailyPost.count({ where }),
    ]);

    const allMediaIds = [...new Set(items.flatMap((p) => p.mediaIds))];
    const media = allMediaIds.length
      ? await this.tenantPrisma.client.media.findMany({ where: { id: { in: allMediaIds } }, select: { id: true, url: true } })
      : [];
    const urlById = new Map(media.map((m) => [m.id, m.url]));

    const data = items.map((post) => ({
      ...post,
      mediaUrls: post.mediaIds.map((id) => urlById.get(id)).filter((url): url is string => !!url),
    }));

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  create(dto: CreatePostDto, authorId: string) {
    return this.tenantPrisma.client.dailyPost.create({
      data: { ...dto, authorId, tenantId: this.tenantPrisma.tenantId! },
    });
  }

  update(id: string, dto: Partial<CreatePostDto>) {
    return this.tenantPrisma.client.dailyPost.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.tenantPrisma.client.dailyPost.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
