import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── CORS ───────────────────────────────────────────────────────────────────
  //
  // Strategy: function-based origin validator so we can match both exact URLs
  // and Vercel preview deployment patterns without hardcoding them.
  //
  // Allowed origins:
  //   1. localhost variants (always allowed for local development)
  //   2. FRONTEND_URL env var — the canonical production Vercel URL
  //   3. ALLOWED_ORIGINS env var — comma-separated list of any extra exact URLs
  //   4. Any *.vercel.app URL whose hostname contains the project name "lumexa"
  //      This covers all preview deployments (lumexa-abc123-user-projects.vercel.app)
  //
  // HOW TO ADD ORIGINS:
  //   On Render dashboard → Environment → add ALLOWED_ORIGINS=url1,url2
  //   Or just add the production domain to FRONTEND_URL.

  const staticAllowed = new Set<string>([
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ]);

  // Add FRONTEND_URL (production Vercel URL)
  if (process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL.split(',').forEach((u) =>
      staticAllowed.add(u.trim()),
    );
  }

  // Add ALLOWED_ORIGINS (extra comma-separated URLs)
  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',').forEach((u) =>
      staticAllowed.add(u.trim()),
    );
  }

  app.enableCors({
    origin: (
      requestOrigin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!requestOrigin) return callback(null, true);

      // Exact match check
      if (staticAllowed.has(requestOrigin)) return callback(null, true);

      // Pattern match: any Vercel preview URL for the lumexa project
      // Covers: https://lumexa-<hash>-<user>-projects.vercel.app
      //         https://lumexa-<hash>.vercel.app
      try {
        const url = new URL(requestOrigin);
        const isVercelPreview =
          url.hostname.endsWith('.vercel.app') &&
          url.hostname.toLowerCase().includes('lumexa');
        if (isVercelPreview) return callback(null, true);
      } catch {
        // malformed origin — deny
      }

      console.warn(`[CORS] Blocked origin: ${requestOrigin}`);
      callback(new Error(`CORS: origin ${requestOrigin} not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
