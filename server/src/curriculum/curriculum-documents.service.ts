// FILE PATH: server/src/curriculum/curriculum-documents.service.ts
//
// Two admin-only document generators built on the same local, free
// libraries already used elsewhere in this codebase (pdfkit for the
// certificate PDF, exceljs for the payout report — see those files' header
// comments) so nothing new needs to be installed or paid for:
//
//   1. generateCustomCurriculumPdf — a branded, parent-ready PDF for one
//      admin-built custom curriculum (student info, lesson breakdown,
//      projects, homework/tests, totals). Uploaded to Cloudinary the same
//      way CertificatesService does, and the URL is cached on
//      Course.curriculumPdfUrl so re-opening it doesn't require regenerating.
//   2. buildDefaultCurriculumSummaryWorkbook — one .xlsx row per DEFAULT
//      (non-custom) curriculum, streamed straight to the response (no
//      storage needed — see CurriculumDocumentsController).

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { SessionType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { cloudinary, signedDocumentUrl } from '../lib/cloudinary';

const TEAL = '#0d9488';
const NAVY = '#0f172a';
const MUTED = '#64748b';

@Injectable()
export class CurriculumDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Custom curriculum PDF ────────────────────────────────────────────────

  async generateCustomCurriculumPdf(
    courseId: string,
  ): Promise<{ url: string }> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        category: true,
        ageMin: true,
        ageMax: true,
        sessions: true,
        priceCents: true,
        isCustom: true,
        assignedStudents: { select: { fullName: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found.');
    if (!course.isCustom) {
      throw new BadRequestException(
        'Only custom curriculums generate a curriculum PDF.',
      );
    }

    const [modules, looseLessons] = await Promise.all([
      this.prisma.courseModule.findMany({
        where: { courseId },
        orderBy: { order: 'asc' },
        include: {
          lessons: { orderBy: { order: 'asc' }, include: { project: true } },
        },
      }),
      this.prisma.lesson.findMany({
        where: { courseId, moduleId: null },
        orderBy: { order: 'asc' },
        include: { project: true },
      }),
    ]);

    const lessons = [
      ...modules.flatMap((m) => m.lessons),
      ...looseLessons,
    ].sort((a, b) => a.order - b.order);

    const projectCount = new Set(
      lessons.map((l) => l.projectId).filter(Boolean),
    ).size;
    const testCount = lessons.filter(
      (l) => l.type !== SessionType.LEARNING,
    ).length;
    const homeworkCount = lessons.filter((l) => !!l.homework).length;
    const studentNames = course.assignedStudents.map((s) => s.fullName);

    const buffer = await this.renderCurriculumPdf({
      title: course.title,
      studentNames,
      category: course.category,
      ageMin: course.ageMin,
      ageMax: course.ageMax,
      priceCents: course.priceCents,
      lessons: lessons.map((l) => ({
        order: l.order,
        title: l.title,
        type: l.type,
        objectives: l.objectives,
        projectTitle: l.project?.title ?? null,
        checkpoint: l.checkpoint,
        homework: l.homework,
        duration: l.duration,
      })),
      totals: {
        lessonCount: lessons.length,
        projectCount,
        testCount,
        homeworkCount,
      },
    });

    const url = await this.uploadCurriculumPdf(buffer, courseId);
    await this.prisma.course.update({
      where: { id: courseId },
      data: { curriculumPdfUrl: url },
    });
    return { url };
  }

  private renderCurriculumPdf(data: {
    title: string;
    studentNames: string[];
    category: string;
    ageMin: number;
    ageMax: number;
    priceCents: number | null;
    lessons: {
      order: number;
      title: string;
      type: SessionType;
      objectives: string[];
      projectTitle: string | null;
      checkpoint: string | null;
      homework: string | null;
      duration: number;
    }[];
    totals: {
      lessonCount: number;
      projectCount: number;
      testCount: number;
      homeworkCount: number;
    };
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // bufferPages is required for the page-numbering footer loop below —
      // without it, pdfkit only keeps the current page buffered once a new
      // one is added, so switchToPage(0) throws "out of bounds" the moment
      // a curriculum spans more than one page (pdfkit's default streaming
      // behavior, not something bufferedPageRange alone works around).
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header ──
      doc
        .fillColor(TEAL)
        .font('Helvetica-Bold')
        .fontSize(20)
        .text('🚀 LUMEXA', { align: 'left' });
      doc
        .fillColor(NAVY)
        .font('Helvetica-Bold')
        .fontSize(16)
        .text('Custom Curriculum', { align: 'left' });
      doc
        .fillColor(MUTED)
        .font('Helvetica')
        .fontSize(9)
        .text(
          `Generated ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' } as any)}`,
          {
            align: 'left',
          },
        );
      doc.moveDown(1);
      doc
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();
      doc.moveDown(1);

      // ── Curriculum info box ──
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(18).text(data.title);
      doc.moveDown(0.3);
      if (data.studentNames.length > 0) {
        doc
          .fillColor(MUTED)
          .font('Helvetica')
          .fontSize(11)
          .text(`Prepared for: ${data.studentNames.join(', ')}`);
      }
      doc
        .fillColor(MUTED)
        .font('Helvetica')
        .fontSize(11)
        .text(
          `${data.category} · Ages ${data.ageMin}–${data.ageMax}${
            data.priceCents
              ? ` · ৳${(data.priceCents / 100).toLocaleString()}`
              : ''
          }`,
        );
      doc.moveDown(1);

      // ── Totals row ──
      const totalsLine = [
        `${data.totals.lessonCount} session${data.totals.lessonCount === 1 ? '' : 's'}`,
        `${data.totals.projectCount} project${data.totals.projectCount === 1 ? '' : 's'}`,
        `${data.totals.testCount} test${data.totals.testCount === 1 ? '' : 's'}/assessment${data.totals.testCount === 1 ? '' : 's'}`,
        `${data.totals.homeworkCount} homework assignment${data.totals.homeworkCount === 1 ? '' : 's'}`,
      ].join('   ·   ');
      doc
        .fillColor(TEAL)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(totalsLine.toUpperCase());
      doc.moveDown(1.2);

      // ── Lesson-by-lesson breakdown ──
      doc
        .fillColor(NAVY)
        .font('Helvetica-Bold')
        .fontSize(13)
        .text('Lesson Breakdown');
      doc.moveDown(0.5);

      for (const lesson of data.lessons) {
        if (doc.y > doc.page.height - 140) doc.addPage();

        const isTest = lesson.type !== SessionType.LEARNING;
        doc
          .fillColor(NAVY)
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(
            `Session ${lesson.order}: ${lesson.title}${isTest ? '  (Assessment)' : ''}`,
          );

        if (lesson.objectives.length > 0) {
          doc
            .fillColor('#334155')
            .font('Helvetica')
            .fontSize(9.5)
            .text(lesson.objectives.map((o) => `•  ${o}`).join('\n'), {
              indent: 10,
            });
        }
        if (lesson.projectTitle) {
          doc
            .fillColor(TEAL)
            .font('Helvetica-Bold')
            .fontSize(9.5)
            .text(
              `Project: ${lesson.projectTitle}${lesson.checkpoint ? ` — ${lesson.checkpoint}` : ''}`,
              {
                indent: 10,
              },
            );
        }
        if (lesson.homework) {
          doc
            .fillColor(MUTED)
            .font('Helvetica-Oblique')
            .fontSize(9)
            .text('Includes take-home assignment', { indent: 10 });
        }
        doc.moveDown(0.7);
      }

      // ── Footer page numbers ──
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc
          .fillColor(MUTED)
          .font('Helvetica')
          .fontSize(8)
          .text(
            `Lumexa · Page ${i + 1} of ${pages.count}`,
            50,
            doc.page.height - 40,
            {
              width: 495,
              align: 'center',
            },
          );
      }

      doc.end();
    });
  }

  private async uploadCurriculumPdf(
    buffer: Buffer,
    courseId: string,
  ): Promise<string> {
    const dataUri = `data:application/pdf;base64,${buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: 'raw',
      folder: 'lumexa/custom-curriculums',
      public_id: courseId,
      overwrite: true,
    });
    return signedDocumentUrl({
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: 'raw',
    });
  }

  // ─── Default curriculum summary (.xlsx) ───────────────────────────────────
  //
  // Every non-custom (isCustom: false) Course row — automatically covers any
  // future default curriculum added later, since nothing here hard-codes the
  // current 7 (Odyssey + 6 pathways). "Number of courses" = CourseModule
  // count (each module is a real 8-lesson sub-course, e.g. "Python and AI
  // Foundations" — see the CourseModule model's doc comment).

  async buildDefaultCurriculumSummaryWorkbook(): Promise<Buffer> {
    const courses = await this.prisma.course.findMany({
      where: { isCustom: false },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
      include: {
        modules: { select: { id: true, projects: { select: { id: true } } } },
        lessons: { select: { type: true } },
      },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Lumexa AI School';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Default Curriculums');
    const COLUMN_COUNT = 7;
    sheet.columns = [
      { key: 'name', width: 30 },
      { key: 'ages', width: 14 },
      { key: 'courses', width: 10 },
      { key: 'lessons', width: 10 },
      { key: 'projects', width: 10 },
      { key: 'tests', width: 18 },
      { key: 'price', width: 14 },
    ];

    // ── Branding header ──
    sheet.mergeCells(1, 1, 1, COLUMN_COUNT);
    const brandCell = sheet.getCell(1, 1);
    brandCell.value = '🚀 Lumexa AI School';
    brandCell.font = { bold: true, size: 16, color: { argb: 'FF0D9488' } };

    sheet.mergeCells(2, 1, 2, COLUMN_COUNT);
    const subtitleCell = sheet.getCell(2, 1);
    subtitleCell.value = `Default Curriculum Summary · Generated ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' } as any)}`;
    subtitleCell.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };

    // ── Table header ──
    const HEADER_ROW = 4;
    const headerRow = sheet.getRow(HEADER_ROW);
    headerRow.values = [
      'Curriculum Name',
      'Target Ages',
      'Courses',
      'Lessons',
      'Projects',
      'Tests/Assessments',
      'Price (BDT)',
    ];
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle' };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D9488' },
      };
    });

    for (const course of courses) {
      const testLessons = course.lessons.filter(
        (l) => l.type !== SessionType.LEARNING,
      ).length;
      const projectCount = course.modules.reduce(
        (sum, m) => sum + m.projects.length,
        0,
      );

      sheet.addRow({
        name: course.title.replace(/\s*Path$/i, '').trim(),
        ages: `${course.ageMin}–${course.ageMax}`,
        courses: course.modules.length,
        // Lessons = every session (learning + tests/assessments), e.g. a
        // 28-session pathway shows 28, not just its 24 learning sessions.
        lessons: course.sessions,
        projects: projectCount,
        tests: testLessons,
        price: course.priceCents ? course.priceCents / 100 : 'TBD',
      });
    }

    sheet.getColumn('price').numFmt = '#,##0';
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber < HEADER_ROW) return;
      row.eachCell((cell) => {
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
