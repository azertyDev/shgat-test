import { Controller, Get } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { ALL_ROLES, Role } from '../common/auth/role.enum.js';
import { Roles } from '../common/auth/roles.decorator.js';
import { SoatoService } from './soato.service.js';

@ApiTags('soato')
@ApiHeader({ name: 'X-Rol', enum: Role, required: true })
@Controller('soato')
export class SoatoController {
  constructor(private readonly soato: SoatoService) {}

  @Get()
  @Roles(ALL_ROLES)
  list() {
    return this.soato.list();
  }
}
