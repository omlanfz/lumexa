import { Module } from '@nestjs/common';
import { StudentsModule } from '../students/students.module';
import { PackageAlertsService } from './package-alerts.service';

@Module({
  imports: [StudentsModule],
  providers: [PackageAlertsService],
})
export class PackageAlertsModule {}
