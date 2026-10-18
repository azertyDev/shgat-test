import { join, resolve } from 'node:path';

/** Root folder of stored uploads (UPLOAD_DIR). */
export const uploadRoot = () => resolve(process.env.UPLOAD_DIR ?? 'uploads');

/** Multer's temporary files: inside the root, so moving them into storage is a same-disk rename. */
export const incomingDir = () => join(uploadRoot(), '.incoming');
