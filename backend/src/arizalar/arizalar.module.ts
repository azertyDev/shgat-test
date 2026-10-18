import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { ArcgisService } from './arcgis.service.js';
import { ArizalarController, SoatoController } from './arizalar.controller.js';
import { ArizalarService } from './arizalar.service.js';

@Module({
  controllers: [ArizalarController, SoatoController],
  providers: [ArizalarService, ArcgisService, PrismaService],
})
export class ArizalarModule {}
