import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';

/** Barcha xatolarni {"xato", "maydonlar"} formatiga keltiradi. */
@Catch()
export class XatoFilter implements ExceptionFilter {
  private readonly log = new Logger('Xato');

  catch(e: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    // multer cheklovidan (50 MB) oshgan fayl — maydon nomi multer'dan kelmaydi
    if (e instanceof PayloadTooLargeException) {
      return res.status(422).json({ xato: 'Fayl hajmi 20 MB dan oshmasin', maydonlar: { fayllar: 'Fayl juda katta' } });
    }
    if (e instanceof HttpException) {
      const body = e.getResponse();
      if (typeof body === 'object' && body !== null && 'xato' in body) return res.status(e.getStatus()).json(body);
      const msg = typeof body === 'string' ? body : (body as { message?: unknown }).message;
      return res.status(e.getStatus()).json({ xato: Array.isArray(msg) ? msg.join('; ') : String(msg ?? e.message) });
    }
    this.log.error(e instanceof Error ? e.stack : e);
    return res.status(500).json({ xato: 'Ichki server xatosi' });
  }
}
