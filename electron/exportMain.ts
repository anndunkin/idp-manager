import ExcelJS from 'exceljs';
import {
  Document, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType,
  BorderStyle, ShadingType, Packer,
} from 'docx';
import type { PlanWithItems, QuarterlyMilestone } from '../src/types/index';

const TEAL = '0D9488';
const TEAL_LIGHT = 'CCFBF1';
const HEADER_BG = '115E59';

// ─── Excel Export ─────────────────────────────────────────────────────────────

export async function exportToExcelBuffer(plan: PlanWithItems): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IDP Manager';
  workbook.created = new Date();

  // Sheet 1: Plan Overview
  const overviewSheet = workbook.addWorksheet('Plan Overview');
  overviewSheet.columns = [
    { header: 'Field', key: 'field', width: 25 },
    { header: 'Value', key: 'value', width: 45 },
  ];

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${HEADER_BG}` } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: {
      bottom: { style: 'medium', color: { argb: `FF${TEAL}` } },
    },
  };

  // Style header row
  ['A1', 'B1'].forEach(cell => {
    Object.assign(overviewSheet.getCell(cell), { style: headerStyle });
  });

  const overviewData = [
    ['Employee Name', plan.employee?.name ?? ''],
    ['Manager', plan.employee?.manager_name ?? ''],
    ['Job Title', plan.employee?.job_title ?? ''],
    ['Department', plan.employee?.department ?? ''],
    ['Plan Date', plan.plan_date],
    ['Plan Year', String(plan.plan_year)],
    ['Status', plan.status],
    ['Notes', plan.notes],
  ];

  overviewData.forEach(([field, value], idx) => {
    const row = overviewSheet.addRow([field, value]);
    if (idx % 2 === 0) {
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${TEAL_LIGHT}` } };
    }
    row.getCell(1).font = { bold: true };
  });

  // Sheet 2: Development Items
  const itemsSheet = workbook.addWorksheet('Development Items');
  itemsSheet.columns = [
    { header: 'Item #', key: 'num', width: 8 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Due Date', key: 'due_date', width: 12 },
    { header: 'Support Needed', key: 'support', width: 25 },
    { header: 'Q1 Status', key: 'q1_status', width: 15 },
    { header: 'Q1 %', key: 'q1_pct', width: 8 },
    { header: 'Q1 Notes', key: 'q1_notes', width: 20 },
    { header: 'Q2 Status', key: 'q2_status', width: 15 },
    { header: 'Q2 %', key: 'q2_pct', width: 8 },
    { header: 'Q2 Notes', key: 'q2_notes', width: 20 },
    { header: 'Q3 Status', key: 'q3_status', width: 15 },
    { header: 'Q3 %', key: 'q3_pct', width: 8 },
    { header: 'Q3 Notes', key: 'q3_notes', width: 20 },
    { header: 'Q4 Status', key: 'q4_status', width: 15 },
    { header: 'Q4 %', key: 'q4_pct', width: 8 },
    { header: 'Q4 Notes', key: 'q4_notes', width: 20 },
  ];

  // Style header row
  const headerRow = itemsSheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.style = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${HEADER_BG}` } },
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    };
  });
  headerRow.height = 30;

  plan.items.forEach((item, idx) => {
    const getMilestone = (q: number) =>
      item.milestones.find((m: QuarterlyMilestone) => m.quarter === q);

    const q1 = getMilestone(1);
    const q2 = getMilestone(2);
    const q3 = getMilestone(3);
    const q4 = getMilestone(4);

    const row = itemsSheet.addRow({
      num: idx + 1,
      description: item.item_description,
      due_date: item.due_date,
      support: item.support_needed,
      q1_status: q1?.status ?? 'Not Started',
      q1_pct: q1?.percent_complete ?? 0,
      q1_notes: q1?.notes ?? '',
      q2_status: q2?.status ?? 'Not Started',
      q2_pct: q2?.percent_complete ?? 0,
      q2_notes: q2?.notes ?? '',
      q3_status: q3?.status ?? 'Not Started',
      q3_pct: q3?.percent_complete ?? 0,
      q3_notes: q3?.notes ?? '',
      q4_status: q4?.status ?? 'Not Started',
      q4_pct: q4?.percent_complete ?? 0,
      q4_notes: q4?.notes ?? '',
    });

    if (idx % 2 === 0) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${TEAL_LIGHT}` } };
      });
    }
    row.getCell('description').alignment = { wrapText: true };
    row.getCell('support').alignment = { wrapText: true };
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

// ─── Word Export ──────────────────────────────────────────────────────────────

export async function exportToWordBuffer(plan: PlanWithItems): Promise<Buffer> {
  const employee = plan.employee;

  const makeCell = (text: string, bold = false, bgColor?: string): TableCell => {
    return new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text, bold, size: 20 })],
        alignment: AlignmentType.LEFT,
      })],
      shading: bgColor ? { type: ShadingType.SOLID, color: bgColor } : undefined,
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
    });
  };

  const headerCell = (text: string): TableCell => makeCell(text, true, HEADER_BG);

  // Build development items tables
  const itemTables: (Paragraph | Table)[] = [];

  plan.items.forEach((item, idx) => {
    itemTables.push(new Paragraph({
      text: `Development Item ${idx + 1}`,
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 300, after: 120 },
    }));

    // Item info row
    const infoTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell('Description'),
            headerCell('Due Date'),
            headerCell('Support Needed'),
          ],
        }),
        new TableRow({
          children: [
            makeCell(item.item_description),
            makeCell(item.due_date),
            makeCell(item.support_needed),
          ],
        }),
      ],
    });

    itemTables.push(infoTable);
    itemTables.push(new Paragraph({ text: '', spacing: { before: 60 } }));

    // Milestone rows
    const milestoneTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell('Quarter'),
            headerCell('Status'),
            headerCell('% Complete'),
            headerCell('Notes'),
          ],
        }),
        ...[1, 2, 3, 4].map(q => {
          const m = item.milestones.find((ms: QuarterlyMilestone) => ms.quarter === q);
          return new TableRow({
            children: [
              makeCell(`Q${q}`, true),
              makeCell(m?.status ?? 'Not Started'),
              makeCell(m ? `${m.percent_complete}%` : '0%'),
              makeCell(m?.notes ?? ''),
            ],
          });
        }),
      ],
    });

    itemTables.push(milestoneTable);
    itemTables.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  });

  const doc = new Document({
    styles: {
      default: {
        heading1: {
          run: { size: 36, bold: true, color: HEADER_BG },
          paragraph: { spacing: { after: 200 } },
        },
        heading2: {
          run: { size: 28, bold: true, color: TEAL },
          paragraph: { spacing: { before: 300, after: 120 } },
        },
        heading3: {
          run: { size: 24, bold: true, color: HEADER_BG },
          paragraph: { spacing: { before: 200, after: 80 } },
        },
      },
    },
    sections: [{
      children: [
        new Paragraph({
          text: 'Healthcare IDP System',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: 'Individual Development Plan',
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ text: '', spacing: { after: 200 } }),

        // Plan overview table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [headerCell('Employee Name'), makeCell(employee?.name ?? '')] }),
            new TableRow({ children: [headerCell('Manager'), makeCell(employee?.manager_name ?? '')] }),
            new TableRow({ children: [headerCell('Job Title'), makeCell(employee?.job_title ?? '')] }),
            new TableRow({ children: [headerCell('Department'), makeCell(employee?.department ?? '')] }),
            new TableRow({ children: [headerCell('Plan Date'), makeCell(plan.plan_date)] }),
            new TableRow({ children: [headerCell('Plan Year'), makeCell(String(plan.plan_year))] }),
            new TableRow({ children: [headerCell('Status'), makeCell(plan.status)] }),
            new TableRow({ children: [headerCell('Notes'), makeCell(plan.notes)] }),
          ],
        }),

        new Paragraph({ text: '', spacing: { after: 300 } }),

        new Paragraph({
          text: 'Development Items',
          heading: HeadingLevel.HEADING_2,
        }),

        ...itemTables,
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

export async function exportToPdfBuffer(plan: PlanWithItems): Promise<Buffer> {
  // Use jspdf + jspdf-autotable via require (CommonJS Electron main process)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const jspdfMod = require('jspdf') as { jsPDF?: typeof import('jspdf').jsPDF; default?: { jsPDF?: typeof import('jspdf').jsPDF } };
  const jsPDF = (jspdfMod.jsPDF ?? jspdfMod.default?.jsPDF) as typeof import('jspdf').jsPDF;
  // jspdf-autotable v5: autoTable is a named export function(doc, options)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const atModule = require('jspdf-autotable') as { autoTable?: (doc: unknown, options: unknown) => void; default?: (doc: unknown, options: unknown) => void } & ((doc: unknown, options: unknown) => void);
  const autoTable = (atModule.autoTable ?? atModule.default ?? atModule) as (doc: unknown, options: unknown) => void;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const TEAL_RGB: [number, number, number] = [13, 148, 136];
  const HEADER_RGB: [number, number, number] = [17, 94, 89];

  // Header
  doc.setFillColor(...TEAL_RGB);
  doc.rect(0, 0, pageW, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('Healthcare IDP System — Individual Development Plan', pageW / 2, 13, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  let y = 28;

  // Plan Overview
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...HEADER_RGB);
  doc.text('Plan Overview', 14, y);
  y += 6;

  const overviewData = [
    ['Employee Name', plan.employee?.name ?? '', 'Manager', plan.employee?.manager_name ?? ''],
    ['Job Title', plan.employee?.job_title ?? '', 'Department', plan.employee?.department ?? ''],
    ['Plan Date', plan.plan_date, 'Plan Year', String(plan.plan_year)],
    ['Status', plan.status, 'Notes', plan.notes],
  ];

  autoTable(doc, {
    startY: y,
    body: overviewData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [204, 251, 241], cellWidth: 35 },
      2: { fontStyle: 'bold', fillColor: [204, 251, 241], cellWidth: 35 },
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Development Items
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...HEADER_RGB);
  doc.text('Development Items', 14, y);
  y += 6;

  const itemHeaders = [
    ['#', 'Description', 'Due Date', 'Support Needed',
      'Q1 Status', 'Q1%', 'Q2 Status', 'Q2%', 'Q3 Status', 'Q3%', 'Q4 Status', 'Q4%'],
  ];

  const itemRows = plan.items.map((item, idx) => {
    const getMilestone = (q: number) =>
      item.milestones.find((m: QuarterlyMilestone) => m.quarter === q);
    const q1 = getMilestone(1);
    const q2 = getMilestone(2);
    const q3 = getMilestone(3);
    const q4 = getMilestone(4);
    return [
      String(idx + 1),
      item.item_description,
      item.due_date,
      item.support_needed,
      q1?.status ?? 'Not Started', q1 ? `${q1.percent_complete}%` : '0%',
      q2?.status ?? 'Not Started', q2 ? `${q2.percent_complete}%` : '0%',
      q3?.status ?? 'Not Started', q3 ? `${q3.percent_complete}%` : '0%',
      q4?.status ?? 'Not Started', q4 ? `${q4.percent_complete}%` : '0%',
    ];
  });

  autoTable(doc, {
    startY: y,
    head: itemHeaders,
    body: itemRows,
    theme: 'striped',
    headStyles: {
      fillColor: HEADER_RGB,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 50 },
      2: { cellWidth: 20 },
      3: { cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated by Healthcare IDP System — Page ${i} of ${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: 'center' }
    );
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
