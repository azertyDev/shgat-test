import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { ArcgisService } from './arcgis.service.js';
import { ApplicationsController, SoatoController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';

@Module({
  controllers: [ApplicationsController, SoatoController],
  providers: [ApplicationsService, ArcgisService, PrismaService],
})
export class ApplicationsModule {}
