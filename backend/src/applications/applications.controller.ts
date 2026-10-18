import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiHeader, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import { ALL_ROLES, Role, Roles } from '../common/role.guard.js';
import { SOATO_REGIONS } from '../soato/soato.js';
import { ArizalarService, type Fayllar } from './applications.service.js';
import { UPLOAD_FIELDS } from './api-contract.js';

// 20 MB tekshiruvi servisda (422 + maydon nomi); bu — xotirani himoya qiluvchi yuqori chegara
const fayllarInterceptor = FileFieldsInterceptor(
  UPLOAD_FIELDS.map((name) => ({ name, maxCount: 1 })),
  { limits: { fileSize: 50 * 1024 * 1024, files: UPLOAD_FIELDS.length } },
);

const NAMUNA = {
  hujjat_nomi: 'Andijon shahri bosh rejasi',
  hujjat_turi: 'БР',
  soato_kodi: '1703401',
  tasdiq_sanasi: '2026-03-12',
  tasdiq_hujjati: '123-son qaror',
  chegara: {
    type: 'Polygon',
    coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.81], [72.3, 40.75]]],
  },
};

const multipartBody = (majburiy: boolean) => ({
  schema: {
    type: 'object',
    required: majburiy ? ['data', ...UPLOAD_FIELDS] : ['data'],
    properties: {
      data: { type: 'string', example: JSON.stringify(NAMUNA) },
      ...Object.fromEntries(UPLOAD_FIELDS.map((t) => [t, { type: 'string', format: 'binary' }])),
    },
  },
});

@ApiTags('arizalar')
@ApiHeader({ name: 'X-Rol', enum: Role, required: true })
@Controller('arizalar')
export class ArizalarController {
  constructor(private readonly arizalar: ArizalarService) {}

  @Post()
  @Roles([Role.APPLICANT])
  @UseInterceptors(fayllarInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody(multipartBody(true))
  yarat(@Body('data') data: string, @UploadedFiles() fayllar: Fayllar = {}) {
    return this.arizalar.yarat(data, fayllar);
  }

  @Get()
  @Roles(ALL_ROLES)
  @ApiQuery({ name: 'holat', required: false, enum: ['yuborilgan', 'hisobga_olingan', 'qaytarilgan'] })
  @ApiQuery({ name: 'hujjat_turi', required: false })
  @ApiQuery({ name: 'soato_kodi', required: false })
  @ApiQuery({ name: 'sahifa', required: false, type: Number })
  @ApiQuery({ name: 'hajm', required: false, type: Number })
  royxat(@Query() q: Record<string, string | undefined>) {
    return this.arizalar.royxat(q);
  }

  @Get(':id')
  @Roles(ALL_ROLES)
  bitta(@Param('id', ParseIntPipe) id: number) {
    return this.arizalar.bitta(id);
  }

  @Put(':id')
  @Roles([Role.APPLICANT])
  @UseInterceptors(fayllarInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody(multipartBody(false))
  tuzat(@Param('id', ParseIntPipe) id: number, @Body('data') data: string, @UploadedFiles() fayllar: Fayllar = {}) {
    return this.arizalar.tuzat(id, data, fayllar);
  }

  @Post(':id/tasdiqlash')
  @HttpCode(200)
  @Roles([Role.REVIEWER])
  tasdiqla(@Param('id', ParseIntPipe) id: number) {
    return this.arizalar.tasdiqla(id);
  }

  @Post(':id/qaytarish')
  @HttpCode(200)
  @Roles([Role.REVIEWER])
  @ApiBody({ schema: { type: 'object', required: ['sabab'], properties: { sabab: { type: 'string' } } } })
  qaytar(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    return this.arizalar.qaytar(id, body);
  }

  /** Brauzer havolasi orqali ochiladi, shuning uchun X-Rol talab qilinmaydi. */
  @Get(':id/fayllar/:tur')
  async fayl(
    @Param('id', ParseIntPipe) id: number,
    @Param('tur') tur: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const f = await this.arizalar.fayl(id, tur);
    res.set({
      'Content-Type': f.mime,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(f.nomi)}`,
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(createReadStream(f.toliqYol));
  }
}

@ApiTags('soato')
@ApiHeader({ name: 'X-Rol', enum: Role, required: true })
@Controller('soato')
export class SoatoController {
  @Get()
  @Roles(ALL_ROLES)
  royxat() {
    return SOATO_REGIONS;
  }
}
