import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { xato } from './api-error.js';

export const ROLLAR = ['ariza_beruvchi', 'tekshiruvchi'] as const;
export type Rol = (typeof ROLLAR)[number];

/** Endpoint uchun ruxsat etilgan rollar. Dekorator qo'yilmagan yo'l ochiq (masalan, fayl yuklab olish havolasi). */
export const Rollar = Reflector.createDecorator<readonly Rol[]>();

/** Soddalashtirilgan rol: X-Rol sarlavhasi (topshiriq 5-bo'lim). */
@Injectable()
export class RolGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const kerak = this.reflector.get(Rollar, ctx.getHandler());
    if (!kerak) return true;
    const rol = ctx.switchToHttp().getRequest<Request>().header('x-rol');
    if (!rol) throw xato(HttpStatus.FORBIDDEN, 'X-Rol sarlavhasi kerak: ariza_beruvchi yoki tekshiruvchi');
    if (!kerak.includes(rol as Rol)) throw xato(HttpStatus.FORBIDDEN, `Bu amal faqat ${kerak.join(', ')} uchun`);
    return true;
  }
}
