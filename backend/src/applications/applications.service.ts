import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Prisma,
  type Application,
  type ApplicationStatus,
} from '../generated/prisma/client.js';
import { apiError, FieldValidationError } from '../common/errors/api-error.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  API_STATUSES,
  FIELD_TO_FILE_KIND,
  isUploadField,
  STATUS_TO_API,
  statusFromApi,
  UPLOAD_FIELDS,
  type UploadField,
} from './api-contract.js';
import type { ApprovalDto } from './dto/application-response.dto.js';
import {
  toDetailsDto,
  toStatusDto,
  toSummaryDto,
} from './mappers/application.mapper.js';
import {
  createApplicationPayloadSchema,
  type ApplicationInput,
} from './dto/application-payload.dto.js';
import { DOCUMENT_TYPES } from './domain/document-types.js';
import { SoatoService } from '../soato/soato.service.js';
import { ArcgisError, ArcgisService } from '../arcgis/arcgis.service.js';
import { toEsriPolygon } from '../geo/esri-geometry.js';
import { buildRegistrationNumber } from './domain/registration-number.js';
import { FileStorageService } from '../storage/file-storage.service.js';
import { checkUploadedFile, detectFileType } from '../storage/file-type.js';

export type UploadedFileMap = Partial<
  Record<UploadField, Express.Multer.File[]>
>;
type Tx = Prisma.TransactionClient;

const DESCRIPTION_MAX_LENGTH = 75; // length of the description field in the ArcGIS layer
const MAX_PAGE = 1_000_000;
const STATE_CHANGED = "Ariza holati o'zgargan, sahifani yangilang";

@Injectable()
export class ApplicationsService {
  private readonly payloadSchema: ReturnType<
    typeof createApplicationPayloadSchema
  >;
  private readonly regionName = (code: string) => this.soato.regionName(code);

  constructor(
    private readonly prisma: PrismaService,
    private readonly arcgis: ArcgisService,
    private readonly soato: SoatoService,
    private readonly storage: FileStorageService,
  ) {
    this.payloadSchema = createApplicationPayloadSchema((code) =>
      soato.exists(code),
    );
  }

  async create(rawData: unknown, files: UploadedFileMap) {
    const input = this.validate(rawData, files, true);
    const application = await this.prisma.$transaction(async (tx) => {
      const created = await tx.application.create({ data: toColumns(input) });
      await this.storeFiles(tx, created.id, files);
      return created;
    });
    return toStatusDto(application.id, application.status);
  }

  async list(query: Record<string, string | undefined>) {
    const errors: Record<string, string> = {};
    const status = query.holat ? statusFromApi(query.holat) : undefined;
    if (query.holat && !status)
      errors.holat = `Holatlardan biri: ${API_STATUSES.join(', ')}`;
    if (
      query.hujjat_turi &&
      !(DOCUMENT_TYPES as readonly string[]).includes(query.hujjat_turi)
    )
      errors.hujjat_turi = `Turlardan biri: ${DOCUMENT_TYPES.join(', ')}`;
    if (Object.keys(errors).length) throw new FieldValidationError(errors);

    // clamped so that skip stays a safe integer for Prisma (huge values returned 500)
    const page = Math.min(
      MAX_PAGE,
      Math.max(1, Number.parseInt(query.sahifa ?? '', 10) || 1),
    );
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(query.hajm ?? '', 10) || 20),
    );
    const where: Prisma.ApplicationWhereInput = {
      status,
      documentType: query.hujjat_turi || undefined,
      soatoCode: query.soato_kodi || undefined,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.application.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.application.count({ where }),
    ]);
    return {
      items: items.map((a) => toSummaryDto(a, this.regionName)),
      jami: total,
    };
  }

  async findOne(id: number) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: { files: true },
    });
    if (!application) throw apiError(HttpStatus.NOT_FOUND, 'Ariza topilmadi');
    return toDetailsDto(application, this.regionName);
  }

  /** Resubmits a returned application. Files that are not sent again are kept. */
  async resubmit(id: number, rawData: unknown, files: UploadedFileMap) {
    await this.requireStatus(
      id,
      'RETURNED',
      'Faqat qaytarilgan arizani tuzatib qayta yuborish mumkin',
    );
    const input = this.validate(rawData, files, false);
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.application.updateMany({
        where: { id, status: 'RETURNED' },
        data: {
          ...toColumns(input),
          status: 'SUBMITTED',
          submittedAt: new Date(),
          returnReason: null,
          arcgisAttemptAt: null,
        },
      });
      if (count === 0) throw apiError(HttpStatus.CONFLICT, STATE_CHANGED);
      await this.storeFiles(tx, id, files);
    });
    return toStatusDto(id, 'SUBMITTED');
  }

  /**
   * Builds the registration number, writes the boundary to ArcGIS and only then changes the status.
   * If ArcGIS fails, the status and the number stay unchanged (502) and the reviewer can retry.
   */
  async approve(id: number): Promise<ApprovalDto> {
    const application = await this.requireStatus(
      id,
      'SUBMITTED',
      'Faqat yuborilgan arizani tasdiqlash mumkin',
    );
    const registrationNumber = buildRegistrationNumber(
      application.documentType,
      application.soatoCode,
      application.approvalDate,
    );

    const holder = await this.prisma.application.findUnique({
      where: { registrationNumber },
    });
    if (holder) throw duplicateNumber(registrationNumber, holder.id);

    // only the attempt time is stored here, not the number or the status (see ArcgisService.addFeature)
    const firstAttemptAt = application.arcgisAttemptAt ?? new Date();
    if (!application.arcgisAttemptAt)
      await this.prisma.application.update({
        where: { id },
        data: { arcgisAttemptAt: firstAttemptAt },
      });

    let objectId: number;
    try {
      const description =
        `${registrationNumber} | ${application.documentName}`.slice(
          0,
          DESCRIPTION_MAX_LENGTH,
        );
      objectId = await this.arcgis.addFeature(
        description,
        toEsriPolygon(application.boundary as never),
        firstAttemptAt,
        Boolean(application.arcgisAttemptAt),
      );
    } catch (e) {
      if (e instanceof ArcgisError)
        throw apiError(
          HttpStatus.BAD_GATEWAY,
          `ArcGIS qatlamiga yozib bo'lmadi (${e.message.replace(/\.+$/, '')}). Keyinroq qayta urinib ko'ring.`,
        );
      throw e;
    }

    try {
      const { count } = await this.prisma.application.updateMany({
        where: { id, status: 'SUBMITTED' },
        data: {
          status: 'REGISTERED',
          registrationNumber,
          arcgisObjectId: objectId,
        },
      });
      if (count === 0) throw apiError(HttpStatus.CONFLICT, STATE_CHANGED);
    } catch (e) {
      // concurrent approvals hit the unique constraint
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw duplicateNumber(registrationNumber);
      throw e;
    }
    return { id_raqam: registrationNumber, arcgis_object_id: objectId };
  }

  async returnToApplicant(id: number, body: unknown) {
    const reason = (body as { sabab?: unknown } | undefined)?.sabab;
    if (typeof reason !== 'string' || !reason.trim())
      throw new FieldValidationError({ sabab: 'Qaytarish sababi majburiy' });
    await this.requireStatus(
      id,
      'SUBMITTED',
      'Faqat yuborilgan arizani qaytarish mumkin',
    );
    const { count } = await this.prisma.application.updateMany({
      where: { id, status: 'SUBMITTED' },
      data: { status: 'RETURNED', returnReason: reason.trim() },
    });
    if (count === 0) throw apiError(HttpStatus.CONFLICT, STATE_CHANGED);
    return toStatusDto(id, 'RETURNED');
  }

  async getFile(id: number, field: string) {
    const file = isUploadField(field)
      ? await this.prisma.applicationFile.findUnique({
          where: {
            applicationId_kind: {
              applicationId: id,
              kind: FIELD_TO_FILE_KIND[field],
            },
          },
        })
      : null;
    // the row may outlive the file (lost volume, manual cleanup): answer 404, not a raw ENOENT
    if (!file || !(await this.storage.exists(file.storagePath)))
      throw apiError(HttpStatus.NOT_FOUND, 'Fayl topilmadi');
    return {
      ...file,
      absolutePath: this.storage.absolutePath(file.storagePath),
    };
  }

  private async requireStatus(
    id: number,
    status: ApplicationStatus,
    message: string,
  ): Promise<Application> {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });
    if (!application) throw apiError(HttpStatus.NOT_FOUND, 'Ariza topilmadi');
    if (application.status !== status)
      throw apiError(
        HttpStatus.CONFLICT,
        `${message} (hozirgi holat: ${STATUS_TO_API[application.status]})`,
      );
    return application;
  }

  private validate(
    rawData: unknown,
    files: UploadedFileMap,
    filesRequired: boolean,
  ): ApplicationInput {
    const errors: Record<string, string> = {};
    let input: ApplicationInput | undefined;
    try {
      const result = this.payloadSchema.safeParse(
        JSON.parse(String(rawData ?? '')),
      );
      if (result.success) input = result.data;
      else
        for (const issue of result.error.issues)
          errors[String(issue.path[0] ?? 'data')] ??= issue.message;
    } catch {
      errors.data = "data maydoni to'g'ri JSON bo'lishi kerak";
    }
    for (const field of UPLOAD_FIELDS) {
      const error = checkUploadedFile(files[field]?.[0], filesRequired);
      if (error) errors[field] = error;
    }
    if (!input || Object.keys(errors).length)
      throw new FieldValidationError(errors);
    return input;
  }

  /** The stored name never comes from the user: {applicationId}/{kind}.{ext} */
  private async storeFiles(
    tx: Tx,
    applicationId: number,
    files: UploadedFileMap,
  ) {
    for (const field of UPLOAD_FIELDS) {
      const upload = files[field]?.[0];
      if (!upload) continue;
      const kind = FIELD_TO_FILE_KIND[field];
      const { ext, mime } = detectFileType(upload.buffer)!;
      const storagePath = `${applicationId}/${kind.toLowerCase()}.${ext}`;
      await this.storage.save(storagePath, upload.buffer);
      const previous = await tx.applicationFile.findUnique({
        where: { applicationId_kind: { applicationId, kind } },
      });
      if (previous && previous.storagePath !== storagePath)
        await this.storage.remove(previous.storagePath);
      const row = {
        originalName: upload.originalname.slice(0, 255),
        mimeType: mime,
        size: upload.size,
        storagePath,
      };
      await tx.applicationFile.upsert({
        where: { applicationId_kind: { applicationId, kind } },
        create: { applicationId, kind, ...row },
        update: row,
      });
    }
  }
}

const toColumns = (input: ApplicationInput) => ({
  documentName: input.documentName,
  documentType: input.documentType,
  soatoCode: input.soatoCode,
  approvalDate: new Date(`${input.approvalDate}T00:00:00Z`),
  approvalDecree: input.approvalDecree,
  boundary: input.boundary as Prisma.InputJsonValue,
});

const duplicateNumber = (registrationNumber: string, applicationId?: number) =>
  apiError(
    HttpStatus.CONFLICT,
    `${registrationNumber} ID raqami allaqachon mavjud${applicationId ? ` (ariza #${applicationId})` : ''}: shu tur, hudud va yil uchun hujjat hisobga olingan`,
  );
