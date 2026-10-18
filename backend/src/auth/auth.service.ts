import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { apiError } from '../common/errors/api-error.js';
import { ALL_ROLES, Role } from './role.enum.js';

/** JWT payload; `rol` holds the same value as the X-Rol header. */
export interface RoleTokenPayload {
  rol: Role;
}

export const isRole = (value: unknown): value is Role =>
  (ALL_ROLES as readonly unknown[]).includes(value);

/**
 * Role tokens. There are no users or passwords in the task, so a token is issued for a requested role:
 * it demonstrates signed, expiring credentials instead of a plain header, not real authentication.
 */
@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  issueToken(role: Role): Promise<string> {
    return this.jwt.signAsync({ rol: role } satisfies RoleTokenPayload);
  }

  /** Role from a Bearer token; an invalid, expired or role-less token is a 401. */
  async roleFromToken(token: string): Promise<Role> {
    let payload: Partial<RoleTokenPayload>;
    try {
      payload = await this.jwt.verifyAsync<RoleTokenPayload>(token);
    } catch {
      throw apiError(
        HttpStatus.UNAUTHORIZED,
        "Token yaroqsiz yoki muddati o'tgan",
      );
    }
    if (!isRole(payload.rol))
      throw apiError(HttpStatus.UNAUTHORIZED, "Tokenda rol yo'q");
    return payload.rol;
  }
}
