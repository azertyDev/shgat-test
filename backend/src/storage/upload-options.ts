import type { FileFieldsInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { diskStorage } from 'multer';
import { incomingDir } from './upload-root.js';

type MulterOptions = NonNullable<Parameters<typeof FileFieldsInterceptor>[1]>;

/** Hard body limit per file; the 20 MB rule is checked in the service so the 422 names the field. */
export const UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024;

/**
 * Multer options for document uploads: streamed to disk next to the storage root, never kept in memory.
 * defParamCharset: browsers send the filename as UTF-8, but multer/busboy default to latin1, which turned
 * Cyrillic names into mojibake ("ÐÑÐµÐ½Ð°…").
 */
export const uploadOptions = (files: number): MulterOptions => ({
  storage: diskStorage({
    destination: incomingDir(),
    filename: (_req, _file, cb) => cb(null, randomUUID()),
  }),
  limits: { fileSize: UPLOAD_LIMIT_BYTES, files },
  defParamCharset: 'utf8',
});
