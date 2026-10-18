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
import {
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
  ApiHeader,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import { uploadOptions } from '../storage/upload-options.js';
import { ALL_ROLES, Role } from '../auth/role.enum.js';
import { Roles } from '../auth/roles.decorator.js';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe.js';
import { SoatoService } from '../soato/soato.service.js';
import {
  API_STATUSES,
  fileKindFromApi,
  UPLOAD_FIELDS,
  uploadsFromApi,
  type UploadField,
} from './api-contract.js';
import { ApplicationsService } from './applications.service.js';
import { parseListQuery } from './dto/list-query.dto.js';
import { parseReturnReason } from './dto/return-request.dto.js';
import {
  toApprovalDto,
  toDetailsDto,
  toPageDto,
  toStatusDto,
} from './mappers/application.mapper.js';

/** Multer's view of the multipart files: wire field names, one file each. */
type MultipartFiles = Partial<Record<UploadField, Express.Multer.File[]>>;

const uploadInterceptor = FileFieldsInterceptor(
  UPLOAD_FIELDS.map((name) => ({ name, maxCount: 1 })),
  uploadOptions(UPLOAD_FIELDS.length),
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
    coordinates: [
      [
        [72.3, 40.75],
        [72.4, 40.75],
        [72.4, 40.81],
        [72.3, 40.81],
        [72.3, 40.75],
      ],
    ],
  },
};

const multipartBody = (filesRequired: boolean) => ({
  schema: {
    type: 'object',
    required: filesRequired ? ['data', ...UPLOAD_FIELDS] : ['data'],
    properties: {
      data: { type: 'string', example: JSON.stringify(EXAMPLE_PAYLOAD) },
      ...Object.fromEntries(
        UPLOAD_FIELDS.map((t) => [t, { type: 'string', format: 'binary' }]),
      ),
    },
  },
});

@ApiTags('arizalar')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Rol',
  enum: Role,
  required: false,
  description: "Bearer token bo'lmasa",
})
/**
 * The API boundary: wire names of the task spec come in and go out here (via the DTO parsers and
 * the mapper); ApplicationsService only sees and returns the English domain shapes.
 */
@Controller('arizalar')
export class ApplicationsController {
  private readonly regionName = (code: string) => this.soato.regionName(code);

  constructor(
    private readonly applications: ApplicationsService,
    private readonly soato: SoatoService,
  ) {}

  @Post()
  @Roles([Role.APPLICANT])
  @UseInterceptors(uploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody(multipartBody(true))
  async create(
    @Body('data') data: string,
    @UploadedFiles() files: MultipartFiles = {},
  ) {
    const { id, status } = await this.applications.create(
      data,
      uploadsFromApi(files),
    );
    return toStatusDto(id, status);
  }

  @Get()
  @Roles(ALL_ROLES)
  @ApiQuery({ name: 'holat', required: false, enum: API_STATUSES })
  @ApiQuery({ name: 'hujjat_turi', required: false })
  @ApiQuery({ name: 'soato_kodi', required: false })
  @ApiQuery({ name: 'sahifa', required: false, type: Number })
  @ApiQuery({ name: 'hajm', required: false, type: Number })
  async list(@Query() query: Record<string, string | undefined>) {
    const page = await this.applications.list(parseListQuery(query));
    return toPageDto(page, this.regionName);
  }

  @Get(':id')
  @Roles(ALL_ROLES)
  async findOne(@Param('id', ParseIdPipe) id: number) {
    return toDetailsDto(await this.applications.findOne(id), this.regionName);
  }

  @Put(':id')
  @Roles([Role.APPLICANT])
  @UseInterceptors(uploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody(multipartBody(false))
  async resubmit(
    @Param('id', ParseIdPipe) id: number,
    @Body('data') data: string,
    @UploadedFiles() files: MultipartFiles = {},
  ) {
    const result = await this.applications.resubmit(
      id,
      data,
      uploadsFromApi(files),
    );
    return toStatusDto(result.id, result.status);
  }

  @Post(':id/tasdiqlash')
  @HttpCode(200)
  @Roles([Role.REVIEWER])
  async approve(@Param('id', ParseIdPipe) id: number) {
    return toApprovalDto(await this.applications.approve(id));
  }

  @Post(':id/qaytarish')
  @HttpCode(200)
  @Roles([Role.REVIEWER])
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sabab'],
      properties: { sabab: { type: 'string' } },
    },
  })
  async returnToApplicant(
    @Param('id', ParseIdPipe) id: number,
    @Body() body: unknown,
  ) {
    const result = await this.applications.returnToApplicant(
      id,
      parseReturnReason(body),
    );
    return toStatusDto(result.id, result.status);
  }

  /** Opened as a plain browser link, so no X-Rol header is required. */
  @Get(':id/fayllar/:tur')
  async download(
    @Param('id', ParseIdPipe) id: number,
    @Param('tur') field: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.applications.getFile(id, fileKindFromApi(field));
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(createReadStream(file.absolutePath));
  }
}
