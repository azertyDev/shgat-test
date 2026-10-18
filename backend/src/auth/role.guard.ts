import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { apiError } from '../common/errors/api-error.js';
import { AuthService } from './auth.service.js';
import type { Role } from './role.enum.js';
import { Roles } from './roles.decorator.js';

/**
 * Role check. A Bearer token (POST /api/auth/token) wins; without one the X-Rol header of the task spec
 * (section 5) is used, so the API contract keeps working.
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const allowed = this.reflector.get(Roles, ctx.getHandler());
    if (!allowed) return true;
    const role = await this.resolveRole(
      ctx.switchToHttp().getRequest<Request>(),
    );
    if (!role)
      throw apiError(
        HttpStatus.FORBIDDEN,
        'Bearer token yoki X-Rol sarlavhasi kerak: ariza_beruvchi yoki tekshiruvchi',
      );
    if (!allowed.includes(role as Role))
      throw apiError(
        HttpStatus.FORBIDDEN,
        `Bu amal faqat ${allowed.join(', ')} uchun`,
      );
    return true;
  }

  private async resolveRole(req: Request): Promise<string | undefined> {
    const authorization = req.header('authorization');
    if (authorization) {
      const [scheme, token] = authorization.split(' ');
      if (scheme?.toLowerCase() !== 'bearer' || !token)
        throw apiError(
          HttpStatus.UNAUTHORIZED,
          "Authorization sarlavhasi 'Bearer <token>' ko'rinishida bo'lishi kerak",
        );
      return this.auth.roleFromToken(token);
    }
    return req.header('x-rol');
  }
}
