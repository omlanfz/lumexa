import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma.module';
import { ShiftsModule } from './shifts/shifts.module';
import { BookingsModule } from './bookings/bookings.module';
import { ClassroomModule } from './classroom/classroom.module';

@Module({
  imports: [
    PrismaModule, // Add this here!
    UsersModule,
    StudentsModule,
    AuthModule,
    ShiftsModule,
    BookingsModule,
    ClassroomModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
