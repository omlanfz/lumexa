// FILE PATH: server/src/certificates/certificates-public.controller.ts
//
// The public verification endpoint behind /verify/<certificate id> (the page the
// QR code opens). No login: anyone with a certificate can check it.
//
// It returns certificate facts only (see CertificatesService.verify) — never an
// email address, phone number, date of birth or any academic record. It is
// rate-limited (the IDs are not guessable, but the endpoint should not be a
// free lookup oracle either) and never cached, because a certificate can be
// revoked or replaced at any time and the page must say so immediately.

import { Controller, Get, Header, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  LIMIT_WINDOW_MS,
  PUBLIC_VERIFY_LIMIT_PER_MINUTE,
} from './certificate-limits';
import { CertificatesService } from './certificates.service';

@Controller('certificates/verify')
export class CertificatesPublicController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get(':certificateId')
  @Throttle({
    default: {
      limit: PUBLIC_VERIFY_LIMIT_PER_MINUTE,
      ttl: LIMIT_WINDOW_MS,
    },
  })
  @Header('Cache-Control', 'no-store, max-age=0')
  verify(@Param('certificateId') certificateId: string) {
    return this.certificates.verify(certificateId);
  }
}
