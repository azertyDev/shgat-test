import { Module } from '@nestjs/common';
import { GeometryValidator } from './geometry-validator.service.js';

/** Database-backed geometry checks (PostGIS). The pure helpers in geo/ need no module. */
@Module({
  providers: [GeometryValidator],
  exports: [GeometryValidator],
})
export class GeoModule {}
