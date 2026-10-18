import { Injectable } from '@nestjs/common';
import { access, mkdir, open, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { uploadRoot } from './upload-root.js';

/** Local disk storage for uploaded documents. Paths are relative to UPLOAD_DIR and never come from the user. */
@Injectable()
export class FileStorageService {
  private readonly root = uploadRoot();

  /** Moves a temporary upload into storage. */
  async moveIn(tempPath: string, relativePath: string): Promise<void> {
    const target = this.absolutePath(relativePath);
    await mkdir(dirname(target), { recursive: true });
    await rename(tempPath, target);
  }

  /** First bytes of a file, enough to recognise its signature. */
  async readHead(path: string, bytes = 16): Promise<Buffer> {
    const file = await open(path, 'r');
    try {
      const { buffer, bytesRead } = await file.read(
        Buffer.alloc(bytes),
        0,
        bytes,
        0,
      );
      return buffer.subarray(0, bytesRead);
    } finally {
      await file.close();
    }
  }

  async remove(relativePath: string): Promise<void> {
    await rm(this.absolutePath(relativePath), { force: true });
  }

  /** Removes a temporary upload; a file that was already moved into storage is simply gone. */
  async removeTemp(tempPath: string): Promise<void> {
    await rm(tempPath, { force: true });
  }

  async exists(relativePath: string): Promise<boolean> {
    return access(this.absolutePath(relativePath)).then(
      () => true,
      () => false,
    );
  }

  absolutePath(relativePath: string): string {
    return join(this.root, relativePath);
  }
}
