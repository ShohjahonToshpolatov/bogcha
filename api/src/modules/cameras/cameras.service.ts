import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CameraStatus, Prisma, Role } from '@prisma/client';
import * as crypto from 'crypto';
import { decryptSecret, encryptSecret } from '../../common/utils/encryption.util';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { UpsertCameraDto } from './dto/upsert-camera.dto';

type DaySchedule = [string, string][];
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function isWithinSchedule(schedule: Record<string, DaySchedule> | null | undefined): boolean {
  if (!schedule) return true;
  const now = new Date();
  const dayKey = DAY_KEYS[now.getDay()];
  const ranges = schedule[dayKey];
  if (!ranges || ranges.length === 0) return false;
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  return ranges.some(([start, end]) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    return minutesNow >= startMin && minutesNow <= endMin;
  });
}

@Injectable()
export class CamerasService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async parentGroupIds(user: AuthenticatedUser): Promise<string[]> {
    const childIds = user.guardianOfChildIds ?? [];
    if (childIds.length === 0) return [];
    const children = await this.tenantPrisma.client.child.findMany({
      where: { id: { in: childIds }, groupId: { not: null } },
      select: { groupId: true },
    });
    return [...new Set(children.map((c) => c.groupId!))];
  }

  async findAll(user: AuthenticatedUser) {
    let where: Prisma.CameraWhereInput = {};
    if (user.role === Role.TEACHER) {
      where = { groupId: { in: user.assignedGroupIds ?? [] } };
    } else if (user.role === Role.PARENT) {
      const groupIds = await this.parentGroupIds(user);
      where = { groupId: { in: groupIds }, visibleToParents: true };
    }

    const cameras = await this.tenantPrisma.client.camera.findMany({
      where,
      include: { group: { select: { id: true, name: true, colorHex: true } }, branch: { select: { id: true, name: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    return cameras.map(({ rtspUrlEncrypted: _rtspUrlEncrypted, ...rest }) => rest);
  }

  async findOne(id: string) {
    const camera = await this.tenantPrisma.client.camera.findUnique({ where: { id } });
    if (!camera) throw new NotFoundException('Kamera topilmadi');
    return camera;
  }

  async create(dto: UpsertCameraDto) {
    const streamKey = crypto.randomBytes(12).toString('hex');
    const camera = await this.tenantPrisma.client.camera.create({
      data: {
        tenantId: this.tenantPrisma.tenantId!,
        branchId: dto.branchId,
        groupId: dto.groupId,
        name: dto.name,
        rtspUrlEncrypted: encryptSecret(dto.rtspUrl),
        streamKey,
        visibleToParents: dto.visibleToParents ?? false,
        schedule: dto.schedule ?? {},
        maxViewMinutes: dto.maxViewMinutes ?? 15,
      },
    });
    const { rtspUrlEncrypted: _rtspUrlEncrypted, ...safe } = camera;
    return safe;
  }

  async update(id: string, dto: Partial<UpsertCameraDto>) {
    await this.findOne(id);
    const camera = await this.tenantPrisma.client.camera.update({
      where: { id },
      data: {
        branchId: dto.branchId,
        groupId: dto.groupId,
        name: dto.name,
        rtspUrlEncrypted: dto.rtspUrl ? encryptSecret(dto.rtspUrl) : undefined,
        visibleToParents: dto.visibleToParents,
        schedule: dto.schedule,
        maxViewMinutes: dto.maxViewMinutes,
      },
    });
    const { rtspUrlEncrypted: _rtspUrlEncrypted, ...safe } = camera;
    return safe;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.tenantPrisma.client.camera.delete({ where: { id } });
  }

  async test(id: string) {
    const camera = await this.findOne(id);
    // Haqiqiy RTSP ulanishini tekshirish MediaMTX orqali amalga oshiriladi (deployment muhitida).
    decryptSecret(camera.rtspUrlEncrypted);
    return { reachable: camera.status !== CameraStatus.ERROR };
  }

  async createSession(cameraId: string, user: AuthenticatedUser, meta: { ipAddress?: string; userAgent?: string }) {
    const camera = await this.findOne(cameraId);

    if (user.role === Role.PARENT) {
      if (!camera.visibleToParents) {
        throw new ForbiddenException('Bu kamera ota-onalarga ochiq emas');
      }
      const groupIds = await this.parentGroupIds(user);
      if (!camera.groupId || !groupIds.includes(camera.groupId)) {
        throw new ForbiddenException("Bu kamera sizning farzandingiz guruhiga tegishli emas");
      }
      if (!isWithinSchedule(camera.schedule as Record<string, DaySchedule>)) {
        throw new ForbiddenException('Kamera hozir belgilangan jadval bo\'yicha yopiq');
      }
    } else if (user.role === Role.TEACHER) {
      if (!camera.groupId || !(user.assignedGroupIds ?? []).includes(camera.groupId)) {
        throw new ForbiddenException('Bu kamera sizning guruhingizga tegishli emas');
      }
    }

    const log = await this.tenantPrisma.client.cameraAccessLog.create({
      data: {
        tenantId: this.tenantPrisma.tenantId!,
        cameraId,
        userId: user.userId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    const token = this.jwt.sign(
      { cameraId, userId: user.userId, sessionId: log.id },
      { secret: this.config.get<string>('jwt.accessSecret'), expiresIn: '60s' },
    );

    return {
      sessionId: log.id,
      token,
      streamKey: camera.streamKey,
      hlsUrl: `${this.config.get<string>('mediamtx.hlsUrl')}/${camera.streamKey}/index.m3u8`,
      webrtcUrl: `${this.config.get<string>('mediamtx.webrtcUrl')}/${camera.streamKey}`,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      maxSeconds: camera.maxViewMinutes * 60,
    };
  }

  async heartbeat(cameraId: string, sessionId: string) {
    await this.tenantPrisma.client.cameraAccessLog.updateMany({
      where: { id: sessionId, cameraId, endedAt: null },
      data: {},
    });
    return { ok: true };
  }

  async endSession(cameraId: string, sessionId: string) {
    await this.tenantPrisma.client.cameraAccessLog.updateMany({
      where: { id: sessionId, cameraId, endedAt: null },
      data: { endedAt: new Date() },
    });
  }

  accessLogs(cameraId: string) {
    return this.tenantPrisma.client.cameraAccessLog.findMany({
      where: { cameraId },
      include: { user: { select: { id: true, fullName: true, role: true } } },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
  }
}
