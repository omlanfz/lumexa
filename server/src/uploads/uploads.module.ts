// FILE PATH: server/src/uploads/uploads.module.ts
// CHANGE: Replace disk storage with Cloudinary storage
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary } from '../lib/cloudinary';
import { UploadsController } from './uploads.controller';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [
    PrismaModule,
    MulterModule.registerAsync({
      useFactory: () => ({
        storage: new CloudinaryStorage({
          cloudinary,
          params: {
            folder: 'lumexa/avatars',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            ],
          } as any,
        }),
        fileFilter: (_req: any, file: any, cb: any) => {
          if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
            return cb(new Error('Only image files are allowed'), false);
          }
          cb(null, true);
        },
        limits: { fileSize: 5 * 1024 * 1024 },
      }),
    }),
  ],
  controllers: [UploadsController],
})
export class UploadsModule {}
