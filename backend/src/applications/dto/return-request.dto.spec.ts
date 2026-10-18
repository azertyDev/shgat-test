import { HttpException } from '@nestjs/common';
import { parseReturnReason } from './return-request.dto.js';

describe('parseReturnReason', () => {
  it.each([undefined, {}, { sabab: '   ' }, { sabab: 5 }])(
    'requires a reason (%j) -> 422 on sabab',
    (body) => {
      try {
        parseReturnReason(body);
        expect.unreachable();
      } catch (e) {
        expect((e as HttpException).getStatus()).toBe(422);
        expect(
          ((e as HttpException).getResponse() as any).maydonlar.sabab,
        ).toBeDefined();
      }
    },
  );

  it('returns the trimmed reason', () => {
    expect(parseReturnReason({ sabab: " Chegara noto'g'ri " })).toBe(
      "Chegara noto'g'ri",
    );
  });
});
