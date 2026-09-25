import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.interface';

export interface JwtPayload {
  sub: string; // userId
  tenantId: string | null;
  role: Role;
  phone: string;
  fullName: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        status: true,
        role: true,
        tenantId: true,
        phone: true,
        fullName: true,
        groupTeacherLinks: { select: { groupId: true } },
        guardianLinks: { select: { childId: true } },
      },
    });

    if (!user || user.status === 'BLOCKED') {
      throw new UnauthorizedException("Hisob bloklangan yoki topilmadi");
    }

    return {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      phone: user.phone,
      fullName: user.fullName,
      assignedGroupIds: user.groupTeacherLinks.map((g) => g.groupId),
      guardianOfChildIds: user.guardianLinks.map((g) => g.childId),
    };
  }
}
