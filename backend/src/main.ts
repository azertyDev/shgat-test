import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { XatoFilter } from './common/api-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new XatoFilter());
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('ShGAT — shaharsozlik hujjatlari arizalari')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, config));

  await app.listen(Number(process.env.PORT ?? 3000));
}
await bootstrap();
