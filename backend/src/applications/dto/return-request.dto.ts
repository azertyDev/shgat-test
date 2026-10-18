import { FieldValidationError } from '../../common/errors/api-error.js';

/** Body of POST /api/arizalar/{id}/qaytarish: {"sabab": "..."} -> the trimmed reason. */
export function parseReturnReason(body: unknown): string {
  const reason = (body as { sabab?: unknown } | undefined)?.sabab;
  if (typeof reason !== 'string' || !reason.trim())
    throw new FieldValidationError({ sabab: 'Qaytarish sababi majburiy' });
  return reason.trim();
}
