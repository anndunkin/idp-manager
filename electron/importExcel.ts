/**
 * electron/importExcel.ts
 *
 * Reads a completed IDP Employee Input Form (.xlsx) and returns an
 * IdpFilePayload that can be passed directly to importFilePayload().
 *
 * Cell name mapping (defined in scripts/generateFormTemplate.js):
 *   employee_name        → employee.name
 *   manager_name         → employee.manager_name
 *   job_title            → employee.job_title
 *   department           → employee.department
 *   plan_date            → plan.plan_date
 *   plan_year            → plan.plan_year
 *   status               → plan.status
 *   milestone_count      → plan.milestone_count  (parse leading digit)
 *   plan_notes           → plan.notes
 *   item1_description … item5_description
 *   item1_due_date     … item5_due_date
 *   item1_support_needed … item5_support_needed
 */

import ExcelJS from 'exceljs';
import type { IdpFilePayload, PlanStatus } from './types';
import { IDP_FILE_VERSION } from './types';

const NUM_ITEM_ROWS = 5;

/** Known milestone period dropdown labels → numeric value */
const MILESTONE_MAP: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '6': 6, '12': 12,
  'semi': 2, 'half': 2,
  'thirds': 3,
  'quarterly': 4,
  'bi-monthly': 6, 'bi monthly': 6,
  'monthly': 12,
};

function parseMilestoneCount(raw: string | number | null | undefined): number {
  if (raw == null) return 4;
  const s = String(raw).trim();
  // Leading digit(s) from dropdown labels like "4 — Quarterly (Q1–Q4)"
  const numMatch = s.match(/^(\d+)/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if ([2, 3, 4, 6, 12].includes(n)) return n;
  }
  // Fallback: keyword scan
  const lower = s.toLowerCase();
  for (const [key, val] of Object.entries(MILESTONE_MAP)) {
    if (lower.includes(key)) return val;
  }
  return 4; // default
}

function parseStatus(raw: string | null | undefined): PlanStatus {
  const s = (raw ?? 'Active').trim();
  if (s === 'Inactive' || s === 'Complete') return s;
  return 'Active';
}

/**
 * Parse date cell value — handles:
 *   - Excel Date serial (number → JS Date)
 *   - ISO string "2026-05-13"
 *   - JS Date object
 *   - Empty / null → ''
 */
function parseDate(raw: ExcelJS.CellValue): string {
  if (raw == null) return '';
  if (raw instanceof Date) {
    return raw.toISOString().split('T')[0];
  }
  if (typeof raw === 'number') {
    // Excel date serial (days since 1900-01-01, with leap-year bug offset)
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }
  const s = String(raw).trim();
  if (!s) return '';
  // Accept YYYY-MM-DD directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Try to parse other formats
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return s; // return as-is; DB stores free text
}

function getCellText(ws: ExcelJS.Worksheet, namedCellAddr: string): string {
  const cell = ws.getCell(namedCellAddr);
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'object' && 'richText' in (v as object)) {
    return (v as ExcelJS.CellRichTextValue).richText.map((r: ExcelJS.RichText) => r.text).join('');
  }
  return String(v).trim();
}

/** Find a cell on the worksheet by its defined name */
function findNamedCell(
  workbook: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  name: string
): ExcelJS.Cell | null {
  // ExcelJS stores defined names in workbook.definedNames
  // Fall back to scanning all cells for a matching .name property
  try {
    const definedNames = (workbook as any).definedNames as Map<string, string> | undefined;
    if (definedNames && definedNames.has(name)) {
      const ref = definedNames.get(name)!;
      return ws.getCell(ref.replace(/^[^!]+!/, '').replace(/\$/g, ''));
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Map from defined name → cell address (hard-coded, matching generateFormTemplate.js).
 * This is the reliable fallback when workbook.definedNames is not accessible.
 */
const NAMED_CELL_MAP: Record<string, string> = {
  employee_name:  'B5',
  manager_name:   'F5',
  job_title:      'B6',
  department:     'F6',
  plan_date:      'B9',
  plan_year:      'D9',
  status:         'F9',
  milestone_count:'B10',
  plan_notes:     'D10',
  item1_description:    'B14',
  item1_due_date:       'C14',
  item1_support_needed: 'D14',
  item2_description:    'B15',
  item2_due_date:       'C15',
  item2_support_needed: 'D15',
  item3_description:    'B16',
  item3_due_date:       'C16',
  item3_support_needed: 'D16',
  item4_description:    'B17',
  item4_due_date:       'C17',
  item4_support_needed: 'D17',
  item5_description:    'B18',
  item5_due_date:       'C18',
  item5_support_needed: 'D18',
};

function getField(workbook: ExcelJS.Workbook, ws: ExcelJS.Worksheet, name: string): ExcelJS.CellValue {
  const addr = NAMED_CELL_MAP[name];
  if (!addr) return null;
  return ws.getCell(addr).value;
}

function getFieldText(workbook: ExcelJS.Workbook, ws: ExcelJS.Worksheet, name: string): string {
  const addr = NAMED_CELL_MAP[name];
  if (!addr) return '';
  return getCellText(ws, addr);
}

export interface ExcelImportResult {
  success: boolean;
  payload?: IdpFilePayload;
  error?: string;
}

export async function parseEmployeeFormExcel(filePath: string): Promise<ExcelImportResult> {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);

    const ws = wb.worksheets[0];
    if (!ws) {
      return { success: false, error: 'The selected file has no worksheets.' };
    }

    // ── Employee fields ──────────────────────────────────────────────────────
    const employeeName = getFieldText(wb, ws, 'employee_name');
    const managerName  = getFieldText(wb, ws, 'manager_name');

    if (!employeeName) {
      return { success: false, error: 'Employee Full Name is required (cell B5 is empty).' };
    }
    if (!managerName) {
      return { success: false, error: 'Manager Name is required (cell F5 is empty).' };
    }

    const jobTitle   = getFieldText(wb, ws, 'job_title');
    const department = getFieldText(wb, ws, 'department');

    // ── Plan fields ───────────────────────────────────────────────────────────
    const rawPlanDate = getField(wb, ws, 'plan_date');
    const planDate    = parseDate(rawPlanDate);
    if (!planDate) {
      return { success: false, error: 'Plan Date is required (cell B9 is empty or invalid). Use YYYY-MM-DD format.' };
    }

    const rawPlanYear  = getField(wb, ws, 'plan_year');
    const planYear     = rawPlanYear != null ? Number(rawPlanYear) : new Date(planDate).getFullYear();
    if (isNaN(planYear) || planYear < 2000 || planYear > 2100) {
      return { success: false, error: `Plan Year "${rawPlanYear}" is not a valid year (2000–2100).` };
    }

    const statusRaw = getFieldText(wb, ws, 'status');
    const status    = parseStatus(statusRaw);

    const milestoneRaw   = getField(wb, ws, 'milestone_count');
    const milestoneCount = parseMilestoneCount(
      milestoneRaw != null ? String(milestoneRaw) : null
    );

    const planNotes = getFieldText(wb, ws, 'plan_notes');

    // ── Development items ─────────────────────────────────────────────────────
    const items: IdpFilePayload['items'] = [];
    for (let i = 1; i <= NUM_ITEM_ROWS; i++) {
      const desc    = getFieldText(wb, ws, `item${i}_description`);
      const dueDate = parseDate(getField(wb, ws, `item${i}_due_date`));
      const support = getFieldText(wb, ws, `item${i}_support_needed`);

      if (desc) {
        items.push({
          item_description: desc,
          due_date:         dueDate,
          support_needed:   support,
          sort_order:       items.length,
          milestones:       [],
        });
      }
    }

    if (items.length === 0) {
      return { success: false, error: 'At least one development item with a Description is required.' };
    }

    const payload: IdpFilePayload = {
      version:  IDP_FILE_VERSION,
      savedAt:  new Date().toISOString(),
      employee: {
        name:         employeeName,
        manager_name: managerName,
        job_title:    jobTitle,
        department:   department,
      },
      plan: {
        plan_date:       planDate,
        plan_year:       planYear,
        status,
        notes:           planNotes,
        milestone_count: milestoneCount,
      },
      items,
    };

    return { success: true, payload };
  } catch (err) {
    return { success: false, error: `Failed to read Excel file: ${String(err)}` };
  }
}
