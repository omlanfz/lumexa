// FILE PATH: server/src/curriculum/curriculum-documents.service.ts
//
// Two admin-only .xlsx generators, both built on exceljs (already used
// elsewhere in this codebase — see payout-report.ts) so nothing new needs
// to be installed or paid for, and both streamed straight to the response
// with no storage/upload step needed (see CurriculumController):
//
//   1. buildCustomCurriculumWorkbook — one admin-built custom curriculum: a
//      Summary sheet (student info, totals) plus a full Lesson Breakdown
//      sheet, branded to match buildDefaultCurriculumSummaryWorkbook.
//   2. buildDefaultCurriculumSummaryWorkbook — one row per DEFAULT
//      (non-custom) curriculum.

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import { SessionType } from '@prisma/client';
import { PrismaService } from '../prisma.service';

const LUMEXA_TEAL = 'FF0D9488';
const HEADER_WHITE = 'FFFFFFFF';
const MUTED_GREY = 'FF64748B';

@Injectable()
export class CurriculumDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  private brandHeader(
    sheet: ExcelJS.Worksheet,
    columnCount: number,
    subtitle: string,
  ) {
    sheet.mergeCells(1, 1, 1, columnCount);
    const brandCell = sheet.getCell(1, 1);
    brandCell.value = '🚀 Lumexa AI School';
    brandCell.font = { bold: true, size: 16, color: { argb: LUMEXA_TEAL } };

    sheet.mergeCells(2, 1, 2, columnCount);
    const subtitleCell = sheet.getCell(2, 1);
    subtitleCell.value = subtitle;
    subtitleCell.font = { italic: true, size: 10, color: { argb: MUTED_GREY } };
  }

  private brandTableHeader(
    sheet: ExcelJS.Worksheet,
    rowIndex: number,
    headers: string[],
  ) {
    const row = sheet.getRow(rowIndex);
    row.values = headers;
    row.font = { bold: true, color: { argb: HEADER_WHITE } };
    row.alignment = { vertical: 'middle' };
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: LUMEXA_TEAL },
      };
    });
  }

  // ─── Custom curriculum workbook (.xlsx) ───────────────────────────────────
  //
  // Everything an admin/parent needs about one admin-built custom
  // curriculum: a Summary sheet (who it's for, totals) and a full
  // Lesson Breakdown sheet (every session in the sequence the admin built,
  // with objectives/project/homework flag) — replaces the earlier PDF
  // generator with a simpler, dependency-free format the admin can also
  // open and skim in Excel/Sheets directly.

  async buildCustomCurriculumWorkbook(
    courseId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        category: true,
        ageMin: true,
        ageMax: true,
        priceCents: true,
        isCustom: true,
        assignedStudents: { select: { fullName: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found.');
    if (!course.isCustom) {
      throw new BadRequestException(
        'Only custom curriculums generate this export.',
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

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Lumexa AI School';
    workbook.created = new Date();

    // ── Summary sheet ──
    const summary = workbook.addWorksheet('Summary');
    summary.columns = [
      { key: 'field', width: 26 },
      { key: 'value', width: 46 },
    ];
    this.brandHeader(
      summary,
      2,
      `Custom Curriculum Summary · Generated ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' } as any)}`,
    );
    this.brandTableHeader(summary, 4, ['Field', 'Value']);

    const summaryRows: [string, string | number][] = [
      ['Curriculum Name', course.title],
      [
        'Prepared For',
        course.assignedStudents.map((s) => s.fullName).join(', ') || '—',
      ],
      ['Category', course.category],
      ['Target Ages', `${course.ageMin}–${course.ageMax}`],
      ['Price (BDT)', course.priceCents ? course.priceCents / 100 : 'TBD'],
      ['Courses (Modules)', modules.length],
      ['Lessons (Total Sessions)', lessons.length],
      ['Projects', projectCount],
      ['Tests / Assessments', testCount],
      ['Lessons with Homework', homeworkCount],
    ];
    for (const [field, value] of summaryRows) {
      summary.addRow({ field, value });
    }
    summary.eachRow((row, rowNumber) => {
      if (rowNumber < 4) return;
      row.eachCell((cell) => {
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });

    // ── Lesson Breakdown sheet ──
    const breakdown = workbook.addWorksheet('Lesson Breakdown');
    const BREAKDOWN_COLS = 6;
    breakdown.columns = [
      { key: 'order', width: 8 },
      { key: 'title', width: 36 },
      { key: 'type', width: 16 },
      { key: 'objectives', width: 60 },
      { key: 'project', width: 28 },
      { key: 'homework', width: 14 },
    ];
    this.brandHeader(breakdown, BREAKDOWN_COLS, course.title);
    this.brandTableHeader(breakdown, 4, [
      'Session #',
      'Title',
      'Type',
      'Objectives',
      'Project / Checkpoint',
      'Homework',
    ]);

    for (const lesson of lessons) {
      breakdown.addRow({
        order: lesson.order,
        title: lesson.title,
        type: lesson.type.replace('_', ' '),
        objectives: lesson.objectives.join(' | '),
        project: lesson.project
          ? `${lesson.project.title}${lesson.checkpoint ? ` — ${lesson.checkpoint}` : ''}`
          : (lesson.checkpoint ?? ''),
        homework: lesson.homework ? 'Yes' : 'No',
      });
    }
    breakdown.getColumn('objectives').alignment = {
      wrapText: true,
      vertical: 'top',
    };
    breakdown.eachRow((row, rowNumber) => {
      if (rowNumber < 4) return;
      row.eachCell((cell) => {
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        cell.alignment = { ...cell.alignment, vertical: 'top' };
      });
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const filename = `${course.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-curriculum.xlsx`;
    return { buffer: Buffer.from(arrayBuffer), filename };
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

    this.brandHeader(
      sheet,
      COLUMN_COUNT,
      `Default Curriculum Summary · Generated ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' } as any)}`,
    );
    const HEADER_ROW = 4;
    this.brandTableHeader(sheet, HEADER_ROW, [
      'Curriculum Name',
      'Target Ages',
      'Courses',
      'Lessons',
      'Projects',
      'Tests/Assessments',
      'Price (BDT)',
    ]);

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
