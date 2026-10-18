import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileStorageService } from './file-storage.service.js';

describe('FileStorageService', () => {
  let root: string;
  let storage: FileStorageService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'shgat-storage-'));
    process.env.UPLOAD_DIR = root;
    storage = new FileStorageService();
  });
  afterEach(() => {
    delete process.env.UPLOAD_DIR;
  });

  it('moves a temporary upload into storage and reads its signature', async () => {
    const temp = join(root, 'incoming-file');
    await writeFile(temp, '%PDF-1.7 rest of the file');

    expect((await storage.readHead(temp, 5)).toString()).toBe('%PDF-');
    await storage.moveIn(temp, 'main_drawing-1.pdf');

    expect(await storage.exists('main_drawing-1.pdf')).toBe(true);
    expect(
      await readFile(storage.absolutePath('main_drawing-1.pdf'), 'utf8'),
    ).toContain('%PDF-1.7');
    await storage.removeTemp(temp); // already moved: no error
  });

  it('removes stored files and ignores missing ones', async () => {
    await writeFile(join(root, 'a.pdf'), 'x');
    await storage.remove('a.pdf');
    expect(await storage.exists('a.pdf')).toBe(false);
    await expect(storage.remove('a.pdf')).resolves.toBeUndefined();
  });
});
