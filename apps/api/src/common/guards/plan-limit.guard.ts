import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';
import { SubscriptionsService } from '../../modules/subscriptions/subscriptions.service';

export const PLAN_LIMIT_KEY = 'planLimit';

export const UsePlanLimit = (limitKey: string) =>
  SetMetadata(PLAN_LIMIT_KEY, { limitKey });

@Injectable()
export class PlanLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.get<{ limitKey: string }>(
      PLAN_LIMIT_KEY,
      context.getHandler(),
    );
    if (!meta) return true;

    const request = context.switchToHttp().getRequest();
    const companyId =
      request.user?.companyId ||
      request.query?.companyId ||
      request.body?.companyId;
    if (!companyId) return true;

    const limits = await this.subscriptionsService.getPlanLimits(companyId);
    const limit = (limits as unknown as Record<string, unknown>)[meta.limitKey];

    if (typeof limit === 'boolean' && !limit) {
      throw new ForbiddenException(
        `Tu plan no permite esta funcionalidad. Actualizá tu plan.`,
      );
    }

    return true;
  }
}
