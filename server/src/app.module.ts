import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { ShiftsModule } from './shifts/shifts.module';
import { BookingsModule } from './bookings/bookings.module';
import { TeachersModule } from './teachers/teachers.module';
import { ClassroomModule } from './classroom/classroom.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    // ─── Rate Limiting ──────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        ttl: 60 * 1000,
        limit: 20,
      },
    ]),

    // ─── Static file serving (/static/* → /uploads/*) ──────────────────────
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/static',
    }),

    // ─── Core ───────────────────────────────────────────────────────────────
    PrismaModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    ShiftsModule,
    BookingsModule,
    ClassroomModule,

    // ─── Global services ────────────────────────────────────────────────────
    PaymentsModule,
    NotificationsModule,
    TeachersModule,
    UploadsModule,

    // ─── Admin ──────────────────────────────────────────────────────────────
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    // FIX: AppService was missing from providers.
    // AppController injects AppService at constructor index [0].
    // NestJS throws UnknownDependenciesException at boot without this line.
    AppService,

    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
