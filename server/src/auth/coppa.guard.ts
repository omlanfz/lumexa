import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CoppaGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const role = request.user?.role;

    // Only PARENT role requires COPPA consent check
    if (role !== 'PARENT') return true;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { coppaConsentAt: true },
    });

    if (!user?.coppaConsentAt) {
      throw new ForbiddenException(
        'Parental consent required before accessing this resource. Please complete COPPA verification.',
      );
    }

    return true;
  }
}
