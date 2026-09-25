import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RESOURCE_OWNERSHIP_KEY, ResourceOwnershipOptions } from '../decorators/resource-ownership.decorator';
import { AuthenticatedUser } from '../types/authenticated-user.interface';

/**
 * @CheckOwnership() bilan belgilangan endpointlarda:
 *  - TEACHER: faqat o'ziga biriktirilgan guruhga tegishli resursga kirishi mumkin
 *             (child.groupId ∈ user.assignedGroupIds)
 *  - PARENT:  faqat o'z bolasiga tegishli resursga kirishi mumkin
 *             (child.id ∈ user.guardianOfChildIds)
 * Boshqa rollar (OWNER, ADMIN, NURSE, COOK, SUPER_ADMIN) tekshiruvsiz o'tadi —
 * ularning cheklovi RolesGuard va servis darajasida hal qilinadi.
 */
@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<ResourceOwnershipOptions>(RESOURCE_OWNERSHIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;
    if (!user || user.role === Role.SUPER_ADMIN) {
      return true;
    }

    const paramName = options.param ?? 'id';
    const resourceId: string | undefined = request.params?.[paramName] ?? request.body?.[paramName];
    if (!resourceId) {
      return true;
    }

    if (user.role === Role.PARENT) {
      const childId = options.type === 'child' ? resourceId : undefined;
      if (childId && !(user.guardianOfChildIds ?? []).includes(childId)) {
        throw new ForbiddenException('Bu ma\'lumot sizga tegishli emas');
      }
      return true;
    }

    if (user.role === Role.TEACHER) {
      const assignedGroupIds = user.assignedGroupIds ?? [];
      if (options.type === 'group') {
        if (!assignedGroupIds.includes(resourceId)) {
          throw new ForbiddenException('Bu guruh sizga biriktirilmagan');
        }
        return true;
      }
      if (options.type === 'child') {
        const child = await this.prisma.child.findUnique({
          where: { id: resourceId },
          select: { groupId: true },
        });
        if (!child?.groupId || !assignedGroupIds.includes(child.groupId)) {
          throw new ForbiddenException('Bu bola sizning guruhingizga tegishli emas');
        }
        return true;
      }
    }

    return true;
  }
}
