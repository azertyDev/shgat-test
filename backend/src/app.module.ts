import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ArizalarModule } from './applications/applications.module.js';
import { RolGuard } from './common/role.guard.js';

@Module({
  imports: [ArizalarModule],
  providers: [{ provide: APP_GUARD, useClass: RolGuard }],
})
export class AppModule {}
