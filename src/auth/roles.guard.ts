import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import {
  Reflector,
} from '@nestjs/core';

import {
  UserRole,
} from '@prisma/client';

import {
  ROLES_KEY,
} from './decorators/roles.decorators';

interface RequestUser {
  user?: {
    id: string;
    companyId: string;
    role: UserRole;
  };
}

@Injectable()
export class RolesGuard
  implements CanActivate
{
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ) {
    const requiredRoles =
      this.reflector
        .getAllAndOverride<
          UserRole[]
        >(
          ROLES_KEY,
          [
            context.getHandler(),
            context.getClass(),
          ],
        );

    if (
      !requiredRoles ||
      requiredRoles.length === 0
    ) {
      return true;
    }

    const request =
      context
        .switchToHttp()
        .getRequest<RequestUser>();

    const userRole =
      request.user?.role;

    if (
      !userRole ||
      !requiredRoles.includes(
        userRole,
      )
    ) {
      throw new ForbiddenException(
        'Você não possui permissão para gerenciar usuários.',
      );
    }

    return true;
  }
}