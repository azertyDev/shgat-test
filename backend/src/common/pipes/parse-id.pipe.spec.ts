import { HttpException } from '@nestjs/common';
import { ParseIdPipe } from './parse-id.pipe.js';

describe('ParseIdPipe', () => {
  const pipe = new ParseIdPipe();

  it('accepts a positive int4 id', () => {
    expect(pipe.transform('42')).toBe(42);
    expect(pipe.transform('2147483647')).toBe(2147483647);
  });

  it.each(['0', '-1', 'abc', '1.5', '2147483648', '99999999999', '1e3', ''])(
    'rejects %j with 404',
    (value) => {
      try {
        pipe.transform(value);
        throw new Error('expected 404');
      } catch (e) {
        expect((e as HttpException).getStatus()).toBe(404);
      }
    },
  );
});
