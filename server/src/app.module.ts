import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { AuthModule } from './auth/auth.module';
import { ShiftsModule } from './shifts/shifts.module';
import { BookingsModule } from './bookings/bookings.module';
import { ClassroomModule } from './classroom/classroom.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    // ─── Rate Limiting ──────────────────────────────────────────────────────
    // 20 requests per minute per IP globally
    // Individual endpoints can override this with @Throttle() decorator
    ThrottlerModule.forRoot([
      {
        ttl: 60 * 1000, // 1 minute window (in ms)
        limit: 20, // max 20 requests per window
      },
    ]),

    // ─── Core ───────────────────────────────────────────────────────────────
    PrismaModule,
    UsersModule,
    StudentsModule,
    AuthModule,
    ShiftsModule,
    BookingsModule,
    ClassroomModule,

    // ─── Global Services (marked @Global in their modules) ──────────────────
    PaymentsModule,
    NotificationsModule,

    // ─── Admin ──────────────────────────────────────────────────────────────
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply rate limiting globally to all routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
