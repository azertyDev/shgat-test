import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { FieldValidationError } from '../common/errors/api-error.js';
import { ALL_ROLES } from '../common/auth/role.enum.js';
import { AuthService, isRole } from './auth.service.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Public: issues a token for the requested role (see AuthService). */
  @Post('token')
  @HttpCode(200)
  @ApiBody({
    schema: {
      type: 'object',
      required: ['rol'],
      properties: { rol: { type: 'string', enum: [...ALL_ROLES] } },
    },
  })
  async issueToken(@Body() body: unknown) {
    const role = (body as { rol?: unknown } | undefined)?.rol;
    if (!isRole(role))
      throw new FieldValidationError({
        rol: `Rollardan biri: ${ALL_ROLES.join(', ')}`,
      });
    return { token: await this.auth.issueToken(role) };
  }
}
