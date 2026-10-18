import { Injectable } from '@nestjs/common';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
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
