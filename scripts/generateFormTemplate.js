/**
 * scripts/generateFormTemplate.js
 *
 * Generates the IDP Employee Input Form Excel template.
 * Run with:  node scripts/generateFormTemplate.js
 * Output:    assets/IDP_Employee_Input_Form.xlsx
 *
 * This script is also called from the importExcel.ts IPC handler to
 * get the template buffer directly (require('./generateFormTemplate').generateBuffer()).
 *
 * Layout (all rows):
 *   1     Title banner
 *   2     Sub-banner instruction
 *   3     Spacer
 *   4     Section 1 header — Employee Information
 *   5     Employee Name / Manager Name
 *   6     Job Title / Department
 *   7     Spacer
 *   8     Section 2 header — Plan Details
 *   9     Plan Date / Plan Year / Status
 *   10    Milestone Periods / Plan Notes
 *   11    Spacer
 *   12    Section 3 header — Development Items
 *   13    Item column headers (#, Description, Due Date, Est. Cost, Support Needed)
 *   14–18 Item rows 1–5  (columns A–G; G=Support Needed merged E:G)
 *   19    Spacer
 *   20    Section 4 header — Quarterly Milestone Check-ins
 *   21    Milestone sub-header row (Item #, Period labels…)
 *   22–26 Milestone rows 1–5 (Status + Notes per period)
 *   27    Spacer
 *   28    How to Submit header
 *   29–31 Submit instructions (3 steps only)
 *
 * Column layout (A–G, 7 cols):
 *   A: # / label       width 8
 *   B: Description     width 32
 *   C: Due Date        width 16
 *   D: Est. Cost       width 16
 *   E: Support Needed  width 30  (merged E:G on item data rows)
 *   F: (part of merge) width 18
 *   G: (part of merge) width 18
 *
 * Milestone section uses columns A–G differently:
 *   A: Item #          width 8
 *   B: Period 1 Status width 14
 *   C: Period 1 Notes  width 22
 *   D: Period 2 Status width 14
 *   E: Period 2 Notes  width 22
 *   F: Period 3 Status width 14
 *   G: Period 3 Notes  width 22
 *   H: Period 4 Status width 14   ← extra column for up to 4 periods
 *   I: Period 4 Notes  width 22
 *
 * Because milestone section needs more columns we expand to 9 columns (A–I).
 * Items section uses A–G (merged to A–I for section headers).
 */

'use strict';

// ExcelJS is require()'d lazily inside generateBuffer() so that callers
// running from outside app.asar (e.g. the packaged extraResources location)
// can inject a pre-resolved ExcelJS instance via generateBuffer({ ExcelJS }).
// When called as a standalone CLI script it self-resolves.
const path = require('path');
const fs = require('fs');

// ─── Brand colours ──────────────────────────────────────────────────────────
const BRAND_DARK   = '0F3A2E';
const BRAND_TEAL   = '14B8A6';
const BRAND_LIGHT  = 'E6F7F5';
const LABEL_GRAY   = '374151';
const BORDER_COLOR = 'D1D5DB';
const REQUIRED_RED = 'DC2626';
const MILESTONE_HEADER_BG = '336B5F';

const NUM_ITEM_ROWS = 5;
// Default to 4 milestone periods shown on the form (matches default dropdown)
const NUM_MILESTONE_PERIODS = 4;
const TOTAL_COLS = 9; // A–I

// ─── Helpers ─────────────────────────────────────────────────────────────────

function colLetter(n) { // 1=A, 2=B, …
  return String.fromCharCode(64 + n);
}

function applyBorder(cell, color) {
  const c = color || BORDER_COLOR;
  const side = { style: 'thin', color: { argb: 'FF' + c } };
  cell.border = { top: side, left: side, bottom: side, right: side };
}

function inputCell(cell, alignment) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_LIGHT } };
  cell.alignment = { horizontal: alignment || 'left', vertical: 'middle', wrapText: true };
  applyBorder(cell);
  cell.protection = { locked: false };
}

function labelCell(cell, text, required) {
  cell.value = text + (required ? ' *' : '');
  cell.font = {
    name: 'Calibri', size: 10, bold: true,
    color: { argb: required ? 'FF' + REQUIRED_RED : 'FF' + LABEL_GRAY },
  };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
  applyBorder(cell);
  cell.protection = { locked: true };
}

function sectionHeader(ws, row, text, fromCol, toCol) {
  const from = colLetter(fromCol || 1);
  const to   = colLetter(toCol   || TOTAL_COLS);
  ws.mergeCells(`${from}${row}:${to}${row}`);
  const cell = ws.getCell(`${from}${row}`);
  cell.value = text;
  cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_TEAL } };
  cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(row).height = 20;
}

function spacer(ws, row) {
  ws.getRow(row).height = 8;
}

// ─── Main generator ──────────────────────────────────────────────────────────

async function generateBuffer(opts) {
  // Accept an injected ExcelJS (used in packaged builds where this script
  // lives outside app.asar and cannot resolve bare node_modules itself).
  // Falls back to a local require() when run as a standalone CLI script.
  const ExcelJS = (opts && opts.ExcelJS) ? opts.ExcelJS : require('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'IDP Manager';
  wb.lastModifiedBy = 'IDP Manager v1.2.0';
  wb.created = new Date();
  wb.modified = new Date();

  // ── Sheet 1: IDP Input Form ────────────────────────────────────────────────
  const ws = wb.addWorksheet('IDP Input Form', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    properties: { defaultColWidth: 18 },
  });

  // Column widths A–I
  ws.columns = [
    { key: 'A', width: 8  },  // #
    { key: 'B', width: 34 },  // Description / Period 1 Notes
    { key: 'C', width: 16 },  // Due Date    / Period 1 Notes
    { key: 'D', width: 16 },  // Est. Cost   / Period 2 Status
    { key: 'E', width: 28 },  // Support     / Period 2 Notes
    { key: 'F', width: 16 },  // (merged)    / Period 3 Status
    { key: 'G', width: 28 },  // (merged)    / Period 3 Notes
    { key: 'H', width: 16 },  // Period 4 Status
    { key: 'I', width: 28 },  // Period 4 Notes
  ];

  // ── Row 1: Title ───────────────────────────────────────────────────────────
  ws.mergeCells('A1:I1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'Employee Development Plan Input Form';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_DARK } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  // ── Row 2: Sub-banner ─────────────────────────────────────────────────────
  ws.mergeCells('A2:I2');
  const subCell = ws.getCell('A2');
  subCell.value = 'Complete all required fields (*) and return this file to your manager.';
  subCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF' + BRAND_TEAL } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_DARK } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 18;

  // ── Row 3: Spacer ─────────────────────────────────────────────────────────
  spacer(ws, 3);

  // ── Row 4: Section 1 — Employee Information ───────────────────────────────
  sectionHeader(ws, 4, 'SECTION 1 — EMPLOYEE INFORMATION');

  // ── Row 5: Employee Name / Manager Name ───────────────────────────────────
  ws.getRow(5).height = 22;
  labelCell(ws.getCell('A5'), 'Employee Full Name', true);
  ws.mergeCells('B5:E5');
  inputCell(ws.getCell('B5'));
  ws.getCell('B5').name = 'employee_name';

  labelCell(ws.getCell('F5'), 'Manager Name', true);
  ws.mergeCells('G5:I5');
  inputCell(ws.getCell('G5'));
  ws.getCell('G5').name = 'manager_name';

  // ── Row 6: Job Title / Department ─────────────────────────────────────────
  ws.getRow(6).height = 22;
  labelCell(ws.getCell('A6'), 'Job Title');
  ws.mergeCells('B6:E6');
  inputCell(ws.getCell('B6'));
  ws.getCell('B6').name = 'job_title';

  labelCell(ws.getCell('F6'), 'Department');
  ws.mergeCells('G6:I6');
  inputCell(ws.getCell('G6'));
  ws.getCell('G6').name = 'department';

  // ── Row 7: Spacer ─────────────────────────────────────────────────────────
  spacer(ws, 7);

  // ── Row 8: Section 2 — Plan Details ──────────────────────────────────────
  sectionHeader(ws, 8, 'SECTION 2 — DEVELOPMENT PLAN DETAILS');

  // ── Row 9: Plan Date / Plan Year / Status ─────────────────────────────────
  ws.getRow(9).height = 22;
  labelCell(ws.getCell('A9'), 'Plan Date (YYYY-MM-DD)', true);
  ws.mergeCells('B9:C9');
  inputCell(ws.getCell('B9'));
  ws.getCell('B9').name = 'plan_date';

  labelCell(ws.getCell('D9'), 'Plan Year', true);
  inputCell(ws.getCell('E9'));
  ws.getCell('E9').name = 'plan_year';
  ws.getCell('E9').value = new Date().getFullYear();
  ws.getCell('E9').numFmt = '0';

  labelCell(ws.getCell('F9'), 'Status');
  ws.mergeCells('G9:I9');
  inputCell(ws.getCell('G9'));
  ws.getCell('G9').name = 'status';
  ws.getCell('G9').value = 'Active';
  ws.getCell('G9').dataValidation = {
    type: 'list', allowBlank: false,
    formulae: ['"Active,Inactive,Complete"'],
    showDropDown: false, showErrorMessage: true,
    errorTitle: 'Invalid Status',
    error: 'Please select: Active, Inactive, or Complete',
  };

  // ── Row 10: Milestone Periods / Plan Notes ────────────────────────────────
  ws.getRow(10).height = 22;
  labelCell(ws.getCell('A10'), 'Milestone Periods');
  ws.mergeCells('B10:C10');
  inputCell(ws.getCell('B10'));
  ws.getCell('B10').name = 'milestone_count';
  ws.getCell('B10').value = '4 — Quarterly (Q1–Q4)';
  ws.getCell('B10').dataValidation = {
    type: 'list', allowBlank: false,
    formulae: ['"2 — Semi-Annual (H1–H2),3 — Thirds (T1–T3),4 — Quarterly (Q1–Q4),6 — Bi-Monthly (B1–B6),12 — Monthly (M1–M12)"'],
    showDropDown: false, showErrorMessage: true,
    errorTitle: 'Invalid Selection',
    error: 'Please select a milestone period from the dropdown list.',
  };

  labelCell(ws.getCell('D10'), 'Plan Notes');
  ws.mergeCells('E10:I10');
  inputCell(ws.getCell('E10'));
  ws.getCell('E10').name = 'plan_notes';

  // ── Row 11: Spacer ────────────────────────────────────────────────────────
  spacer(ws, 11);

  // ── Row 12: Section 3 — Development Items ─────────────────────────────────
  sectionHeader(ws, 12, 'SECTION 3 — DEVELOPMENT ITEMS  (add up to ' + NUM_ITEM_ROWS + ' items; Description is required for each)');

  // ── Row 13: Item column headers ───────────────────────────────────────────
  ws.getRow(13).height = 20;
  const itemHeaders = [
    { col: 'A', label: '#' },
    { col: 'B', label: 'Development Goal / Activity (Description) *' },
    { col: 'C', label: 'Due Date\n(YYYY-MM-DD)' },
    { col: 'D', label: 'Estimated\nCost' },
    { col: 'E', label: 'Support Needed', merge: 'E13:I13' },
  ];
  itemHeaders.forEach(h => {
    if (h.merge) ws.mergeCells(h.merge);
    const cell = ws.getCell(h.col + '13');
    cell.value = h.label;
    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + MILESTONE_HEADER_BG } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyBorder(cell, MILESTONE_HEADER_BG);
  });

  // ── Rows 14–18: Item data rows ────────────────────────────────────────────
  for (let i = 0; i < NUM_ITEM_ROWS; i++) {
    const row = 14 + i;
    ws.getRow(row).height = 44;

    // # label
    const numCell = ws.getCell(`A${row}`);
    numCell.value = i + 1;
    numCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + LABEL_GRAY } };
    numCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    numCell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyBorder(numCell);
    numCell.protection = { locked: true };

    // Description
    inputCell(ws.getCell(`B${row}`));
    ws.getCell(`B${row}`).name = `item${i + 1}_description`;

    // Due Date
    inputCell(ws.getCell(`C${row}`));
    ws.getCell(`C${row}`).name = `item${i + 1}_due_date`;

    // Estimated Cost
    inputCell(ws.getCell(`D${row}`));
    ws.getCell(`D${row}`).name = `item${i + 1}_cost_estimate`;

    // Support Needed (merged E:I)
    ws.mergeCells(`E${row}:I${row}`);
    inputCell(ws.getCell(`E${row}`));
    ws.getCell(`E${row}`).name = `item${i + 1}_support_needed`;
  }

  // ── Row 19: Spacer ────────────────────────────────────────────────────────
  spacer(ws, 19);

  // ── Row 20: Section 4 — Quarterly Milestone Check-ins ────────────────────
  sectionHeader(ws, 20, 'SECTION 4 — QUARTERLY MILESTONE CHECK-INS  (fill in your progress for each item per period)');

  // ── Row 21: Milestone column headers ─────────────────────────────────────
  //   A = Item # | B–C = Period 1 Status+Notes | D–E = Period 2 | F–G = Period 3 | H–I = Period 4
  ws.getRow(21).height = 30;

  // Item # header
  const mItemHdr = ws.getCell('A21');
  mItemHdr.value = 'Item\n#';
  mItemHdr.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
  mItemHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + MILESTONE_HEADER_BG } };
  mItemHdr.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  applyBorder(mItemHdr, MILESTONE_HEADER_BG);

  const periodLabels = ['Q1 / Period 1', 'Q2 / Period 2', 'Q3 / Period 3', 'Q4 / Period 4'];
  const periodColPairs = [['B', 'C'], ['D', 'E'], ['F', 'G'], ['H', 'I']];

  periodLabels.forEach((label, pi) => {
    const [sc, nc] = periodColPairs[pi];
    const statusAddr = `${sc}21`;
    const notesAddr  = `${nc}21`;

    // Status sub-header
    const sCell = ws.getCell(statusAddr);
    sCell.value = label + '\nStatus';
    sCell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FFFFFFFF' } };
    sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + MILESTONE_HEADER_BG } };
    sCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyBorder(sCell, MILESTONE_HEADER_BG);

    // Notes sub-header
    const nCell = ws.getCell(notesAddr);
    nCell.value = label + '\nNotes';
    nCell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FFFFFFFF' } };
    nCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + MILESTONE_HEADER_BG } };
    nCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyBorder(nCell, MILESTONE_HEADER_BG);
  });

  // ── Rows 22–26: Milestone data rows (one per item) ────────────────────────
  const STATUS_DROPDOWN = '"Not Started,In Progress,Complete"';
  for (let i = 0; i < NUM_ITEM_ROWS; i++) {
    const row = 22 + i;
    ws.getRow(row).height = 36;

    // Item # (locked)
    const itemNumCell = ws.getCell(`A${row}`);
    itemNumCell.value = i + 1;
    itemNumCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + LABEL_GRAY } };
    itemNumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    itemNumCell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyBorder(itemNumCell);
    itemNumCell.protection = { locked: true };

    // Per-period: Status + Notes
    periodColPairs.forEach(([sc, nc], pi) => {
      const statusCell = ws.getCell(`${sc}${row}`);
      inputCell(statusCell);
      statusCell.value = 'Not Started';
      statusCell.name = `item${i + 1}_q${pi + 1}_status`;
      statusCell.dataValidation = {
        type: 'list', allowBlank: false,
        formulae: [STATUS_DROPDOWN],
        showDropDown: false, showErrorMessage: true,
        errorTitle: 'Invalid Status',
        error: 'Please select: Not Started, In Progress, or Complete',
      };

      const notesCell = ws.getCell(`${nc}${row}`);
      inputCell(notesCell);
      notesCell.name = `item${i + 1}_q${pi + 1}_notes`;
    });
  }

  // ── Row 27: Spacer ────────────────────────────────────────────────────────
  spacer(ws, 27);

  // ── Row 28: How to Submit ─────────────────────────────────────────────────
  ws.mergeCells('A28:I28');
  const instrHeader = ws.getCell('A28');
  instrHeader.value = 'HOW TO SUBMIT THIS FORM';
  instrHeader.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF' + LABEL_GRAY } };
  instrHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  instrHeader.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(28).height = 16;

  ws.mergeCells('A29:I31');
  const instrText = ws.getCell('A29');
  instrText.value =
    '1. Fill in all fields marked with * (required).\n' +
    '2. Add your development goals in Section 3 — fill in only the rows you are using.\n' +
    '3. Save this file and email it (or share via Teams/SharePoint) to your manager.';
  instrText.font = { name: 'Calibri', size: 9, color: { argb: 'FF' + LABEL_GRAY } };
  instrText.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
  instrText.alignment = { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 };
  ws.getRow(29).height = 14;
  ws.getRow(30).height = 14;
  ws.getRow(31).height = 14;

  // ── Sheet protection ──────────────────────────────────────────────────────
  ws.protect('', { selectLockedCells: true, selectUnlockedCells: true, formatCells: false });

  // ── Sheet 2: Reference / Help ─────────────────────────────────────────────
  const helpWs = wb.addWorksheet('Reference — Field Guide', {
    properties: { defaultColWidth: 30 },
  });
  helpWs.columns = [
    { key: 'A', width: 32 },
    { key: 'B', width: 65 },
  ];

  helpWs.mergeCells('A1:B1');
  const helpTitle = helpWs.getCell('A1');
  helpTitle.value = 'IDP Input Form — Field Reference Guide';
  helpTitle.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  helpTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_DARK } };
  helpTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  helpWs.getRow(1).height = 28;

  const helpRows = [
    ['Field', 'Guidance'],
    ['Employee Full Name *', 'Your legal first and last name as it appears in HR records.'],
    ['Manager Name *', 'Your direct manager\'s full name.'],
    ['Job Title', 'Your current job title (e.g., "Security Analyst II").'],
    ['Department', 'Your department or team name.'],
    ['Plan Date * (YYYY-MM-DD)', 'The start date of this development plan, e.g., 2026-01-01.'],
    ['Plan Year *', 'The calendar year this plan covers, e.g., 2026.'],
    ['Status', 'Active = plan in progress. Inactive = paused. Complete = finished.'],
    ['Milestone Periods', [
      '2 — Semi-Annual (H1–H2): two check-in periods per year.',
      '3 — Thirds (T1–T3): three tracking periods.',
      '4 — Quarterly (Q1–Q4): default — four quarters per year.',
      '6 — Bi-Monthly (B1–B6): every two months.',
      '12 — Monthly (M1–M12): monthly tracking.',
    ].join('\n')],
    ['Plan Notes', 'Any overall notes about this development plan (optional).'],
    ['Item Description *', 'What you will accomplish, e.g., "Earn CompTIA Security+ by Q2".'],
    ['Item Due Date', 'Target completion date for this specific item (YYYY-MM-DD).'],
    ['Estimated Cost', 'Estimated cost for this item, e.g., "$500" or "1200". Free text — no specific format required. Leave blank if none.'],
    ['Support Needed', 'Resources required: training budget, exam fee, manager coaching, etc.'],
    ['Q1–Q4 Status', 'Your progress in that period: Not Started, In Progress, or Complete.'],
    ['Q1–Q4 Notes', 'Brief notes on what you did or plan to do in that period (optional).'],
  ];

  helpRows.forEach((row, i) => {
    const r = helpWs.getRow(i + 2);
    r.height = i === 8 ? 80 : 22;
    const a = r.getCell(1);
    const b = r.getCell(2);
    if (i === 0) {
      [a, b].forEach(c => {
        c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_TEAL } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        applyBorder(c);
      });
    } else {
      a.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      b.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      [a, b].forEach(c => {
        c.font = { name: 'Calibri', size: 9, color: { argb: 'FF' + LABEL_GRAY } };
        c.alignment = { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 };
        applyBorder(c);
      });
      a.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF' + LABEL_GRAY } };
    }
    a.value = row[0];
    b.value = row[1];
  });

  return await wb.xlsx.writeBuffer();
}

// ─── CLI entry point ─────────────────────────────────────────────────────────
if (require.main === module) {
  const outDir = path.resolve(__dirname, '..', 'assets');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'IDP_Employee_Input_Form.xlsx');

  generateBuffer().then(buf => {
    fs.writeFileSync(outPath, buf);
    console.log('Generated:', outPath);
  }).catch(err => {
    console.error('Error generating form template:', err);
    process.exit(1);
  });
}

module.exports = { generateBuffer };
