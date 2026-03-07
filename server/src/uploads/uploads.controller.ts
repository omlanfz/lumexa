// FILE PATH: server/src/uploads/uploads.controller.ts
// CHANGE: Handle Cloudinary file object (path = secure_url, not local path)
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
import { PrismaService } from '../prisma.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

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
  @UseInterceptors(FileInterceptor('avatar')) // CHANGE: field name is "avatar"
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file)
      throw new BadRequestException(
        'No file provided. Send multipart/form-data with field "avatar".',
      );

    // CHANGE: Cloudinary returns path as the secure_url
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
   * Stores document on TeacherProfile
   */
  @Post('document')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  @UseInterceptors(
    FileInterceptor('document', {
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

    const docUrl = (file as any).path ?? (file as any).secure_url;

    // Store document reference on TeacherProfile
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
}
