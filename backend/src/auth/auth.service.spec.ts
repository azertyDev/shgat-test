import { HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from './role.enum.js';
import { AuthService } from './auth.service.js';

const SECRET = 'test-secret';
const service = new AuthService(
  new JwtService({ secret: SECRET, signOptions: { expiresIn: 60 } }),
);

const status = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as HttpException).getStatus();
  }
  throw new Error('expected an error');
};

describe('AuthService', () => {
  it('issues a token whose role can be read back', async () => {
    const token = await service.issueToken(Role.REVIEWER);
    await expect(service.roleFromToken(token)).resolves.toBe(Role.REVIEWER);
  });

  it('rejects a token signed with another secret (401)', async () => {
    const foreign = await new JwtService({ secret: 'other' }).signAsync({
      rol: Role.REVIEWER,
    });
    expect(await status(service.roleFromToken(foreign))).toBe(401);
  });

  it('rejects an expired token (401)', async () => {
    const expired = await new JwtService({ secret: SECRET }).signAsync({
      rol: Role.REVIEWER,
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    expect(await status(service.roleFromToken(expired))).toBe(401);
  });

  it('rejects a token without a known role (401)', async () => {
    const roleless = await new JwtService({ secret: SECRET }).signAsync({
      rol: 'admin',
    });
    expect(await status(service.roleFromToken(roleless))).toBe(401);
    expect(await status(service.roleFromToken('not.a.jwt'))).toBe(401);
  });
});
