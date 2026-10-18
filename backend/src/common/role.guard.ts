import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { apiError } from './api-error.js';

/** Values are the X-Rol header values fixed by the task spec. */
export enum Role {
  APPLICANT = 'ariza_beruvchi',
  REVIEWER = 'tekshiruvchi',
}

export const ALL_ROLES: readonly Role[] = Object.values(Role);

/** Roles allowed for an endpoint. Routes without it are public (e.g. the file download link). */
export const Roles = Reflector.createDecorator<readonly Role[]>();

/** Simplified role check by the X-Rol header (task spec, section 5). */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const allowed = this.reflector.get(Roles, ctx.getHandler());
    if (!allowed) return true;
    const role = ctx.switchToHttp().getRequest<Request>().header('x-rol');
    if (!role) throw apiError(HttpStatus.FORBIDDEN, 'X-Rol sarlavhasi kerak: ariza_beruvchi yoki tekshiruvchi');
    if (!allowed.includes(role as Role)) throw apiError(HttpStatus.FORBIDDEN, `Bu amal faqat ${allowed.join(', ')} uchun`);
    return true;
  }
}
