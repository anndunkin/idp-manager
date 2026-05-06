import ExcelJS from 'exceljs';
import {
  Document, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType,
  BorderStyle, ShadingType, Packer,
} from 'docx';
import type { PlanWithItems, QuarterlyMilestone } from './types';

const TEAL = '0D9488';
const TEAL_LIGHT = 'CCFBF1';
const HEADER_BG = '115E59';
const APP_NAME = "Paul Selby's IDP Tool";

// ─── Milestone label helpers ──────────────────────────────────────────────────

function mlabel(p: number, total: number): string {
  switch (total) {
    case 2:  return `H${p}`;
    case 3:  return `T${p}`;
    case 4:  return `Q${p}`;
    case 6:  return `B${p}`;
    case 12: return `M${p}`;
    default: return `P${p}`;
  }
}

function periods(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i + 1);
}

// ─── Excel Export ─────────────────────────────────────────────────────────────

export async function exportToExcelBuffer(plan: PlanWithItems): Promise<Buffer> {
  const mCount = plan.milestone_count ?? 4;
  const ps = periods(mCount);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = APP_NAME;
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
    ['Milestone Periods', String(mCount)],
    ['Notes', plan.notes],
  ];

  overviewData.forEach(([field, value], idx) => {
    const row = overviewSheet.addRow([field, value]);
    if (idx % 2 === 0) {
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${TEAL_LIGHT}` } };
    }
    row.getCell(1).font = { bold: true };
  });

  // Sheet 2: Development Items — dynamic milestone columns
  const itemsSheet = workbook.addWorksheet('Development Items');

  const fixedCols: Partial<ExcelJS.Column>[] = [
    { header: 'Item #',         key: 'num',         width: 8 },
    { header: 'Description',    key: 'description', width: 40 },
    { header: 'Due Date',       key: 'due_date',     width: 12 },
    { header: 'Support Needed', key: 'support',      width: 25 },
  ];

  const milestoneCols: Partial<ExcelJS.Column>[] = ps.flatMap(p => [
    { header: `${mlabel(p, mCount)} Status`, key: `p${p}_status`, width: 15 },
    { header: `${mlabel(p, mCount)} %`,      key: `p${p}_pct`,    width: 8 },
    { header: `${mlabel(p, mCount)} Notes`,  key: `p${p}_notes`,  width: 20 },
  ]);

  itemsSheet.columns = [...fixedCols, ...milestoneCols];

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
    const rowData: Record<string, unknown> = {
      num: idx + 1,
      description: item.item_description,
      due_date: item.due_date,
      support: item.support_needed,
    };

    ps.forEach(p => {
      const m = item.milestones.find((ms: QuarterlyMilestone) => ms.quarter === p);
      rowData[`p${p}_status`] = m?.status ?? 'Not Started';
      rowData[`p${p}_pct`]    = m?.percent_complete ?? 0;
      rowData[`p${p}_notes`]  = m?.notes ?? '';
    });

    const row = itemsSheet.addRow(rowData);

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
  const mCount = plan.milestone_count ?? 4;
  const ps = periods(mCount);
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

    // Milestone rows — dynamic
    const milestoneTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell('Period'),
            headerCell('Status'),
            headerCell('% Complete'),
            headerCell('Notes'),
          ],
        }),
        ...ps.map(p => {
          const m = item.milestones.find((ms: QuarterlyMilestone) => ms.quarter === p);
          return new TableRow({
            children: [
              makeCell(mlabel(p, mCount), true),
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
          text: APP_NAME,
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
            new TableRow({ children: [headerCell('Milestone Periods'), makeCell(String(mCount))] }),
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
  const mCount = plan.milestone_count ?? 4;
  const ps = periods(mCount);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const jspdfMod = require('jspdf') as { jsPDF?: typeof import('jspdf').jsPDF; default?: { jsPDF?: typeof import('jspdf').jsPDF } };
  const jsPDF = (jspdfMod.jsPDF ?? jspdfMod.default?.jsPDF) as typeof import('jspdf').jsPDF;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const atModule = require('jspdf-autotable') as { autoTable?: (doc: unknown, options: unknown) => void; default?: (doc: unknown, options: unknown) => void } & ((doc: unknown, options: unknown) => void);
  const autoTable = (atModule.autoTable ?? atModule.default ?? atModule) as (doc: unknown, options: unknown) => void;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const TEAL_RGB: [number, number, number] = [13, 148, 136];
  const HEADER_RGB: [number, number, number] = [17, 94, 89];

  // Header banner
  doc.setFillColor(...TEAL_RGB);
  doc.rect(0, 0, pageW, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(`${APP_NAME} — Individual Development Plan`, pageW / 2, 13, { align: 'center' });

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
    ['Status', plan.status, 'Milestone Periods', String(mCount)],
    ['Notes', plan.notes, '', ''],
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

  // Development Items — dynamic milestone columns
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...HEADER_RGB);
  doc.text('Development Items', 14, y);
  y += 6;

  const milestoneHeaders = ps.flatMap(p => [
    `${mlabel(p, mCount)} Status`,
    `${mlabel(p, mCount)}%`,
  ]);

  const itemHeaders = [
    ['#', 'Description', 'Due Date', 'Support Needed', ...milestoneHeaders],
  ];

  const itemRows = plan.items.map((item, idx) => {
    const milestoneValues = ps.flatMap(p => {
      const m = item.milestones.find((ms: QuarterlyMilestone) => ms.quarter === p);
      return [m?.status ?? 'Not Started', m ? `${m.percent_complete}%` : '0%'];
    });
    return [
      String(idx + 1),
      item.item_description,
      item.due_date,
      item.support_needed,
      ...milestoneValues,
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
      `Generated by ${APP_NAME} — Page ${i} of ${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: 'center' }
    );
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
