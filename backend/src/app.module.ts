import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ArizalarModule } from './applications/applications.module.js';
import { RoleGuard } from './common/role.guard.js';

@Module({
  imports: [ArizalarModule],
  providers: [{ provide: APP_GUARD, useClass: RoleGuard }],
})
export class AppModule {}
