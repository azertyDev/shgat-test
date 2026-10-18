import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Unified error body fixed by the task spec: {"xato": "message", "maydonlar": {"field": "message"}}.
 * `kod` is an optional machine-readable code for cases clients must recognise without parsing text.
 */
export interface ApiErrorBody {
  xato: string;
  maydonlar?: Record<string, string>;
  kod?: string;
}

export const apiError = (status: HttpStatus, message: string, code?: string) =>
  new HttpException(
    (code
      ? { xato: message, kod: code }
      : { xato: message }) satisfies ApiErrorBody,
    status,
  );

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
