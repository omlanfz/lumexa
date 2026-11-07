// FILE PATH: server/src/certificates/certificates.controller.ts
//
// What a STUDENT can do with certificates: read their own, download the stored
// files, and mark the "your certificate is ready" card as seen. Nothing that
// creates, changes or removes a certificate is reachable from here.
//
// Teachers have no certificate routes at all: every route below requires the
// STUDENT role (and the admin routes require ADMIN).

import {
  Controller,
  Get,
  Header,
  Param,
  Post,
  Request,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  LIMIT_WINDOW_MS,
  SIGNED_IN_LIMIT_PER_MINUTE,
} from './certificate-limits';
import { CertificatesService } from './certificates.service';

interface AuthedRequest {
  user: { userId: string; role: string };
}

@Controller('certificates')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.STUDENT)
@Throttle({
  default: { limit: SIGNED_IN_LIMIT_PER_MINUTE, ttl: LIMIT_WINDOW_MS },
})
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  /** Every certificate issued to the student, with its verification status. */
  @Get('me')
  @Header('Cache-Control', 'private, no-store')
  listMine(@Request() req: AuthedRequest) {
    return this.certificates.listForStudent(req.user.userId);
  }

  /** The newest active certificate they have not seen yet, as
   * `{ certificate: {...} }` — or `{ certificate: null }` when there is none.
   * Always a JSON object (never an empty body) so the home card needs no special
   * case. */
  @Get('me/achievement')
  @Header('Cache-Control', 'private, no-store')
  async achievement(@Request() req: AuthedRequest) {
    return {
      certificate: await this.certificates.latestAchievement(req.user.userId),
    };
  }

  @Post('me/:certificateId/seen')
  markSeen(
    @Request() req: AuthedRequest,
    @Param('certificateId') certificateId: string,
  ) {
    return this.certificates.markSeen(req.user.userId, certificateId);
  }

  /** The stored PDF — read, never regenerated. */
  @Get('me/:certificateId/pdf')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async pdf(
    @Request() req: AuthedRequest,
    @Param('certificateId') certificateId: string,
  ) {
    return this.file(req, certificateId, 'pdf');
  }

  /** The stored high-resolution PNG. */
  @Get('me/:certificateId/image')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async image(
    @Request() req: AuthedRequest,
    @Param('certificateId') certificateId: string,
  ) {
    return this.file(req, certificateId, 'png');
  }

  private async file(
    req: AuthedRequest,
    certificateId: string,
    kind: 'pdf' | 'png',
  ) {
    const file = await this.certificates.readFile(certificateId, kind, {
      role: 'STUDENT',
      userId: req.user.userId,
    });
    return new StreamableFile(file.body, {
      type: file.contentType,
      disposition: `attachment; filename="${file.fileName}"`,
    });
  }
}
