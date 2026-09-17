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
//
// `format: 'jpg'` forces Cloudinary to transcode whatever it receives (incl.
// HEIC/HEIF — the default format iPhone cameras save photos in, which every
// browser and most non-Apple software fails to render) into a normal JPEG.
// Without this, a teacher uploading a phone-camera photo either gets
// rejected outright or ends up with an avatar URL nothing can display.
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'lumexa/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'],
    format: 'jpg',
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
    ],
  } as any,
});

// Verification documents (NID, birth certificate, degree certs, etc.):
// PDFs and photos of physical documents, stored as-is — no cropping.
//
// IMPORTANT: resource_type must be 'raw', not 'auto'. Cloudinary auto-detects
// PDFs as an "image" resource, and accounts created after April 2024 have
// "Restricted media types" security enabled by default, which blocks public
// delivery of PDFs served through the image/upload URL scheme (401
// Unauthorized). 'raw' delivers the file byte-for-byte via /raw/upload/ and
// is not affected by that restriction, so uploaded verification docs are
// actually viewable — this matters a lot since Operations can't verify a
// teacher's identity docs (and the teacher can't start teaching) if the
// "View" link 401s.
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: (async (_req: any, file: Express.Multer.File) => ({
    folder: 'lumexa/documents',
    // Only PDFs need the 'raw' workaround above — plain photos of physical
    // documents are unaffected by the restriction and keep normal 'image'
    // delivery so they still render inline in a browser tab.
    resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
    allowed_formats: ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'heif'],
    // Same phone-camera HEIC/HEIF problem as avatars applies here — a
    // teacher photographing their NID/certificate with an iPhone would
    // otherwise upload a file nobody (including Operations, reviewing for
    // verification) can open. Never transcode an actual PDF.
    ...(file.mimetype !== 'application/pdf' && { format: 'jpg' }),
  })) as any,
});

const REQUIRED_DOC_TYPES = new Set([
  'nid',
  'birth_certificate',
  'bachelor_certificate',
  'master_certificate',
  'ielts_certificate',
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
      // Accept any image/* mimetype (jpg/png/webp/heic/heif/gif/etc. —
      // phone cameras and browsers report a wide range) and let Cloudinary's
      // allowed_formats + format conversion above do the real validation.
      // IMPORTANT: reject with a NestJS HttpException (BadRequestException),
      // never a plain Error — multer's fileFilter passes the error straight
      // to Nest's exception handling, and a plain Error isn't recognized as
      // an HTTP error, so it falls through as an unhandled 500 ("An
      // unexpected error occurred") instead of a proper 400 with a message
      // the teacher can actually act on.
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\//)) {
          return cb(
            new BadRequestException(
              'Only image files are allowed.',
            ) as unknown as Error,
            false,
          );
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
      // See the comment on the avatar fileFilter above: HEIC/HEIF (the
      // default iPhone camera format) has to be accepted here too since
      // teachers commonly photograph physical documents with a phone, and
      // the rejection has to be a proper HttpException or it surfaces to
      // the teacher as a useless "unexpected error occurred" 500.
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(pdf|jpg|jpeg|png|heic|heif)$/)) {
          return cb(
            new BadRequestException(
              'Only PDF, JPG, and PNG files are allowed.',
            ) as unknown as Error,
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
    // multer-storage-cloudinary sets `filename` to the Cloudinary
    // `public_id` it uploaded under (see CloudinaryStorage._handleFile) —
    // stored so document delivery can always be signed correctly (see
    // signedDocumentUrl in lib/cloudinary.ts), regardless of URL shape.
    const publicId = (file as any).filename as string | undefined;
    const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image';

    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId: req.user.userId },
      select: { id: true, verificationDocs: true, docsLocked: true },
    });
    if (!profile) throw new BadRequestException('Teacher profile not found.');
    if (profile.docsLocked) {
      throw new BadRequestException(
        'Your documents are locked after verification. Contact support to make changes.',
      );
    }

    const existing = (profile.verificationDocs as any[]) ?? [];
    const updated = existing.filter((d: any) => d.type !== body.docType);
    updated.push({
      type: body.docType,
      url: docUrl,
      name: file.originalname,
      uploadedAt: new Date().toISOString(),
      publicId,
      resourceType,
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
        if (!file.mimetype.match(/\/(pdf|jpg|jpeg|png|heic|heif)$/)) {
          return cb(
            new BadRequestException(
              'Only PDF, JPG, and PNG files are allowed.',
            ) as unknown as Error,
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
