// FILE PATH: server/src/uploads/uploads.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../prisma.service';

@Controller('uploads')
@UseGuards(AuthGuard('jwt'))
export class UploadsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * POST /uploads/avatar
   * Uploads a profile picture and stores the URL on the User record.
   * Accepts: multipart/form-data with field name "avatar"
   */
  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const avatarUrl = `/uploads/avatars/${file.filename}`;

    await this.prisma.user.update({
      where: { id: req.user.userId },
      data: { avatarUrl },
    });

    return { avatarUrl };
  }
}
