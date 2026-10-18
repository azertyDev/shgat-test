import { Injectable } from '@nestjs/common';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

/** Local disk storage for uploaded documents. Paths are relative to UPLOAD_DIR and never come from the user. */
@Injectable()
export class FileStorageService {
  private readonly root = resolve(process.env.UPLOAD_DIR ?? 'uploads');

  async save(relativePath: string, content: Buffer): Promise<void> {
    const target = this.absolutePath(relativePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }

  async remove(relativePath: string): Promise<void> {
    await rm(this.absolutePath(relativePath), { force: true });
  }

  absolutePath(relativePath: string): string {
    return join(this.root, relativePath);
  }
}
