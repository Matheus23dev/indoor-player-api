import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { getApplicationPort, getCorsOrigins } from './config/environment';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigins = getCorsOrigins();

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: false,
    }),
  );

  app.enableShutdownHooks();

  const expressApplication = app.getHttpAdapter().getInstance() as {
    disable?: (setting: string) => void;
  };

  expressApplication.disable?.('x-powered-by');

  await app.listen(getApplicationPort(), '0.0.0.0');
}

bootstrap().catch((error) => {
  console.error('[BOOTSTRAP] Não foi possível iniciar a API.', error);
  process.exitCode = 1;
});
