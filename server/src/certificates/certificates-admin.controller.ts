// FILE PATH: server/src/certificates/certificates-admin.controller.ts
//
// The admin's Certificates section. ADMIN ONLY — teachers have no access, and
// there is deliberately no DELETE route anywhere: certificates and their files
// are permanent. A mistake is corrected with /replace (the original is kept), a
// withdrawn certificate with /revoke (status changes, files stay).
//
// Order matters below: fixed paths (status, summary, issued, reviews/…) are
// declared before the ":certificateId" routes so they are never mistaken for one.

import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CertificateStatus, Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  LIMIT_WINDOW_MS,
  SIGNED_IN_LIMIT_PER_MINUTE,
} from './certificate-limits';
import { CertificateReviewsService } from './certificate-reviews.service';
import { CertificatesService } from './certificates.service';
import {
  ApproveCertificateDto,
  DismissReviewDto,
  ReplaceCertificateDto,
  ResendCertificateEmailDto,
  RevokeCertificateDto,
} from './dto/certificate.dto';

interface AuthedRequest {
  user: { userId: string; role: string };
}
const actorOf = (req: AuthedRequest) => ({
  id: req.user.userId,
  role: req.user.role,
});

const STATUSES: CertificateStatus[] = ['ACTIVE', 'REVOKED', 'REPLACED'];

@Controller('admin/certificates')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
@Throttle({
  default: { limit: SIGNED_IN_LIMIT_PER_MINUTE, ttl: LIMIT_WINDOW_MS },
})
export class CertificatesAdminController {
  constructor(
    private readonly certificates: CertificatesService,
    private readonly reviews: CertificateReviewsService,
  ) {}

  // ─── Overview ────────────────────────────────────────────────────────────

  /** Whether certificates can be issued right now, and if not why not. */
  @Get('status')
  status() {
    return this.certificates.readiness();
  }

  /** Counts for the tabs and the dashboard prompt. */
  @Get('summary')
  summary() {
    return this.reviews.summary();
  }

  // ─── Pending approvals ───────────────────────────────────────────────────

  @Get('reviews')
  listReviews(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.reviews.list({
      status: status === 'DISMISSED' ? 'DISMISSED' : 'PENDING',
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  /** Looks at the classes of every programme completed in the last `days` days
   * for a final class the live event missed. Safe to repeat. */
  @Post('reviews/scan')
  scan(@Query('days', new ParseIntPipe({ optional: true })) days?: number) {
    return this.reviews.reconcile(Math.min(3650, Math.max(1, days ?? 30)));
  }

  @Get('reviews/:reviewId')
  getReview(@Param('reviewId') reviewId: string) {
    return this.reviews.get(reviewId);
  }

  /** A watermarked picture of what would be printed. Never stored; no ID exists. */
  @Post('reviews/:reviewId/preview')
  @Header('Cache-Control', 'private, no-store')
  async preview(
    @Param('reviewId') reviewId: string,
    @Body() dto: ApproveCertificateDto,
  ) {
    const png = await this.certificates.preview(reviewId, dto);
    return new StreamableFile(png, {
      type: 'image/png',
      disposition: 'inline; filename="certificate-preview.png"',
    });
  }

  /** The approval. Everything that makes a certificate real happens here. */
  @Post('reviews/:reviewId/approve')
  approve(
    @Request() req: AuthedRequest,
    @Param('reviewId') reviewId: string,
    @Body() dto: ApproveCertificateDto,
  ) {
    return this.certificates.approve(reviewId, dto, actorOf(req));
  }

  @Post('reviews/:reviewId/dismiss')
  dismiss(
    @Request() req: AuthedRequest,
    @Param('reviewId') reviewId: string,
    @Body() dto: DismissReviewDto,
  ) {
    return this.reviews.dismiss(reviewId, dto.reason.trim(), actorOf(req));
  }

  @Post('reviews/:reviewId/reopen')
  reopen(@Request() req: AuthedRequest, @Param('reviewId') reviewId: string) {
    return this.reviews.reopen(reviewId, actorOf(req));
  }

  // ─── Issued, revoked and replaced certificates ───────────────────────────

  @Get('issued')
  listIssued(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.certificates.listIssued({
      status: STATUSES.includes(status as CertificateStatus)
        ? (status as CertificateStatus)
        : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get(':certificateId')
  get(@Param('certificateId') certificateId: string) {
    return this.certificates.getForAdmin(certificateId);
  }

  @Get(':certificateId/history')
  history(@Param('certificateId') certificateId: string) {
    return this.certificates.history(certificateId);
  }

  /** The stored PDF (any status — the records are kept). `?inline=1` to view. */
  @Get(':certificateId/pdf')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async pdf(
    @Param('certificateId') certificateId: string,
    @Query('inline') inline?: string,
  ) {
    return this.file(certificateId, 'pdf', inline === '1');
  }

  @Get(':certificateId/image')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async image(
    @Param('certificateId') certificateId: string,
    @Query('inline') inline?: string,
  ) {
    return this.file(certificateId, 'png', inline === '1');
  }

  /** A correction: a NEW certificate (new ID, new files); the original is kept
   * and marked Replaced. */
  @Post(':certificateId/replace')
  replace(
    @Request() req: AuthedRequest,
    @Param('certificateId') certificateId: string,
    @Body() dto: ReplaceCertificateDto,
  ) {
    return this.certificates.replace(certificateId, dto, actorOf(req));
  }

  /** Withdraws a certificate: verification says Revoked; the files stay. */
  @Post(':certificateId/revoke')
  revoke(
    @Request() req: AuthedRequest,
    @Param('certificateId') certificateId: string,
    @Body() dto: RevokeCertificateDto,
  ) {
    return this.certificates.revoke(certificateId, dto.reason, actorOf(req));
  }

  @Post(':certificateId/resend-email')
  resendEmail(
    @Request() req: AuthedRequest,
    @Param('certificateId') certificateId: string,
    @Body() dto: ResendCertificateEmailDto,
  ) {
    return this.certificates.resendEmail(
      certificateId,
      actorOf(req),
      dto.force === true,
    );
  }

  private async file(
    certificateId: string,
    kind: 'pdf' | 'png',
    inline: boolean,
  ) {
    const file = await this.certificates.readFile(certificateId, kind, {
      role: 'ADMIN',
    });
    return new StreamableFile(file.body, {
      type: file.contentType,
      disposition: `${inline ? 'inline' : 'attachment'}; filename="${file.fileName}"`,
    });
  }
}
