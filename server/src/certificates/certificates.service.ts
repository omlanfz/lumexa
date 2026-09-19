// FILE PATH: server/src/certificates/certificates.service.ts
//
// Issues a Certificate the moment a student passes a curriculum's Final
// Test (see AssessmentsService.recordViva, the sole place a FINAL_TEST
// attempt is graded — server/src/assessments/assessments.service.ts).
// Idempotent by construction: Certificate has @@unique([studentUserId,
// courseId]), so a duplicate call (e.g. the same event firing twice) just
// hits P2002 and no-ops, the same pattern StudentLedgerService uses for
// LESSON_COMPLETED rows.
//
// PDF generation is local (pdfkit — no headless-browser dependency), then
// uploaded to the same Cloudinary account verification documents already
// use (resource_type 'raw' + a signed delivery URL — see
// server/src/lib/cloudinary.ts's doc comment for why PDFs need that).

import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { cloudinary, signedDocumentUrl } from '../lib/cloudinary';
import {
  CURRICULUM_CATALOG,
  getNextRecommendedCurriculum,
} from './curriculum-progression';

const CURRICULUM_PDF_DIR = path.join(__dirname, '../../assets/curriculum-pdfs');

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async listForStudent(studentUserId: string) {
    return this.prisma.certificate.findMany({
      where: { studentUserId },
      orderBy: { issuedAt: 'desc' },
    });
  }

  /** Call after any event that might mean a student just finished a
   * curriculum's Final Test with a passing grade. Safe to call speculatively
   * — it re-derives pass/fail from the DB itself and no-ops if the student
   * hasn't actually passed, or already has a certificate for this course. */
  async checkAndIssueCertificate(
    studentUserId: string,
    courseId: string,
  ): Promise<void> {
    const existing = await this.prisma.certificate.findUnique({
      where: { studentUserId_courseId: { studentUserId, courseId } },
      select: { id: true },
    });
    if (existing) return;

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, slug: true, title: true, sessions: true },
    });
    if (!course || !CURRICULUM_CATALOG[course.slug]) return; // custom/one-off course — no certificate template for it

    const finalTestLesson = await this.prisma.lesson.findFirst({
      where: { courseId, type: 'FINAL_TEST' },
      select: { assessment: { select: { id: true } } },
    });
    if (!finalTestLesson?.assessment) return;

    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        assessmentId: finalTestLesson.assessment.id,
        studentUserId,
        status: 'GRADED',
      },
      orderBy: { gradedAt: 'desc' },
      select: {
        passed: true,
        totalScore: true,
        totalMaxScore: true,
        gradedAt: true,
      },
    });
    if (!attempt?.passed) return;

    const student = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: { fullName: true, email: true, billingContactEmail: true },
    });
    if (!student) return;

    const completedLessons = await this.prisma.scheduledLesson.count({
      where: { studentUserId, courseId, status: 'COMPLETED' },
    });

    const priorCertificates = await this.prisma.certificate.findMany({
      where: { studentUserId },
      select: { courseId: true },
    });
    const priorCourses = await this.prisma.course.findMany({
      where: { id: { in: priorCertificates.map((c) => c.courseId) } },
      select: { slug: true },
    });
    const completedSlugs = [...priorCourses.map((c) => c.slug), course.slug];
    const recommended = getNextRecommendedCurriculum(
      course.slug,
      completedSlugs,
    );

    const certificateNumber = this.generateCertificateNumber();
    const pdfBuffer = await this.renderCertificatePdf({
      studentName: student.fullName,
      courseTitle: course.title,
      certificateNumber,
      issuedAt: new Date(),
    });

    let pdfUrl: string;
    try {
      pdfUrl = await this.uploadCertificatePdf(pdfBuffer, certificateNumber);
    } catch (err) {
      this.logger.error(
        `Failed to upload certificate PDF for student ${studentUserId}/course ${courseId}: ${err}`,
      );
      return; // don't issue a Certificate row with no retrievable PDF
    }

    const progressSummaryHtml = `
      <p style="margin: 0 0 6px;"><strong>📚 Lessons completed:</strong> ${completedLessons} / ${course.sessions}</p>
      <p style="margin: 0 0 6px;"><strong>🏆 Final Test score:</strong> ${Math.round(attempt.totalScore ?? 0)}%</p>
      <p style="margin: 0;"><strong>📅 Completed on:</strong> ${(attempt.gradedAt ?? new Date()).toLocaleDateString('en-US', { dateStyle: 'long' } as any)}</p>
    `;

    let certificate;
    try {
      certificate = await this.prisma.certificate.create({
        data: {
          studentUserId,
          courseId,
          courseName: course.title,
          certificateNumber,
          pdfUrl,
          recommendedCourseId: recommended?.slug ?? null,
          recommendedCourseName: recommended?.title ?? null,
          metadata: {
            completedLessons,
            totalLessons: course.sessions,
            finalTestScorePct: attempt.totalScore,
          } as object,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') return; // issued concurrently by another trigger — idempotent no-op
      throw err;
    }

    const attachments = [
      { filename: `Lumexa-Certificate-${certificateNumber}.pdf`, path: pdfUrl },
    ];
    const recommendedPdfPath = recommended
      ? path.join(CURRICULUM_PDF_DIR, recommended.pdfFile)
      : null;
    if (recommendedPdfPath && fs.existsSync(recommendedPdfPath)) {
      attachments.push({
        filename: `${recommended!.title}-Curriculum.pdf`,
        path: recommendedPdfPath,
      });
    }

    const to = student.billingContactEmail || student.email;
    this.notifications
      .sendCertificateIssuedEmail(
        to,
        {
          studentUserId,
          courseId,
          studentName: student.fullName,
          billingContactName: student.fullName,
          courseName: course.title,
          progressSummaryHtml,
          recommendedCourseName: recommended?.title ?? null,
          recommendedCourseBlurb: recommended?.blurb ?? null,
        },
        attachments,
      )
      .catch((err) =>
        this.logger.error(
          `Failed to send certificate email for ${certificate.id}: ${err}`,
        ),
      );
  }

  private generateCertificateNumber(): string {
    const year = new Date().getFullYear();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `LMX-${year}-${random}`;
  }

  private renderCertificatePdf(data: {
    studentName: string;
    courseTitle: string;
    certificateNumber: string;
    issuedAt: Date;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margin: 0,
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const width = doc.page.width;
      const height = doc.page.height;

      doc.rect(0, 0, width, height).fill('#0f172a');
      doc
        .rect(24, 24, width - 48, height - 48)
        .lineWidth(2)
        .stroke('#5eead4');

      doc
        .fillColor('#5eead4')
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('🚀 LUMEXA', 0, 70, { align: 'center' });

      doc
        .fillColor('#e2e8f0')
        .fontSize(16)
        .font('Helvetica')
        .text('Certificate of Completion', 0, 120, { align: 'center' });

      doc
        .fillColor('#94a3b8')
        .fontSize(12)
        .text('This certifies that', 0, 170, { align: 'center' });

      doc
        .fillColor('#ffffff')
        .fontSize(36)
        .font('Helvetica-Bold')
        .text(data.studentName, 0, 195, { align: 'center' });

      doc
        .fillColor('#94a3b8')
        .fontSize(12)
        .font('Helvetica')
        .text('has successfully completed', 0, 250, { align: 'center' });

      doc
        .fillColor('#5eead4')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text(data.courseTitle, 0, 275, { align: 'center' });

      doc
        .fillColor('#94a3b8')
        .fontSize(11)
        .font('Helvetica')
        .text(
          `Issued ${data.issuedAt.toLocaleDateString('en-US', { dateStyle: 'long' } as any)} · Certificate No. ${data.certificateNumber}`,
          0,
          height - 90,
          { align: 'center' },
        );

      doc.end();
    });
  }

  private async uploadCertificatePdf(
    buffer: Buffer,
    certificateNumber: string,
  ): Promise<string> {
    const dataUri = `data:application/pdf;base64,${buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: 'raw',
      folder: 'lumexa/certificates',
      public_id: certificateNumber,
    });
    return signedDocumentUrl({
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: 'raw',
    });
  }
}
