import { SoatoController } from './soato.controller.js';
import { SoatoService } from './soato.service.js';

describe('SOATO list', () => {
  it('is code/name inside and {kod, nomi} on the wire', () => {
    const service = new SoatoService();
    expect(service.list()[0]).toEqual({
      code: '1703401',
      name: 'Andijon shahri',
    });
    expect(new SoatoController(service).list()[0]).toEqual({
      kod: '1703401',
      nomi: 'Andijon shahri',
    });
  });
});
