import { HttpStatus, Injectable, PipeTransform } from '@nestjs/common';
import { apiError } from '../errors/api-error.js';

const MAX_INT4 = 2_147_483_647; // ids are PostgreSQL integer columns

/** Route id: a positive integer that fits the column; anything else cannot exist, so it is a 404. */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = /^\d+$/.test(value) ? Number(value) : NaN;
    if (!Number.isSafeInteger(id) || id < 1 || id > MAX_INT4)
      throw apiError(HttpStatus.NOT_FOUND, 'Ariza topilmadi');
    return id;
  }
}
