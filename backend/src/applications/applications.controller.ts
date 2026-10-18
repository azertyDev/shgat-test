import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
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
import { ALL_ROLES, Role } from '../common/auth/role.enum.js';
import { Roles } from '../common/auth/roles.decorator.js';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe.js';
import { API_STATUSES } from './api-contract.js';
import { ApplicationsService, type UploadedFileMap } from './applications.service.js';
import { UPLOAD_FIELDS } from './api-contract.js';

// the 20 MB rule is checked in the service (422 with the field name); this is only a memory guard
const uploadInterceptor = FileFieldsInterceptor(
  UPLOAD_FIELDS.map((name) => ({ name, maxCount: 1 })),
  { limits: { fileSize: 50 * 1024 * 1024, files: UPLOAD_FIELDS.length } },
);

// example payload of the task spec (wire names)
const EXAMPLE_PAYLOAD = {
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

const multipartBody = (filesRequired: boolean) => ({
  schema: {
    type: 'object',
    required: filesRequired ? ['data', ...UPLOAD_FIELDS] : ['data'],
    properties: {
      data: { type: 'string', example: JSON.stringify(EXAMPLE_PAYLOAD) },
      ...Object.fromEntries(UPLOAD_FIELDS.map((t) => [t, { type: 'string', format: 'binary' }])),
    },
  },
});

@ApiTags('arizalar')
@ApiHeader({ name: 'X-Rol', enum: Role, required: true })
@Controller('arizalar')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Post()
  @Roles([Role.APPLICANT])
  @UseInterceptors(uploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody(multipartBody(true))
  create(@Body('data') data: string, @UploadedFiles() files: UploadedFileMap = {}) {
    return this.applications.create(data, files);
  }

  @Get()
  @Roles(ALL_ROLES)
  @ApiQuery({ name: 'holat', required: false, enum: API_STATUSES })
  @ApiQuery({ name: 'hujjat_turi', required: false })
  @ApiQuery({ name: 'soato_kodi', required: false })
  @ApiQuery({ name: 'sahifa', required: false, type: Number })
  @ApiQuery({ name: 'hajm', required: false, type: Number })
  list(@Query() query: Record<string, string | undefined>) {
    return this.applications.list(query);
  }

  @Get(':id')
  @Roles(ALL_ROLES)
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.applications.findOne(id);
  }

  @Put(':id')
  @Roles([Role.APPLICANT])
  @UseInterceptors(uploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody(multipartBody(false))
  resubmit(@Param('id', ParseIdPipe) id: number, @Body('data') data: string, @UploadedFiles() files: UploadedFileMap = {}) {
    return this.applications.resubmit(id, data, files);
  }

  @Post(':id/tasdiqlash')
  @HttpCode(200)
  @Roles([Role.REVIEWER])
  approve(@Param('id', ParseIdPipe) id: number) {
    return this.applications.approve(id);
  }

  @Post(':id/qaytarish')
  @HttpCode(200)
  @Roles([Role.REVIEWER])
  @ApiBody({ schema: { type: 'object', required: ['sabab'], properties: { sabab: { type: 'string' } } } })
  returnToApplicant(@Param('id', ParseIdPipe) id: number, @Body() body: unknown) {
    return this.applications.returnToApplicant(id, body);
  }

  /** Opened as a plain browser link, so no X-Rol header is required. */
  @Get(':id/fayllar/:tur')
  async download(
    @Param('id', ParseIdPipe) id: number,
    @Param('tur') field: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.applications.getFile(id, field);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(createReadStream(file.absolutePath));
  }
}
