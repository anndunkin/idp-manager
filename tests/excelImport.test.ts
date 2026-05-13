/**
 * tests/excelImport.test.ts
 *
 * Tests for the Excel Employee Input Form parser (electron/importExcel.ts).
 * All tests run in Node environment using a real ExcelJS workbook built in memory.
 *
 * Coverage (v1.2.0):
 *   - Happy path: all fields populated, all 5 items, cost_estimate, milestones
 *   - Partial items: only items with non-empty descriptions are imported
 *   - Date parsing: ISO string, JS Date object, empty date
 *   - Milestone count: all dropdown label variants → correct numeric value
 *   - Status parsing: Active / Inactive / Complete / unknown → Active
 *   - Milestone section: Status + Notes per period, default "Not Started" skipped
 *   - Cost estimate: populated value, empty value
 *   - Validation errors: missing employee name, manager name, plan date, no items
 *   - Edge cases: whitespace trimming
 *   - Round-trip: generated template → parse → error (blank form)
 */

import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { parseEmployeeFormExcel } from '../electron/importExcel';

// ── Cell map matching generateFormTemplate.js v1.2.0 ─────────────────────────
const CELL_MAP: Record<string, string> = {
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
  // Section 3 items
  item1_description:    'B14', item1_due_date: 'C14', item1_cost_estimate: 'D14', item1_support_needed: 'E14',
  item2_description:    'B15', item2_due_date: 'C15', item2_cost_estimate: 'D15', item2_support_needed: 'E15',
  item3_description:    'B16', item3_due_date: 'C16', item3_cost_estimate: 'D16', item3_support_needed: 'E16',
  item4_description:    'B17', item4_due_date: 'C17', item4_cost_estimate: 'D17', item4_support_needed: 'E17',
  item5_description:    'B18', item5_due_date: 'C18', item5_cost_estimate: 'D18', item5_support_needed: 'E18',
  // Section 4 milestones
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

async function buildWorkbook(values: Record<string, ExcelJS.CellValue>): Promise<string> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('IDP Input Form');
  for (const [name, addr] of Object.entries(CELL_MAP)) {
    const val = values[name];
    if (val !== undefined) ws.getCell(addr).value = val;
  }
  const tmpPath = path.join(os.tmpdir(), `idp_test_${Date.now()}_${Math.random().toString(36).slice(2)}.xlsx`);
  await wb.xlsx.writeFile(tmpPath);
  return tmpPath;
}

// ── Minimal valid base values ─────────────────────────────────────────────────
const VALID_BASE: Record<string, ExcelJS.CellValue> = {
  employee_name:  'Jane Smith',
  manager_name:   'Paul Selby',
  job_title:      'Security Analyst',
  department:     'Cybersecurity Operations',
  plan_date:      '2026-01-01',
  plan_year:      2026,
  status:         'Active',
  milestone_count:'4 — Quarterly (Q1–Q4)',
  plan_notes:     'Focus on certification path',
  item1_description:    'Earn CompTIA Security+',
  item1_due_date:       '2026-06-30',
  item1_cost_estimate:  '$500',
  item1_support_needed: 'Training budget, exam fee',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('parseEmployeeFormExcel', () => {

  describe('Happy path', () => {
    it('parses all fields from a fully populated form', async () => {
      const file = await buildWorkbook({
        ...VALID_BASE,
        item2_description: 'Lead tabletop exercise',
        item2_due_date:    '2026-09-30',
        item2_cost_estimate: '',
        item2_support_needed: 'Facilitation time',
      });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);

      expect(result.success).toBe(true);
      const p = result.payload!;
      expect(p.employee.name).toBe('Jane Smith');
      expect(p.employee.manager_name).toBe('Paul Selby');
      expect(p.employee.job_title).toBe('Security Analyst');
      expect(p.employee.department).toBe('Cybersecurity Operations');
      expect(p.plan.plan_date).toBe('2026-01-01');
      expect(p.plan.plan_year).toBe(2026);
      expect(p.plan.status).toBe('Active');
      expect(p.plan.milestone_count).toBe(4);
      expect(p.plan.notes).toBe('Focus on certification path');
      expect(p.items).toHaveLength(2);
      expect(p.items[0].item_description).toBe('Earn CompTIA Security+');
      expect(p.items[0].due_date).toBe('2026-06-30');
      expect(p.items[0].cost_estimate).toBe('$500');
      expect(p.items[0].support_needed).toBe('Training budget, exam fee');
      expect(p.items[1].item_description).toBe('Lead tabletop exercise');
    });

    it('assigns correct sort_order to items in sequence', async () => {
      const file = await buildWorkbook({
        ...VALID_BASE,
        item2_description: 'Item two',
        item3_description: 'Item three',
      });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(true);
      const items = result.payload!.items;
      expect(items[0].sort_order).toBe(0);
      expect(items[1].sort_order).toBe(1);
      expect(items[2].sort_order).toBe(2);
    });

    it('sets payload version to IDP_FILE_VERSION (1)', async () => {
      const file = await buildWorkbook(VALID_BASE);
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.payload!.version).toBe(1);
    });

    it('sets savedAt to a valid ISO timestamp', async () => {
      const file = await buildWorkbook(VALID_BASE);
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      const d = new Date(result.payload!.savedAt);
      expect(isNaN(d.getTime())).toBe(false);
    });
  });

  describe('Cost estimate', () => {
    it('parses cost_estimate from item row', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, item1_cost_estimate: '$1,200' });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(true);
      expect(result.payload!.items[0].cost_estimate).toBe('$1,200');
    });

    it('defaults cost_estimate to empty string when blank', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, item1_cost_estimate: null });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(true);
      expect(result.payload!.items[0].cost_estimate).toBe('');
    });

    it('preserves numeric cost value as string', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, item1_cost_estimate: 750 });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(true);
      expect(result.payload!.items[0].cost_estimate).toBe('750');
    });
  });

  describe('Milestone section (Section 4)', () => {
    it('imports milestone status and notes when non-default values are set', async () => {
      const file = await buildWorkbook({
        ...VALID_BASE,
        item1_q1_status: 'In Progress',
        item1_q1_notes:  'Started certification prep',
        item1_q2_status: 'Complete',
        item1_q2_notes:  'Passed exam',
      });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(true);
      const ms = result.payload!.items[0].milestones;
      expect(ms).toHaveLength(2);
      expect(ms[0]).toMatchObject({ quarter: 1, status: 'In Progress', notes: 'Started certification prep' });
      expect(ms[1]).toMatchObject({ quarter: 2, status: 'Complete', notes: 'Passed exam' });
    });

    it('skips milestone rows that are default "Not Started" with no notes', async () => {
      const file = await buildWorkbook({
        ...VALID_BASE,
        item1_q1_status: 'Not Started',
        item1_q1_notes:  '',
      });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(true);
      // Default Not Started + no notes = skipped
      expect(result.payload!.items[0].milestones).toHaveLength(0);
    });

    it('includes milestone with "Not Started" status when notes are present', async () => {
      const file = await buildWorkbook({
        ...VALID_BASE,
        item1_q1_status: 'Not Started',
        item1_q1_notes:  'Planned for Q1',
      });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(true);
      const ms = result.payload!.items[0].milestones;
      expect(ms).toHaveLength(1);
      expect(ms[0]).toMatchObject({ quarter: 1, status: 'Not Started', notes: 'Planned for Q1' });
    });

    it('milestone percent_complete defaults to 0 on import from form', async () => {
      const file = await buildWorkbook({
        ...VALID_BASE,
        item1_q1_status: 'In Progress',
        item1_q1_notes:  'Working on it',
      });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(true);
      expect(result.payload!.items[0].milestones[0].percent_complete).toBe(0);
    });
  });

  describe('Partial items', () => {
    it('imports only rows where description is non-empty', async () => {
      const file = await buildWorkbook({
        ...VALID_BASE,
        item2_description: '',
        item3_description: 'Third item',
        item4_description: '  ',
        item5_description: 'Fifth item',
      });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(true);
      const descs = result.payload!.items.map(i => i.item_description);
      expect(descs).toContain('Earn CompTIA Security+');
      expect(descs).toContain('Third item');
      expect(descs).toContain('Fifth item');
      expect(descs).not.toContain('');
    });

    it('handles all 5 items populated', async () => {
      const file = await buildWorkbook({
        ...VALID_BASE,
        item2_description: 'Item 2',
        item3_description: 'Item 3',
        item4_description: 'Item 4',
        item5_description: 'Item 5',
      });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(true);
      expect(result.payload!.items).toHaveLength(5);
    });

    it('starts milestones array empty when Section 4 has all defaults', async () => {
      const file = await buildWorkbook(VALID_BASE);
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(true);
      expect(result.payload!.items[0].milestones).toEqual([]);
    });
  });

  describe('Date parsing', () => {
    it('parses ISO date string', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, plan_date: '2026-05-15', item1_due_date: '2026-12-31' });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(true);
      expect(result.payload!.plan.plan_date).toBe('2026-05-15');
      expect(result.payload!.items[0].due_date).toBe('2026-12-31');
    });

    it('parses JS Date object stored by ExcelJS', async () => {
      const file = await buildWorkbook({
        ...VALID_BASE,
        plan_date: new Date('2026-03-01'),
        item1_due_date: new Date('2026-11-15'),
      });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(true);
      expect(result.payload!.plan.plan_date).toBe('2026-03-01');
      expect(result.payload!.items[0].due_date).toBe('2026-11-15');
    });

    it('handles empty due date gracefully', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, item1_due_date: null });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(true);
      expect(result.payload!.items[0].due_date).toBe('');
    });
  });

  describe('Milestone count parsing', () => {
    const cases: Array<[ExcelJS.CellValue, number]> = [
      ['2 — Semi-Annual (H1–H2)', 2],
      ['3 — Thirds (T1–T3)',      3],
      ['4 — Quarterly (Q1–Q4)',   4],
      ['6 — Bi-Monthly (B1–B6)', 6],
      ['12 — Monthly (M1–M12)',  12],
      [2, 2], [4, 4], [12, 12],
      ['monthly', 12],
      ['quarterly', 4],
    ];

    cases.forEach(([raw, expected]) => {
      it(`"${raw}" → ${expected}`, async () => {
        const file = await buildWorkbook({ ...VALID_BASE, milestone_count: raw });
        const result = await parseEmployeeFormExcel(file);
        fs.unlinkSync(file);
        expect(result.success).toBe(true);
        expect(result.payload!.plan.milestone_count).toBe(expected);
      });
    });

    it('defaults to 4 when milestone_count is null', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, milestone_count: null });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(true);
      expect(result.payload!.plan.milestone_count).toBe(4);
    });
  });

  describe('Status parsing', () => {
    it('accepts "Active"', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, status: 'Active' });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.payload!.plan.status).toBe('Active');
    });

    it('accepts "Inactive"', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, status: 'Inactive' });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.payload!.plan.status).toBe('Inactive');
    });

    it('accepts "Complete"', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, status: 'Complete' });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.payload!.plan.status).toBe('Complete');
    });

    it('defaults unknown status to "Active"', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, status: 'Unknown' });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.payload!.plan.status).toBe('Active');
    });

    it('defaults null status to "Active"', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, status: null });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.payload!.plan.status).toBe('Active');
    });
  });

  describe('Plan year inference', () => {
    it('infers plan_year from plan_date when plan_year cell is empty', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, plan_year: null });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(true);
      expect(result.payload!.plan.plan_year).toBe(2026);
    });

    it('respects explicit plan_year when provided', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, plan_year: 2027 });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.payload!.plan.plan_year).toBe(2027);
    });
  });

  describe('Whitespace trimming', () => {
    it('trims leading/trailing whitespace from employee name', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, employee_name: '  Jane Smith  ' });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(true);
      expect(result.payload!.employee.name).toBe('Jane Smith');
    });

    it('trims whitespace from item description', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, item1_description: '  Security+ cert  ' });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(true);
      expect(result.payload!.items[0].item_description).toBe('Security+ cert');
    });
  });

  describe('Validation errors', () => {
    it('returns error when employee_name is missing', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, employee_name: '' });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Employee Full Name/i);
    });

    it('returns error when manager_name is missing', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, manager_name: '' });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Manager Name/i);
    });

    it('returns error when plan_date is missing', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, plan_date: '' });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Plan Date/i);
    });

    it('returns error when plan_year is invalid', async () => {
      const file = await buildWorkbook({ ...VALID_BASE, plan_year: 1800 });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/year/i);
    });

    it('returns error when no development items have descriptions', async () => {
      const file = await buildWorkbook({
        ...VALID_BASE,
        item1_description: '',
        item2_description: '',
        item3_description: '',
        item4_description: '',
        item5_description: '',
      });
      const result = await parseEmployeeFormExcel(file);
      fs.unlinkSync(file);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/development item/i);
    });

    it('returns error for a non-existent file path', async () => {
      const result = await parseEmployeeFormExcel('/nonexistent/path/form.xlsx');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Template round-trip', () => {
    it('can parse the generated blank template (blank fields → validation errors, not exceptions)', async () => {
      const templatePath = path.resolve(__dirname, '..', 'assets', 'IDP_Employee_Input_Form.xlsx');
      if (!fs.existsSync(templatePath)) {
        console.warn('Template not found, skipping round-trip test');
        return;
      }
      const result = await parseEmployeeFormExcel(templatePath);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
