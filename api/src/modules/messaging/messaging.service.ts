import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, ThreadType } from '@prisma/client';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { SendMessageDto } from './dto/send-message.dto';
import { StartThreadDto } from './dto/start-thread.dto';

@Injectable()
export class MessagingService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  /** Berilgan bola uchun ushbu foydalanuvchiga ruxsat berilgan "boshqa tomon" (o'qituvchi(lar) yoki ota-ona(lar)) ID larini topadi. */
  private async resolveCounterpartyIds(childId: string, user: AuthenticatedUser): Promise<string[]> {
    const client = this.tenantPrisma.client;

    if (user.role === Role.PARENT) {
      if (!(user.guardianOfChildIds ?? []).includes(childId)) {
        throw new ForbiddenException('Bu bolaga vasiylik huquqingiz yo\'q');
      }
      const child = await client.child.findUniqueOrThrow({ where: { id: childId } });
      if (!child.groupId) return [];
      const teachers = await client.user.findMany({
        where: { groupTeacherLinks: { some: { groupId: child.groupId } } },
        select: { id: true },
      });
      return teachers.map((t) => t.id);
    }

    // TEACHER / NURSE / COOK / OWNER / ADMIN
    const child = await client.child.findUniqueOrThrow({ where: { id: childId } });
    if (user.role === Role.TEACHER && !(user.assignedGroupIds ?? []).includes(child.groupId ?? '')) {
      throw new ForbiddenException('Bu guruhga biriktirilmagansiz');
    }
    const guardians = await client.user.findMany({
      where: { guardianLinks: { some: { childId } } },
      select: { id: true },
    });
    return guardians.map((g) => g.id);
  }

  async listThreads(user: AuthenticatedUser) {
    const threads = await this.tenantPrisma.client.thread.findMany({
      where: { participants: { some: { userId: user.userId } } },
      include: {
        child: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
        participants: { include: { user: { select: { id: true, fullName: true, avatarUrl: true, role: true } } } },
        messages: { orderBy: { sentAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return threads.map((t) => {
      const me = t.participants.find((p) => p.userId === user.userId);
      const others = t.participants.filter((p) => p.userId !== user.userId);
      const lastMessage = t.messages[0] ?? null;
      return {
        id: t.id,
        child: t.child,
        others: others.map((o) => ({ id: o.user.id, fullName: o.user.fullName, avatarUrl: o.user.avatarUrl, role: o.user.role })),
        lastMessage: lastMessage ? { body: lastMessage.body, sentAt: lastMessage.sentAt, senderId: lastMessage.senderId } : null,
        lastMessageAt: t.lastMessageAt,
        unread: lastMessage && lastMessage.senderId !== user.userId && (!me?.lastReadAt || lastMessage.sentAt > me.lastReadAt),
      };
    });
  }

  private async assertParticipant(threadId: string, userId: string) {
    const thread = await this.tenantPrisma.client.thread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Suhbat topilmadi');
    const participant = await this.tenantPrisma.client.threadParticipant.findUnique({
      where: { threadId_userId: { threadId, userId } },
    });
    if (!participant) throw new ForbiddenException('Bu suhbatga kirish huquqingiz yo\'q');
    return thread;
  }

  async getMessages(threadId: string, user: AuthenticatedUser, page = 1, limit = 50) {
    await this.assertParticipant(threadId, user.userId);
    const [items, total] = await Promise.all([
      this.tenantPrisma.client.message.findMany({
        where: { threadId, deletedAt: null },
        include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } },
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.tenantPrisma.client.message.count({ where: { threadId, deletedAt: null } }),
    ]);
    return { data: items.reverse(), meta: { page, limit, total } };
  }

  async startOrSend(dto: StartThreadDto, user: AuthenticatedUser) {
    const counterpartyIds = await this.resolveCounterpartyIds(dto.childId, user);
    if (counterpartyIds.length === 0) {
      throw new NotFoundException('Bu bola uchun suhbatdosh topilmadi (guruh yoki vasiy biriktirilmagan)');
    }

    let thread = await this.tenantPrisma.client.thread.findFirst({
      where: {
        childId: dto.childId,
        participants: { some: { userId: user.userId } },
      },
    });

    if (!thread) {
      const allParticipantIds = [...new Set([user.userId, ...counterpartyIds])];
      thread = await this.tenantPrisma.client.thread.create({
        data: {
          tenantId: this.tenantPrisma.tenantId!,
          type: ThreadType.DIRECT,
          childId: dto.childId,
          participants: { create: allParticipantIds.map((userId) => ({ userId })) },
        },
      });
    }

    return this.sendMessage(thread.id, { body: dto.body }, user);
  }

  async sendMessage(threadId: string, dto: SendMessageDto, user: AuthenticatedUser) {
    await this.assertParticipant(threadId, user.userId);
    const message = await this.tenantPrisma.client.message.create({
      data: {
        threadId,
        senderId: user.userId,
        body: dto.body,
        mediaIds: dto.mediaIds ?? [],
      },
      include: { sender: { select: { id: true, fullName: true, avatarUrl: true } } },
    });
    await this.tenantPrisma.client.thread.update({ where: { id: threadId }, data: { lastMessageAt: message.sentAt } });
    await this.tenantPrisma.client.threadParticipant.update({
      where: { threadId_userId: { threadId, userId: user.userId } },
      data: { lastReadAt: message.sentAt },
    });
    return message;
  }

  async markRead(threadId: string, user: AuthenticatedUser) {
    await this.assertParticipant(threadId, user.userId);
    await this.tenantPrisma.client.threadParticipant.update({
      where: { threadId_userId: { threadId, userId: user.userId } },
      data: { lastReadAt: new Date() },
    });
    return { success: true };
  }
}
