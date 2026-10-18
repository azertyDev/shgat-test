import { Module } from '@nestjs/common';
import { ArcgisModule } from '../arcgis/arcgis.module.js';
import { SoatoModule } from '../soato/soato.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';

@Module({
  imports: [ArcgisModule, SoatoModule, StorageModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
