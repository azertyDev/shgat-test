import { HttpException, HttpStatus } from '@nestjs/common';

/** Yagona xato formati: {"xato": "...", "maydonlar": {...}} */
export const xato = (status: HttpStatus, matn: string) => new HttpException({ xato: matn }, status);

export class ValidatsiyaXatosi extends HttpException {
  constructor(maydonlar: Record<string, string>, matn = "Ma'lumotlar noto'g'ri to'ldirilgan") {
    super({ xato: matn, maydonlar }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
