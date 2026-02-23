import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS so Frontend can talk to Backend
  app.enableCors({
    origin: ['https://lumexa-mu.vercel.app', 'http://localhost:3000'],
    credentials: true,
  });

  // Render (and most cloud hosts) inject PORT dynamically
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on port ${port}`);
}
bootstrap();
