import express from 'express';
import multer from 'multer';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { uploadOptions } from './upload-options.js';

describe('uploadOptions (real multer)', () => {
  beforeAll(async () => {
    process.env.UPLOAD_DIR = await mkdtemp(join(tmpdir(), 'shgat-upload-'));
  });
  afterAll(() => {
    delete process.env.UPLOAD_DIR;
  });

  function app() {
    const server = express();
    server.post(
      '/upload',
      multer(uploadOptions(1) as multer.Options).single('asosiy_chizma'),
      (req, res) => {
        res.json({
          originalname: req.file?.originalname,
          onDisk: Boolean(req.file?.path),
          inMemory: Boolean(req.file?.buffer),
        });
      },
    );
    return server;
  }

  it('keeps a Cyrillic file name intact (UTF-8, not latin1)', async () => {
    const res = await request(app())
      .post('/upload')
      .attach('asosiy_chizma', Buffer.from('%PDF-1.4'), {
        filename: 'Оценка_проекта_ЭМ.pdf',
        contentType: 'application/pdf',
      });
    expect(res.body.originalname).toBe('Оценка_проекта_ЭМ.pdf');
  });

  it('keeps Uzbek Latin apostrophes and spaces', async () => {
    const res = await request(app())
      .post('/upload')
      .attach('asosiy_chizma', Buffer.from('%PDF-1.4'), {
        filename: "Bosh reja o'zgarishlari.pdf",
        contentType: 'application/pdf',
      });
    expect(res.body.originalname).toBe("Bosh reja o'zgarishlari.pdf");
  });

  it('streams the upload to disk instead of memory', async () => {
    const res = await request(app())
      .post('/upload')
      .attach('asosiy_chizma', Buffer.from('%PDF-1.4'), {
        filename: 'a.pdf',
        contentType: 'application/pdf',
      });
    expect(res.body).toMatchObject({ onDisk: true, inMemory: false });
  });
});
