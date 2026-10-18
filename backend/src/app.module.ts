import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ArizalarModule } from './arizalar/arizalar.module.js';
import { RolGuard } from './common/rol.guard.js';

@Module({
  imports: [ArizalarModule],
  providers: [{ provide: APP_GUARD, useClass: RolGuard }],
})
export class AppModule {}
