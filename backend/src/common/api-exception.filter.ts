import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorBody } from './api-error.js';

/** Converts every error into the unified ApiErrorBody shape. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(e: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const send = (status: number, body: ApiErrorBody) => res.status(status).json(body);

    // file above the multer hard limit (50 MB): multer does not report which field it was
    if (e instanceof PayloadTooLargeException) {
      return send(422, { xato: 'Fayl hajmi 20 MB dan oshmasin', maydonlar: { fayllar: 'Fayl juda katta' } });
    }
    if (e instanceof HttpException) {
      const body = e.getResponse();
      if (typeof body === 'object' && body !== null && 'xato' in body) return send(e.getStatus(), body as ApiErrorBody);
      const message = typeof body === 'string' ? body : (body as { message?: unknown }).message;
      return send(e.getStatus(), { xato: Array.isArray(message) ? message.join('; ') : String(message ?? e.message) });
    }
    this.logger.error(e instanceof Error ? e.stack : e);
    return send(500, { xato: 'Ichki server xatosi' });
  }
}
