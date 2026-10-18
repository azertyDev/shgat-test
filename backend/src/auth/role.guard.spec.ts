import { HttpException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { Role } from './role.enum.js';
import { RoleGuard } from './role.guard.js';

const jwt = new JwtService({
  secret: 'test-secret',
  signOptions: { expiresIn: 60 },
});
const auth = new AuthService(jwt);

/** Guard with a handler that allows only `allowed` (undefined = public route). */
function check(
  headers: Record<string, string>,
  allowed: Role[] | null = [Role.REVIEWER],
) {
  const reflector = { get: () => allowed ?? undefined } as unknown as Reflector;
  const ctx = {
    getHandler: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) => headers[name.toLowerCase()],
      }),
    }),
  } as unknown as ExecutionContext;
  return new RoleGuard(reflector, auth).canActivate(ctx);
}

const status = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as HttpException).getStatus();
  }
  return 'allowed';
};

describe('RoleGuard', () => {
  it('allows a valid Bearer token with the right role', async () => {
    const token = await auth.issueToken(Role.REVIEWER);
    expect(await status(check({ authorization: `Bearer ${token}` }))).toBe(
      'allowed',
    );
  });

  it('forbids a valid token with another role (403)', async () => {
    const token = await auth.issueToken(Role.APPLICANT);
    expect(await status(check({ authorization: `Bearer ${token}` }))).toBe(403);
  });

  it('prefers the token over X-Rol', async () => {
    const token = await auth.issueToken(Role.APPLICANT);
    expect(
      await status(
        check({ authorization: `Bearer ${token}`, 'x-rol': Role.REVIEWER }),
      ),
    ).toBe(403);
  });

  it.each([
    [
      'a token with a wrong signature',
      async () =>
        `Bearer ${await new JwtService({ secret: 'x' }).signAsync({ rol: Role.REVIEWER })}`,
    ],
    [
      'an expired token',
      async () =>
        `Bearer ${await new JwtService({ secret: 'test-secret' }).signAsync({ rol: Role.REVIEWER, exp: Math.floor(Date.now() / 1000) - 5 })}`,
    ],
    ['a non-Bearer scheme', async () => 'Basic abc'],
    ['an empty Bearer', async () => 'Bearer'],
  ])('rejects %s with 401', async (_, header) => {
    expect(await status(check({ authorization: await header() }))).toBe(401);
  });

  it('falls back to the X-Rol header of the task spec', async () => {
    expect(await status(check({ 'x-rol': Role.REVIEWER }))).toBe('allowed');
    expect(await status(check({ 'x-rol': Role.APPLICANT }))).toBe(403);
    expect(await status(check({}))).toBe(403);
  });

  it('leaves public routes open', async () => {
    expect(await status(check({ authorization: 'garbage' }, null))).toBe(
      'allowed',
    );
  });
});
