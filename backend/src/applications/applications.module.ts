import { Module } from '@nestjs/common';
import { ArcgisModule } from '../arcgis/arcgis.module.js';
import { ApplicationsController, SoatoController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';

@Module({
  imports: [ArcgisModule],
  controllers: [ApplicationsController, SoatoController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
