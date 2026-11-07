import { Module } from '@nestjs/common';
import { CertificateEmailService } from './certificate-email.service';
import {
  CertificateRendererService,
  CERTIFICATE_RENDERER,
} from './certificate-renderer.service';
import { CertificateReviewsService } from './certificate-reviews.service';
import {
  CertificateStorageService,
  CERTIFICATE_STORAGE,
} from './certificate-storage.service';
import { CertificatesAdminController } from './certificates-admin.controller';
import { CertificatesController } from './certificates.controller';
import { CertificatesPublicController } from './certificates-public.controller';
import { CertificatesService } from './certificates.service';

// PrismaService, EmailService and NotificationsService come from their global
// modules. This module deliberately imports nothing from the classroom, the
// assessments or the teachers: the class system calls INTO it (see
// ClassFinalizationService → CertificateReviewsService), never the reverse.
@Module({
  controllers: [
    CertificatesController,
    CertificatesPublicController,
    CertificatesAdminController,
  ],
  providers: [
    CertificatesService,
    CertificateReviewsService,
    CertificateEmailService,
    CertificateStorageService,
    CertificateRendererService,
    { provide: CERTIFICATE_STORAGE, useExisting: CertificateStorageService },
    { provide: CERTIFICATE_RENDERER, useExisting: CertificateRendererService },
  ],
  exports: [CertificatesService, CertificateReviewsService],
})
export class CertificatesModule {}
