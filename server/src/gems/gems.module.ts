import { Module } from '@nestjs/common';
import { GemsController } from './gems.controller';
import { GemsService } from './gems.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GemsController],
  providers: [GemsService],
  exports: [GemsService],
})
export class GemsModule {}
