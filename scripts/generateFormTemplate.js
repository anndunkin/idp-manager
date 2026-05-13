/**
 * scripts/generateFormTemplate.js
 *
 * Generates the branded IDP Employee Input Form Excel template.
 * Run with:  node scripts/generateFormTemplate.js
 * Output:    assets/IDP_Employee_Input_Form.xlsx
 *
 * This script is also called from the importExcel.ts IPC handler to
 * get the template buffer directly (require('./generateFormTemplate').generateBuffer()).
 */

'use strict';

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// ─── Brand colours (matching Tailwind primary-900 / teal palette) ──────────
const BRAND_DARK   = '0F3A2E'; // sidebar dark green
const BRAND_TEAL   = '14B8A6'; // primary accent teal
const BRAND_LIGHT  = 'E6F7F5'; // very light teal fill for input cells
const LABEL_GRAY   = '374151'; // text-gray-700
const BORDER_COLOR = 'D1D5DB'; // gray-300
const REQUIRED_RED = 'DC2626'; // red-600

const NUM_ITEM_ROWS = 5;

// ─── Helper: apply thin border to a cell ──────────────────────────────────
function applyBorder(cell, color = BORDER_COLOR) {
  const side = { style: 'thin', color: { argb: 'FF' + color } };
  cell.border = { top: side, left: side, bottom: side, right: side };
}

// ─── Helper: set an input cell (light teal fill, unlocked) ────────────────
function inputCell(cell, alignment = 'left') {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_LIGHT } };
  cell.alignment = { horizontal: alignment, vertical: 'middle', wrapText: true };
  applyBorder(cell);
  cell.protection = { locked: false };
}

// ─── Helper: label cell ───────────────────────────────────────────────────
function labelCell(cell, text, required = false) {
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

async function generateBuffer() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Paul Selby's IDP Tool";
  wb.lastModifiedBy = "IDP Manager v1.1.0";
  wb.created = new Date();
  wb.modified = new Date();

  // ── Sheet 1: IDP Input Form ───────────────────────────────────────────────
  const ws = wb.addWorksheet('IDP Input Form', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
    properties: { defaultColWidth: 20 },
  });

  // Column widths (A–F)
  ws.columns = [
    { key: 'A', width: 22 },   // labels
    { key: 'B', width: 28 },   // value col 1
    { key: 'C', width: 18 },   // label col 2
    { key: 'D', width: 28 },   // value col 2
    { key: 'E', width: 22 },   // label col 3
    { key: 'F', width: 22 },   // value col 3
  ];

  // ── Row 1: Title Banner ────────────────────────────────────────────────────
  ws.mergeCells('A1:F1');
  const titleCell = ws.getCell('A1');
  titleCell.value = "Paul Selby's IDP Tool — Employee Development Plan Input Form";
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_DARK } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  // ── Row 2: Sub-banner ─────────────────────────────────────────────────────
  ws.mergeCells('A2:F2');
  const subCell = ws.getCell('A2');
  subCell.value = 'Complete all required fields (*) and return this file to your manager for import into the IDP system.';
  subCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF' + BRAND_TEAL } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_DARK } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 18;

  // ── Row 3: blank spacer ──────────────────────────────────────────────────
  ws.getRow(3).height = 8;

  // ── Row 4: Section header — Employee Information ─────────────────────────
  ws.mergeCells('A4:F4');
  const empHeader = ws.getCell('A4');
  empHeader.value = 'SECTION 1 — EMPLOYEE INFORMATION';
  empHeader.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  empHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_TEAL } };
  empHeader.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(4).height = 20;

  // ── Row 5: Employee Name / Manager Name ──────────────────────────────────
  ws.getRow(5).height = 22;
  labelCell(ws.getCell('A5'), 'Employee Full Name', true);
  ws.mergeCells('B5:D5');
  inputCell(ws.getCell('B5'));
  ws.getCell('B5').name = 'employee_name';

  labelCell(ws.getCell('E5'), 'Manager Name', true);
  inputCell(ws.getCell('F5'));
  ws.getCell('F5').name = 'manager_name';

  // ── Row 6: Job Title / Department ────────────────────────────────────────
  ws.getRow(6).height = 22;
  labelCell(ws.getCell('A6'), 'Job Title');
  ws.mergeCells('B6:D6');
  inputCell(ws.getCell('B6'));
  ws.getCell('B6').name = 'job_title';

  labelCell(ws.getCell('E6'), 'Department');
  inputCell(ws.getCell('F6'));
  ws.getCell('F6').name = 'department';

  // ── Row 7: spacer ────────────────────────────────────────────────────────
  ws.getRow(7).height = 8;

  // ── Row 8: Section header — Plan Details ─────────────────────────────────
  ws.mergeCells('A8:F8');
  const planHeader = ws.getCell('A8');
  planHeader.value = 'SECTION 2 — DEVELOPMENT PLAN DETAILS';
  planHeader.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  planHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_TEAL } };
  planHeader.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(8).height = 20;

  // ── Row 9: Plan Date / Plan Year ─────────────────────────────────────────
  ws.getRow(9).height = 22;
  labelCell(ws.getCell('A9'), 'Plan Date (YYYY-MM-DD)', true);
  inputCell(ws.getCell('B9'));
  ws.getCell('B9').name = 'plan_date';

  labelCell(ws.getCell('C9'), 'Plan Year', true);
  inputCell(ws.getCell('D9'));
  ws.getCell('D9').name = 'plan_year';
  ws.getCell('D9').value = new Date().getFullYear();
  ws.getCell('D9').numFmt = '0';

  labelCell(ws.getCell('E9'), 'Status');
  inputCell(ws.getCell('F9'));
  ws.getCell('F9').name = 'status';
  ws.getCell('F9').value = 'Active';

  // Dropdown for Status
  ws.getCell('F9').dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: ['"Active,Inactive,Complete"'],
    showDropDown: false,
    showErrorMessage: true,
    errorTitle: 'Invalid Status',
    error: 'Please select: Active, Inactive, or Complete',
  };

  // ── Row 10: Milestone Periods / Notes ────────────────────────────────────
  ws.getRow(10).height = 22;
  labelCell(ws.getCell('A10'), 'Milestone Periods');
  inputCell(ws.getCell('B10'));
  ws.getCell('B10').name = 'milestone_count';
  ws.getCell('B10').value = '4 — Quarterly (Q1–Q4)';

  // Dropdown for milestone periods
  ws.getCell('B10').dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: ['"2 — Semi-Annual (H1–H2),3 — Thirds (T1–T3),4 — Quarterly (Q1–Q4),6 — Bi-Monthly (B1–B6),12 — Monthly (M1–M12)"'],
    showDropDown: false,
    showErrorMessage: true,
    errorTitle: 'Invalid Selection',
    error: 'Please select a milestone period from the dropdown list.',
  };

  labelCell(ws.getCell('C10'), 'Plan Notes');
  ws.mergeCells('D10:F10');
  inputCell(ws.getCell('D10'));
  ws.getCell('D10').name = 'plan_notes';

  // ── Row 11: spacer ───────────────────────────────────────────────────────
  ws.getRow(11).height = 8;

  // ── Row 12: Section header — Development Items ───────────────────────────
  ws.mergeCells('A12:F12');
  const itemsHeader = ws.getCell('A12');
  itemsHeader.value = 'SECTION 3 — DEVELOPMENT ITEMS  (add up to ' + NUM_ITEM_ROWS + ' items; Description is required for each)';
  itemsHeader.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  itemsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_TEAL } };
  itemsHeader.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(12).height = 20;

  // ── Row 13: Column headers for items table ───────────────────────────────
  ws.getRow(13).height = 18;
  const itemColHeaders = ['#', 'Development Goal / Activity (Description)', 'Due Date\n(YYYY-MM-DD)', 'Support Needed', '', ''];
  const itemColCells = ['A13', 'B13', 'C13', 'D13', 'E13', 'F13'];
  ws.mergeCells('D13:F13');
  itemColHeaders.forEach((h, i) => {
    if (i >= 4) return; // merged
    const cell = ws.getCell(itemColCells[i]);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF336B5F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyBorder(cell, '336B5F');
  });

  // ── Rows 14–(14+NUM_ITEM_ROWS-1): Item rows ───────────────────────────────
  for (let i = 0; i < NUM_ITEM_ROWS; i++) {
    const row = 14 + i;
    ws.getRow(row).height = 44; // tall enough for multi-line description

    // Item number (static label)
    const numCell = ws.getCell(`A${row}`);
    numCell.value = i + 1;
    numCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF' + LABEL_GRAY } };
    numCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    numCell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyBorder(numCell);
    numCell.protection = { locked: true };

    // Description (required for item 1, optional for rest but validated on import)
    const descCell = ws.getCell(`B${row}`);
    inputCell(descCell);
    descCell.name = `item${i + 1}_description`;

    // Due date
    const dateCell = ws.getCell(`C${row}`);
    inputCell(dateCell);
    dateCell.name = `item${i + 1}_due_date`;

    // Support needed (merged D:F)
    ws.mergeCells(`D${row}:F${row}`);
    const supportCell = ws.getCell(`D${row}`);
    inputCell(supportCell);
    supportCell.name = `item${i + 1}_support_needed`;
  }

  // ── Row after items: spacer ───────────────────────────────────────────────
  const afterItems = 14 + NUM_ITEM_ROWS;
  ws.getRow(afterItems).height = 8;

  // ── Instructions box ─────────────────────────────────────────────────────
  const instrRow = afterItems + 1;
  ws.mergeCells(`A${instrRow}:F${instrRow}`);
  const instrHeader = ws.getCell(`A${instrRow}`);
  instrHeader.value = 'HOW TO SUBMIT THIS FORM';
  instrHeader.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF' + LABEL_GRAY } };
  instrHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  instrHeader.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(instrRow).height = 16;

  const instrTextRow = instrRow + 1;
  ws.mergeCells(`A${instrTextRow}:F${instrTextRow + 3}`);
  const instrText = ws.getCell(`A${instrTextRow}`);
  instrText.value =
    '1. Fill in all fields marked with * (required).\n' +
    '2. Add your development goals in Section 3 — you only need to fill in rows you are using.\n' +
    '3. Save this file and email it (or share via Teams/SharePoint) to your manager.\n' +
    '4. Your manager will import it into the IDP Tool using File → Import Employee Form.';
  instrText.font = { name: 'Calibri', size: 9, color: { argb: 'FF' + LABEL_GRAY } };
  instrText.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
  instrText.alignment = { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 };
  ws.getRow(instrTextRow).height = 14;
  ws.getRow(instrTextRow + 1).height = 14;
  ws.getRow(instrTextRow + 2).height = 14;
  ws.getRow(instrTextRow + 3).height = 14;

  // ── Sheet 2: Reference / Help ─────────────────────────────────────────────
  const helpWs = wb.addWorksheet('Reference — Field Guide', {
    properties: { defaultColWidth: 30 },
  });

  helpWs.columns = [
    { key: 'A', width: 30 },
    { key: 'B', width: 60 },
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
    ['Support Needed', 'Resources required: training budget, exam fee, manager coaching, etc.'],
  ];

  helpRows.forEach((row, i) => {
    const r = helpWs.getRow(i + 2);
    r.height = i === 8 ? 80 : 22; // taller for milestone description
    const a = r.getCell(1);
    const b = r.getCell(2);

    if (i === 0) {
      // Column header row
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

  // Sheet protection: lock everything except named input cells
  ws.protect('', { selectLockedCells: true, selectUnlockedCells: true, formatCells: false });

  return await wb.xlsx.writeBuffer();
}

// ─── CLI entry point ────────────────────────────────────────────────────────
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
