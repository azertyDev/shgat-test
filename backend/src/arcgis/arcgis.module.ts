import { Module } from '@nestjs/common';
import { ArcgisService } from './arcgis.service.js';

/** Client of the public ArcGIS Feature Service layer. */
@Module({
  providers: [ArcgisService],
  exports: [ArcgisService],
})
export class ArcgisModule {}
