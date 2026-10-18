import { Module } from '@nestjs/common';
import { SoatoController } from './soato.controller.js';
import { SoatoService } from './soato.service.js';

@Module({
  controllers: [SoatoController],
  providers: [SoatoService],
  exports: [SoatoService],
})
export class SoatoModule {}
