import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { ALL_ROLES, Role } from '../auth/role.enum.js';
import { Roles } from '../auth/roles.decorator.js';
import { SoatoService } from './soato.service.js';

@ApiTags('soato')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Rol',
  enum: Role,
  required: false,
  description: "Bearer token bo'lmasa",
})
@Controller('soato')
export class SoatoController {
  constructor(private readonly soato: SoatoService) {}

  @Get()
  @Roles(ALL_ROLES)
  /** Wire shape of the task spec: [{kod, nomi}]. */
  list() {
    return this.soato.list().map((r) => ({ kod: r.code, nomi: r.name }));
  }
}
