// FILE PATH: server/src/uploads/uploads.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary } from '../lib/cloudinary';
import { PrismaService } from '../prisma.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

// Avatars: images only, cropped to a square face-centered thumbnail.
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'lumexa/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
    ],
  } as any,
});

// Verification documents (NID, birth certificate, degree certs, etc.):
// PDFs and photos of physical documents, stored as-is — no cropping.
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'lumexa/documents',
    resource_type: 'auto',
    allowed_formats: ['pdf', 'jpg', 'jpeg', 'png'],
  } as any,
});

const REQUIRED_DOC_TYPES = new Set([
  'nid',
  'birth_certificate',
  'bachelor_certificate',
  'master_certificate',
  'teaching_cert',
  'degree',
  'background_check',
  'subject_cert',
  'other',
]);

@Controller('uploads')
@UseGuards(AuthGuard('jwt'))
export class UploadsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * POST /uploads/avatar
   * Multer field name: "avatar"
   * Stores Cloudinary URL in User.avatarUrl
   */
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: avatarStorage,
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new Error('Only image files are allowed') as any, false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file)
      throw new BadRequestException(
        'No file provided. Send multipart/form-data with field "avatar".',
      );

    const avatarUrl =
      (file as any).path ??
      (file as any).secure_url ??
      `/static/avatars/${file.filename}`;

    await this.prisma.user.update({
      where: { id: req.user.userId },
      data: { avatarUrl },
    });

    return { avatarUrl };
  }

  /**
   * POST /uploads/document
   * Multer field name: "document"
   * Stores document reference on TeacherProfile.verificationDocs (append-only
   * by type — re-uploading the same docType replaces the previous file).
   */
  @Post('document')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  @UseInterceptors(
    FileInterceptor('document', {
      storage: documentStorage,
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(pdf|jpg|jpeg|png)$/)) {
          return cb(
            new Error('Only PDF, JPG, and PNG files are allowed') as any,
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for docs
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { docType: string },
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('No file provided.');
    if (!body.docType) throw new BadRequestException('docType is required.');
    if (!REQUIRED_DOC_TYPES.has(body.docType)) {
      throw new BadRequestException('Unrecognized document type.');
    }

    const docUrl = (file as any).path ?? (file as any).secure_url;

    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId: req.user.userId },
      select: { id: true, verificationDocs: true },
    });
    if (!profile) throw new BadRequestException('Teacher profile not found.');

    const existing = (profile.verificationDocs as any[]) ?? [];
    const updated = existing.filter((d: any) => d.type !== body.docType);
    updated.push({
      type: body.docType,
      url: docUrl,
      name: file.originalname,
      uploadedAt: new Date().toISOString(),
    });

    await this.prisma.teacherProfile.update({
      where: { id: profile.id },
      data: { verificationDocs: updated },
    });

    return { url: docUrl, docType: body.docType, name: file.originalname };
  }

  /**
   * POST /uploads/proof
   * Multer field name: "proof"
   * Ad-hoc evidence upload (e.g. a student/parent-requested reschedule proof)
   * — just returns the stored URL, does not attach to any profile record.
   * Teacher-only today since the only caller is the reschedule flow.
   */
  @Post('proof')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  @UseInterceptors(
    FileInterceptor('proof', {
      storage: documentStorage,
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(pdf|jpg|jpeg|png)$/)) {
          return cb(
            new Error('Only PDF, JPG, and PNG files are allowed') as any,
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadProof(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided.');
    const url = (file as any).path ?? (file as any).secure_url;
    return { url, name: file.originalname };
  }
}
