import { Module } from '@nestjs/common';
import { ArcgisModule } from '../arcgis/arcgis.module.js';
import { SoatoModule } from '../soato/soato.module.js';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';

@Module({
  imports: [ArcgisModule, SoatoModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
