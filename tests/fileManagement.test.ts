/**
 * File management unit tests — buildFilePayload / importFilePayload logic
 * (tested directly against the helper functions without Electron IPC)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema, employeeCreate, planCreate, itemCreate, milestoneUpsert } from '../electron/database';
import { IDP_FILE_VERSION } from '../electron/types';
import type { IdpFilePayload } from '../electron/types';

// ─── Inline reimplementation of buildFilePayload and importFilePayload ─────────
// (mirrors the logic in main.ts so we can unit-test without Electron)

function buildFilePayload(db: Database.Database, planId: number): IdpFilePayload {
  const plan = db.prepare(`SELECT * FROM development_plans WHERE id = ?`).get(planId) as {
    id: number; employee_id: number; plan_date: string; plan_year: number; status: string; notes: string;
  };
  if (!plan) throw new Error('Plan not found');

  const employee = db.prepare(`SELECT * FROM employees WHERE id = ?`).get(plan.employee_id) as {
    id: number; name: string; manager_name: string; job_title: string; department: string;
  };
  if (!employee) throw new Error('Employee not found');

  const items = db.prepare(
    `SELECT * FROM development_items WHERE plan_id = ? ORDER BY sort_order`
  ).all(planId) as Array<{ id: number; item_description: string; due_date: string; support_needed: string; sort_order: number }>;

  const fileItems = items.map(item => {
    const milestones = db.prepare(
      `SELECT quarter, status, percent_complete, notes FROM quarterly_milestones WHERE item_id = ?`
    ).all(item.id) as Array<{ quarter: number; status: string; percent_complete: number; notes: string }>;
    return { item_description: item.item_description, due_date: item.due_date, support_needed: item.support_needed, sort_order: item.sort_order, milestones };
  });

  return {
    version: IDP_FILE_VERSION,
    savedAt: new Date().toISOString(),
    employee: { name: employee.name, manager_name: employee.manager_name, job_title: employee.job_title, department: employee.department },
    plan: { plan_date: plan.plan_date, plan_year: plan.plan_year, status: plan.status as 'Active' | 'Inactive' | 'Complete', notes: plan.notes },
    items: fileItems,
  };
}

function importFilePayload(db: Database.Database, payload: IdpFilePayload): number {
  let emp = db.prepare(`SELECT id FROM employees WHERE name = ? AND manager_name = ?`)
    .get(payload.employee.name, payload.employee.manager_name) as { id: number } | undefined;

  if (!emp) {
    const r = db.prepare(`INSERT INTO employees (name, manager_name, job_title, department) VALUES (?, ?, ?, ?)`)
      .run(payload.employee.name, payload.employee.manager_name, payload.employee.job_title ?? '', payload.employee.department ?? '');
    emp = { id: Number(r.lastInsertRowid) };
  }

  const planResult = db.prepare(
    `INSERT INTO development_plans (employee_id, plan_date, plan_year, status, notes) VALUES (?, ?, ?, ?, ?)`
  ).run(emp.id, payload.plan.plan_date, payload.plan.plan_year, payload.plan.status, payload.plan.notes ?? '');
  const planId = Number(planResult.lastInsertRowid);

  for (const item of payload.items) {
    const itemResult = db.prepare(
      `INSERT INTO development_items (plan_id, item_description, due_date, support_needed, sort_order) VALUES (?, ?, ?, ?, ?)`
    ).run(planId, item.item_description, item.due_date ?? '', item.support_needed ?? '', item.sort_order ?? 0);
    const itemId = Number(itemResult.lastInsertRowid);

    for (const m of item.milestones ?? []) {
      db.prepare(
        `INSERT OR REPLACE INTO quarterly_milestones (item_id, quarter, status, percent_complete, notes) VALUES (?, ?, ?, ?, ?)`
      ).run(itemId, m.quarter, m.status ?? 'Not Started', m.percent_complete ?? 0, m.notes ?? '');
    }
  }

  return planId;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let db: Database.Database;

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  initSchema(db);
});

afterEach(() => {
  db.close();
});

function seedPlan() {
  const emp = employeeCreate(db, { name: 'Jane Smith', manager_name: 'Bob Jones', job_title: 'RN', department: 'Cardiology' });
  const plan = planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: 'Focus on leadership' });
  const item = itemCreate(db, { plan_id: plan.id, item_description: 'Complete ACLS certification', due_date: '2026-06-30', support_needed: 'Manager mentoring', sort_order: 0 });
  milestoneUpsert(db, { item_id: item.id, quarter: 1, status: 'In Progress', percent_complete: 50, notes: 'On track' });
  milestoneUpsert(db, { item_id: item.id, quarter: 2, status: 'Not Started', percent_complete: 0, notes: '' });
  return { emp, plan, item };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildFilePayload', () => {
  it('returns correct version and savedAt', () => {
    const { plan } = seedPlan();
    const payload = buildFilePayload(db, plan.id);
    expect(payload.version).toBe(IDP_FILE_VERSION);
    expect(payload.savedAt).toBeTruthy();
  });

  it('captures employee fields', () => {
    const { plan } = seedPlan();
    const payload = buildFilePayload(db, plan.id);
    expect(payload.employee.name).toBe('Jane Smith');
    expect(payload.employee.manager_name).toBe('Bob Jones');
    expect(payload.employee.job_title).toBe('RN');
    expect(payload.employee.department).toBe('Cardiology');
  });

  it('captures plan fields', () => {
    const { plan } = seedPlan();
    const payload = buildFilePayload(db, plan.id);
    expect(payload.plan.plan_year).toBe(2026);
    expect(payload.plan.status).toBe('Active');
    expect(payload.plan.notes).toBe('Focus on leadership');
  });

  it('captures items with milestones', () => {
    const { plan } = seedPlan();
    const payload = buildFilePayload(db, plan.id);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].item_description).toBe('Complete ACLS certification');
    expect(payload.items[0].milestones).toHaveLength(2);
    const q1 = payload.items[0].milestones.find(m => m.quarter === 1);
    expect(q1?.status).toBe('In Progress');
    expect(q1?.percent_complete).toBe(50);
    expect(q1?.notes).toBe('On track');
  });

  it('throws for non-existent plan', () => {
    expect(() => buildFilePayload(db, 99999)).toThrow('Plan not found');
  });
});

describe('importFilePayload', () => {
  it('creates new plan and returns valid planId', () => {
    const { plan } = seedPlan();
    const payload = buildFilePayload(db, plan.id);
    const newPlanId = importFilePayload(db, payload);
    expect(newPlanId).toBeTypeOf('number');
    expect(newPlanId).not.toBe(plan.id);
  });

  it('restores employee, plan, items, and milestones', () => {
    const { plan } = seedPlan();
    const payload = buildFilePayload(db, plan.id);
    const newPlanId = importFilePayload(db, payload);

    const restoredPlan = db.prepare(`SELECT * FROM development_plans WHERE id = ?`).get(newPlanId) as { plan_year: number; status: string; notes: string };
    expect(restoredPlan.plan_year).toBe(2026);
    expect(restoredPlan.status).toBe('Active');
    expect(restoredPlan.notes).toBe('Focus on leadership');

    const items = db.prepare(`SELECT * FROM development_items WHERE plan_id = ?`).all(newPlanId) as Array<{ id: number; item_description: string }>;
    expect(items).toHaveLength(1);
    expect(items[0].item_description).toBe('Complete ACLS certification');

    const milestones = db.prepare(`SELECT * FROM quarterly_milestones WHERE item_id = ?`).all(items[0].id) as Array<{ quarter: number; status: string; percent_complete: number }>;
    expect(milestones).toHaveLength(2);
    const q1 = milestones.find(m => m.quarter === 1);
    expect(q1?.status).toBe('In Progress');
    expect(q1?.percent_complete).toBe(50);
  });

  it('reuses existing employee on re-import', () => {
    const { plan } = seedPlan();
    const payload = buildFilePayload(db, plan.id);

    const countBefore = (db.prepare(`SELECT COUNT(*) as c FROM employees`).get() as { c: number }).c;
    importFilePayload(db, payload);
    importFilePayload(db, payload); // import again
    const countAfter = (db.prepare(`SELECT COUNT(*) as c FROM employees`).get() as { c: number }).c;

    // Employee should not be duplicated
    expect(countAfter).toBe(countBefore);
  });

  it('creates a new plan even when employee already exists', () => {
    const { plan } = seedPlan();
    const payload = buildFilePayload(db, plan.id);

    const countBefore = (db.prepare(`SELECT COUNT(*) as c FROM development_plans`).get() as { c: number }).c;
    importFilePayload(db, payload);
    const countAfter = (db.prepare(`SELECT COUNT(*) as c FROM development_plans`).get() as { c: number }).c;

    expect(countAfter).toBe(countBefore + 1);
  });

  it('handles payload with no items', () => {
    const { plan } = seedPlan();
    const payload = buildFilePayload(db, plan.id);
    payload.items = [];
    const newPlanId = importFilePayload(db, payload);
    const items = db.prepare(`SELECT * FROM development_items WHERE plan_id = ?`).all(newPlanId);
    expect(items).toHaveLength(0);
  });

  it('handles items with no milestones', () => {
    const { plan } = seedPlan();
    const payload = buildFilePayload(db, plan.id);
    payload.items[0].milestones = [];
    const newPlanId = importFilePayload(db, payload);
    const items = db.prepare(`SELECT * FROM development_items WHERE plan_id = ?`).all(newPlanId) as Array<{ id: number }>;
    const milestones = db.prepare(`SELECT * FROM quarterly_milestones WHERE item_id = ?`).all(items[0].id);
    expect(milestones).toHaveLength(0);
  });
});

describe('round-trip serialization', () => {
  it('payload survives JSON stringify → parse intact', () => {
    const { plan } = seedPlan();
    const original = buildFilePayload(db, plan.id);
    const roundTripped: IdpFilePayload = JSON.parse(JSON.stringify(original));

    expect(roundTripped.version).toBe(original.version);
    expect(roundTripped.employee.name).toBe(original.employee.name);
    expect(roundTripped.plan.plan_year).toBe(original.plan.plan_year);
    expect(roundTripped.items[0].milestones[0].percent_complete).toBe(50);
  });
});
