import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── CORS ───────────────────────────────────────────────────────────────────
  // Origins are read from the FRONTEND_URL env var set in Render dashboard.
  // localhost variants are included for local development.
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];

  // Add the production frontend URL from env (set in Render dashboard)
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ─── GLOBAL VALIDATION PIPE ─────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ─── GLOBAL EXCEPTION FILTER ────────────────────────────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter());

  // ─── PORT ───────────────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Lumexa backend running on port ${port}`);
}

bootstrap();

// import { NestFactory } from '@nestjs/core';
// import { ValidationPipe } from '@nestjs/common';
// import { AppModule } from './app.module';
// import { AllExceptionsFilter } from './filters/http-exception.filter';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   // ─── CORS ───────────────────────────────────────────────────────────────────
//   // Restrict to known origins. Add localhost variants for local dev.
//   app.enableCors({
//     origin: [
//       process.env.FRONTEND_URL || 'https://lumexa-mu.vercel.app',
//       'http://localhost:3000',
//       'http://localhost:3001',
//     ],
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   });

//   // ─── GLOBAL VALIDATION PIPE ─────────────────────────────────────────────────
//   // - whitelist: strips any properties not defined in the DTO
//   // - forbidNonWhitelisted: throws 400 if unexpected properties are sent
//   // - transform: auto-converts strings to numbers/booleans where typed
//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       forbidNonWhitelisted: true,
//       transform: true,
//     }),
//   );

//   // ─── GLOBAL EXCEPTION FILTER ────────────────────────────────────────────────
//   // Prevents raw Prisma errors and stack traces from leaking to clients
//   app.useGlobalFilters(new AllExceptionsFilter());

//   // ─── PORT ───────────────────────────────────────────────────────────────────
//   // Render (and all cloud hosts) inject PORT dynamically at runtime
//   const port = process.env.PORT ?? 3000;
//   await app.listen(port);
//   console.log(`🚀 Lumexa backend running on port ${port}`);
// }

// bootstrap();
