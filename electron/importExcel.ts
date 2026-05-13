/**
 * electron/importExcel.ts
 *
 * Reads a completed IDP Employee Input Form (.xlsx) and returns an
 * IdpFilePayload that can be passed directly to importFilePayload().
 *
 * Cell address mapping (mirrors generateFormTemplate.js v1.2.0):
 *
 *  Section 1 — Employee Information
 *   B5  employee_name        → employee.name
 *   G5  manager_name         → employee.manager_name
 *   B6  job_title            → employee.job_title
 *   G6  department           → employee.department
 *
 *  Section 2 — Plan Details
 *   B9  plan_date            → plan.plan_date
 *   E9  plan_year            → plan.plan_year
 *   G9  status               → plan.status
 *   B10 milestone_count      → plan.milestone_count  (parse leading digit)
 *   E10 plan_notes           → plan.notes
 *
 *  Section 3 — Development Items (rows 14–18)
 *   B{r}  item{n}_description
 *   C{r}  item{n}_due_date
 *   D{r}  item{n}_cost_estimate
 *   E{r}  item{n}_support_needed
 *
 *  Section 4 — Quarterly Milestones (rows 22–26, cols B–I)
 *   B{r}  item{n}_q1_status,  C{r}  item{n}_q1_notes
 *   D{r}  item{n}_q2_status,  E{r}  item{n}_q2_notes
 *   F{r}  item{n}_q3_status,  G{r}  item{n}_q3_notes
 *   H{r}  item{n}_q4_status,  I{r}  item{n}_q4_notes
 */

import ExcelJS from 'exceljs';
import type { IdpFilePayload, PlanStatus, MilestoneStatus } from './types';
import { IDP_FILE_VERSION } from './types';

const NUM_ITEM_ROWS      = 5;
const NUM_MILESTONE_COLS = 4; // periods shown on form

// ─── Lookup tables ────────────────────────────────────────────────────────────

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
  const numMatch = s.match(/^(\d+)/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if ([2, 3, 4, 6, 12].includes(n)) return n;
  }
  const lower = s.toLowerCase();
  for (const [key, val] of Object.entries(MILESTONE_MAP)) {
    if (lower.includes(key)) return val;
  }
  return 4;
}

function parseStatus(raw: string | null | undefined): PlanStatus {
  const s = (raw ?? 'Active').trim();
  if (s === 'Inactive' || s === 'Complete') return s;
  return 'Active';
}

function parseMilestoneStatus(raw: string | null | undefined): MilestoneStatus {
  const s = (raw ?? 'Not Started').trim();
  if (s === 'In Progress' || s === 'Complete') return s;
  return 'Not Started';
}

function parseDate(raw: ExcelJS.CellValue): string {
  if (raw == null) return '';
  if (raw instanceof Date) return raw.toISOString().split('T')[0];
  if (typeof raw === 'number') {
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }
  const s = String(raw).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return s;
}

function getCellText(ws: ExcelJS.Worksheet, addr: string): string {
  const cell = ws.getCell(addr);
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'object' && 'richText' in (v as object)) {
    return (v as ExcelJS.CellRichTextValue).richText.map((r: ExcelJS.RichText) => r.text).join('');
  }
  return String(v).trim();
}

// ─── Cell address map (matches generateFormTemplate.js v1.2.0) ──────────────

const NAMED_CELL_MAP: Record<string, string> = {
  // Section 1
  employee_name:  'B5',
  manager_name:   'G5',
  job_title:      'B6',
  department:     'G6',
  // Section 2
  plan_date:      'B9',
  plan_year:      'E9',
  status:         'G9',
  milestone_count:'B10',
  plan_notes:     'E10',
  // Section 3 — items
  item1_description:    'B14', item1_due_date: 'C14', item1_cost_estimate: 'D14', item1_support_needed: 'E14',
  item2_description:    'B15', item2_due_date: 'C15', item2_cost_estimate: 'D15', item2_support_needed: 'E15',
  item3_description:    'B16', item3_due_date: 'C16', item3_cost_estimate: 'D16', item3_support_needed: 'E16',
  item4_description:    'B17', item4_due_date: 'C17', item4_cost_estimate: 'D17', item4_support_needed: 'E17',
  item5_description:    'B18', item5_due_date: 'C18', item5_cost_estimate: 'D18', item5_support_needed: 'E18',
  // Section 4 — milestones (rows 22–26, 4 periods each)
  item1_q1_status: 'B22', item1_q1_notes: 'C22',
  item1_q2_status: 'D22', item1_q2_notes: 'E22',
  item1_q3_status: 'F22', item1_q3_notes: 'G22',
  item1_q4_status: 'H22', item1_q4_notes: 'I22',

  item2_q1_status: 'B23', item2_q1_notes: 'C23',
  item2_q2_status: 'D23', item2_q2_notes: 'E23',
  item2_q3_status: 'F23', item2_q3_notes: 'G23',
  item2_q4_status: 'H23', item2_q4_notes: 'I23',

  item3_q1_status: 'B24', item3_q1_notes: 'C24',
  item3_q2_status: 'D24', item3_q2_notes: 'E24',
  item3_q3_status: 'F24', item3_q3_notes: 'G24',
  item3_q4_status: 'H24', item3_q4_notes: 'I24',

  item4_q1_status: 'B25', item4_q1_notes: 'C25',
  item4_q2_status: 'D25', item4_q2_notes: 'E25',
  item4_q3_status: 'F25', item4_q3_notes: 'G25',
  item4_q4_status: 'H25', item4_q4_notes: 'I25',

  item5_q1_status: 'B26', item5_q1_notes: 'C26',
  item5_q2_status: 'D26', item5_q2_notes: 'E26',
  item5_q3_status: 'F26', item5_q3_notes: 'G26',
  item5_q4_status: 'H26', item5_q4_notes: 'I26',
};

function getField(ws: ExcelJS.Worksheet, name: string): ExcelJS.CellValue {
  const addr = NAMED_CELL_MAP[name];
  if (!addr) return null;
  return ws.getCell(addr).value;
}

function getFieldText(ws: ExcelJS.Worksheet, name: string): string {
  const addr = NAMED_CELL_MAP[name];
  if (!addr) return '';
  return getCellText(ws, addr);
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ExcelImportResult {
  success: boolean;
  payload?: IdpFilePayload;
  error?: string;
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export async function parseEmployeeFormExcel(filePath: string): Promise<ExcelImportResult> {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);

    const ws = wb.worksheets[0];
    if (!ws) {
      return { success: false, error: 'The selected file has no worksheets.' };
    }

    // ── Section 1: Employee ────────────────────────────────────────────────
    const employeeName = getFieldText(ws, 'employee_name');
    const managerName  = getFieldText(ws, 'manager_name');

    if (!employeeName) {
      return { success: false, error: 'Employee Full Name is required (cell B5 is empty).' };
    }
    if (!managerName) {
      return { success: false, error: 'Manager Name is required (cell G5 is empty).' };
    }

    const jobTitle   = getFieldText(ws, 'job_title');
    const department = getFieldText(ws, 'department');

    // ── Section 2: Plan ────────────────────────────────────────────────────
    const rawPlanDate = getField(ws, 'plan_date');
    const planDate    = parseDate(rawPlanDate);
    if (!planDate) {
      return { success: false, error: 'Plan Date is required (cell B9 is empty or invalid). Use YYYY-MM-DD format.' };
    }

    const rawPlanYear = getField(ws, 'plan_year');
    const planYear    = rawPlanYear != null ? Number(rawPlanYear) : new Date(planDate).getFullYear();
    if (isNaN(planYear) || planYear < 2000 || planYear > 2100) {
      return { success: false, error: `Plan Year "${rawPlanYear}" is not a valid year (2000–2100).` };
    }

    const status         = parseStatus(getFieldText(ws, 'status'));
    const milestoneCount = parseMilestoneCount(getField(ws, 'milestone_count') != null ? String(getField(ws, 'milestone_count')) : null);
    const planNotes      = getFieldText(ws, 'plan_notes');

    // ── Section 3: Items + Section 4: Milestones ──────────────────────────
    const items: IdpFilePayload['items'] = [];

    for (let i = 1; i <= NUM_ITEM_ROWS; i++) {
      const desc         = getFieldText(ws, `item${i}_description`);
      const dueDate      = parseDate(getField(ws, `item${i}_due_date`));
      const costEstimate = getFieldText(ws, `item${i}_cost_estimate`);
      const support      = getFieldText(ws, `item${i}_support_needed`);

      if (!desc) continue; // skip rows with no description

      // Read milestone data for this item (up to NUM_MILESTONE_COLS periods)
      const milestones: IdpFilePayload['items'][0]['milestones'] = [];
      for (let q = 1; q <= NUM_MILESTONE_COLS; q++) {
        const statusRaw = getFieldText(ws, `item${i}_q${q}_status`);
        const notes     = getFieldText(ws, `item${i}_q${q}_notes`);
        const mStatus   = parseMilestoneStatus(statusRaw);

        // Only include milestones that have actual data (not the default blank / "Not Started" with no notes)
        const isDefault = (mStatus === 'Not Started' && !notes);
        if (!isDefault) {
          milestones.push({ quarter: q, status: mStatus, percent_complete: 0, notes });
        }
      }

      items.push({
        item_description: desc,
        due_date:         dueDate,
        cost_estimate:    costEstimate,
        support_needed:   support,
        sort_order:       items.length,
        milestones,
      });
    }

    if (items.length === 0) {
      return { success: false, error: 'At least one development item with a Description is required.' };
    }

    const payload: IdpFilePayload = {
      version:  IDP_FILE_VERSION,
      savedAt:  new Date().toISOString(),
      employee: { name: employeeName, manager_name: managerName, job_title: jobTitle, department },
      plan:     { plan_date: planDate, plan_year: planYear, status, notes: planNotes, milestone_count: milestoneCount },
      items,
    };

    return { success: true, payload };
  } catch (err) {
    return { success: false, error: `Failed to read Excel file: ${String(err)}` };
  }
}
