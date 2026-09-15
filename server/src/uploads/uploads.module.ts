// FILE PATH: server/src/uploads/uploads.module.ts
//
// Two separate Cloudinary storage configs: avatars are images-only with a
// face-crop transform; verification documents (NID, birth certificate,
// degree certificates, etc.) need PDF support and no cropping. Previously
// both endpoints shared one MulterModule-level config that only allowed
// jpg/jpeg/png/webp — PDF document uploads were silently rejected by the
// storage layer even though the controller's own FileInterceptor limits
// implied PDFs were supported. Each interceptor now gets its own storage
// instance instead of relying on a single module-level default.
import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
