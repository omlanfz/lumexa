// FILE PATH: server/src/payouts/payout-report.ts
//
// Builds the monthly payout Excel workbook (Summary + Detail sheets) from a
// list of ledger entries. Pure formatting — the ledger itself remains the
// financial source of truth; this is only ever an export/statement.

import ExcelJS from 'exceljs';
import { PayoutEntryType } from '@prisma/client';

interface ReportEntry {
  createdAt: Date;
  type: PayoutEntryType;
  description: string;
  referenceId: string | null;
  amountCents: number;
  classStart: Date | null;
  classEnd: Date | null;
}

interface BuildReportParams {
  teacherName: string;
  month: number;
  year: number;
  entries: ReportEntry[];
}

const bdt = (cents: number) => cents / 100;
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export async function buildPayoutReportWorkbook(
  params: BuildReportParams,
): Promise<Buffer> {
  const { teacherName, month, year, entries } = params;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Lumexa';
  workbook.created = new Date();

  // ── Summary sheet ────────────────────────────────────────────────────────
  const summary = workbook.addWorksheet('Summary');
  summary.columns = [
    { header: 'Field', key: 'field', width: 28 },
    { header: 'Value', key: 'value', width: 28 },
  ];
  summary.getRow(1).font = { bold: true };

  const totals = {
    classes: 0,
    ptms: 0,
    conversions: 0,
    penalties: 0,
    adjustments: 0,
    finalPayoutCents: 0,
  };
  for (const e of entries) {
    totals.finalPayoutCents += e.amountCents;
    switch (e.type) {
      case PayoutEntryType.CLASS_COMPLETED:
        totals.classes += 1;
        break;
      case PayoutEntryType.PTM:
        totals.ptms += 1;
        break;
      case PayoutEntryType.CONVERSION:
        totals.conversions += 1;
        break;
      case PayoutEntryType.PENALTY:
        totals.penalties += e.amountCents;
        break;
      case PayoutEntryType.ADJUSTMENT:
        totals.adjustments += e.amountCents;
        break;
    }
  }

  summary.addRows([
    { field: 'Teacher name', value: teacherName },
    { field: 'Month', value: `${MONTH_NAMES[month - 1]} ${year}` },
    { field: 'Total classes', value: totals.classes },
    { field: 'Total PTMs', value: totals.ptms },
    { field: 'Total conversions', value: totals.conversions },
    { field: 'Total penalties (BDT)', value: bdt(totals.penalties) },
    { field: 'Total adjustments (BDT)', value: bdt(totals.adjustments) },
    { field: 'Final payout (BDT)', value: bdt(totals.finalPayoutCents) },
  ]);
  summary.getRow(8).font = { bold: true };

  // ── Detail sheet ─────────────────────────────────────────────────────────
  const detail = workbook.addWorksheet('Detail');
  detail.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Type', key: 'type', width: 18 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Reference', key: 'reference', width: 20 },
    { header: 'Class date/time', key: 'classTime', width: 26 },
    { header: 'Amount (BDT)', key: 'amount', width: 16 },
  ];
  detail.getRow(1).font = { bold: true };

  for (const e of entries) {
    const classTime =
      e.classStart && e.classEnd
        ? `${e.classStart.toLocaleString('en-US')} – ${e.classEnd.toLocaleTimeString('en-US')}`
        : '';
    detail.addRow({
      date: e.createdAt.toLocaleDateString('en-US'),
      type: e.type,
      description: e.description,
      reference: e.referenceId ?? '',
      classTime,
      amount: bdt(e.amountCents),
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
