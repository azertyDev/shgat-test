import { HttpException, HttpStatus } from '@nestjs/common';

/** Unified error body fixed by the task spec: {"xato": "message", "maydonlar": {"field": "message"}}. */
export interface ApiErrorBody {
  xato: string;
  maydonlar?: Record<string, string>;
}

export const apiError = (status: HttpStatus, message: string) =>
  new HttpException({ xato: message } satisfies ApiErrorBody, status);

/** 422 with per-field messages; keys are wire field names. */
export class FieldValidationError extends HttpException {
  constructor(
    fields: Record<string, string>,
    message = "Ma'lumotlar noto'g'ri to'ldirilgan",
  ) {
    super(
      { xato: message, maydonlar: fields } satisfies ApiErrorBody,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
