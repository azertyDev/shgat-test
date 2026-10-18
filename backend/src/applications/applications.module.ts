import { Module } from '@nestjs/common';
import { ArcgisService } from './arcgis.service.js';
import { ApplicationsController, SoatoController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';

@Module({
  controllers: [ApplicationsController, SoatoController],
  providers: [ApplicationsService, ArcgisService],
})
export class ApplicationsModule {}
