import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ApplicationsModule } from './applications/applications.module.js';
import { RoleGuard } from './common/role.guard.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, ApplicationsModule],
  providers: [{ provide: APP_GUARD, useClass: RoleGuard }],
})
export class AppModule {}
