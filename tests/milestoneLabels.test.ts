/**
 * Functional tests for milestoneLabels utility (v1.0.8)
 * Tests all 5 preset configurations plus DB milestone_count integration.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  milestoneLabel,
  milestoneLabelFull,
  milestoneColumnHeader,
  milestonePeriods,
  MILESTONE_PRESETS,
} from '../src/utils/milestoneLabels';
import Database from 'better-sqlite3';
import { initSchema, employeeCreate, planCreate, planGetById } from '../electron/database';

// ─── milestoneLabel ───────────────────────────────────────────────────────────

describe('milestoneLabel', () => {
  describe('count=2 (Semi-Annual)', () => {
    it('returns H1 for period 1', () => expect(milestoneLabel(1, 2)).toBe('H1'));
    it('returns H2 for period 2', () => expect(milestoneLabel(2, 2)).toBe('H2'));
  });

  describe('count=3 (Thirds)', () => {
    it('returns T1 for period 1', () => expect(milestoneLabel(1, 3)).toBe('T1'));
    it('returns T2 for period 2', () => expect(milestoneLabel(2, 3)).toBe('T2'));
    it('returns T3 for period 3', () => expect(milestoneLabel(3, 3)).toBe('T3'));
  });

  describe('count=4 (Quarterly — default)', () => {
    it('returns Q1 for period 1', () => expect(milestoneLabel(1, 4)).toBe('Q1'));
    it('returns Q2 for period 2', () => expect(milestoneLabel(2, 4)).toBe('Q2'));
    it('returns Q3 for period 3', () => expect(milestoneLabel(3, 4)).toBe('Q3'));
    it('returns Q4 for period 4', () => expect(milestoneLabel(4, 4)).toBe('Q4'));
  });

  describe('count=6 (Bi-Monthly)', () => {
    it('returns B1 for period 1', () => expect(milestoneLabel(1, 6)).toBe('B1'));
    it('returns B6 for period 6', () => expect(milestoneLabel(6, 6)).toBe('B6'));
  });

  describe('count=12 (Monthly)', () => {
    it('returns M1 for period 1',  () => expect(milestoneLabel(1, 12)).toBe('M1'));
    it('returns M12 for period 12', () => expect(milestoneLabel(12, 12)).toBe('M12'));
  });

  describe('unknown count (generic)', () => {
    it('returns P1 for count=5, period 1', () => expect(milestoneLabel(1, 5)).toBe('P1'));
    it('returns P8 for count=8, period 8', () => expect(milestoneLabel(8, 8)).toBe('P8'));
  });
});

// ─── milestoneLabelFull ───────────────────────────────────────────────────────

describe('milestoneLabelFull', () => {
  it('returns "Half 1" for count=2, period 1',       () => expect(milestoneLabelFull(1, 2)).toBe('Half 1'));
  it('returns "Third 3" for count=3, period 3',      () => expect(milestoneLabelFull(3, 3)).toBe('Third 3'));
  it('returns "Quarter 2" for count=4, period 2',    () => expect(milestoneLabelFull(2, 4)).toBe('Quarter 2'));
  it('returns "Bi-Month 5" for count=6, period 5',   () => expect(milestoneLabelFull(5, 6)).toBe('Bi-Month 5'));
  it('returns "Month 11" for count=12, period 11',   () => expect(milestoneLabelFull(11, 12)).toBe('Month 11'));
  it('returns "Period 7" for unknown count',          () => expect(milestoneLabelFull(7, 9)).toBe('Period 7'));
});

// ─── milestoneColumnHeader ────────────────────────────────────────────────────

describe('milestoneColumnHeader', () => {
  it('is identical to milestoneLabel for all presets', () => {
    const presets = [2, 3, 4, 6, 12];
    for (const count of presets) {
      for (let p = 1; p <= count; p++) {
        expect(milestoneColumnHeader(p, count)).toBe(milestoneLabel(p, count));
      }
    }
  });
});

// ─── milestonePeriods ─────────────────────────────────────────────────────────

describe('milestonePeriods', () => {
  it('returns [1, 2] for count=2',   () => expect(milestonePeriods(2)).toEqual([1, 2]));
  it('returns [1,2,3] for count=3',  () => expect(milestonePeriods(3)).toEqual([1, 2, 3]));
  it('returns [1..4] for count=4',   () => expect(milestonePeriods(4)).toEqual([1, 2, 3, 4]));
  it('returns [1..6] for count=6',   () => expect(milestonePeriods(6)).toHaveLength(6));
  it('returns [1..12] for count=12', () => {
    const periods = milestonePeriods(12);
    expect(periods).toHaveLength(12);
    expect(periods[0]).toBe(1);
    expect(periods[11]).toBe(12);
  });
  it('returns empty array for count=0', () => expect(milestonePeriods(0)).toEqual([]));
});

// ─── MILESTONE_PRESETS ────────────────────────────────────────────────────────

describe('MILESTONE_PRESETS', () => {
  it('contains exactly 5 presets', () => expect(MILESTONE_PRESETS).toHaveLength(5));

  it('has values 2, 3, 4, 6, 12', () => {
    const values = MILESTONE_PRESETS.map(p => p.value);
    expect(values).toContain(2);
    expect(values).toContain(3);
    expect(values).toContain(4);
    expect(values).toContain(6);
    expect(values).toContain(12);
  });

  it('each preset has a non-empty label', () => {
    for (const preset of MILESTONE_PRESETS) {
      expect(preset.label.length).toBeGreaterThan(0);
    }
  });

  it('quarterly preset (4) is the 3rd entry (default)', () => {
    expect(MILESTONE_PRESETS[2].value).toBe(4);
  });
});

// ─── milestone_count DB integration ──────────────────────────────────────────

describe('milestone_count DB integration', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  });

  afterEach(() => db.close());

  it('plan defaults to milestone_count=4 when not specified', () => {
    const emp = employeeCreate(db, { name: 'Alex', manager_name: 'Sam', job_title: 'Analyst', department: 'Security' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: '' });
    const full = planGetById(db, plan.id)!;
    expect(full.milestone_count).toBe(4);
  });

  for (const count of [2, 3, 4, 6, 12]) {
    it(`stores milestone_count=${count} correctly`, () => {
      const emp = employeeCreate(db, { name: `User${count}`, manager_name: 'Mgr', job_title: 'Eng', department: 'Cyber' });
      const plan = planCreate(db, { employee_id: emp.id, plan_date: '2026-06-01', plan_year: 2026, status: 'Active', notes: '', milestone_count: count });
      const full = planGetById(db, plan.id)!;
      expect(full.milestone_count).toBe(count);
    });
  }

  it('rejects milestone_count=0 (below CHECK constraint)', () => {
    const emp = employeeCreate(db, { name: 'BadUser', manager_name: 'Mgr', job_title: 'Eng', department: 'Cyber' });
    expect(() =>
      planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: '', milestone_count: 0 })
    ).toThrow();
  });

  it('rejects milestone_count=53 (above CHECK constraint)', () => {
    const emp = employeeCreate(db, { name: 'BadUser2', manager_name: 'Mgr', job_title: 'Eng', department: 'Cyber' });
    expect(() =>
      planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: '', milestone_count: 53 })
    ).toThrow();
  });

  it('milestones for count=12 accept quarter values 1..12', () => {
    const emp = employeeCreate(db, { name: 'Monthly', manager_name: 'Mgr', job_title: 'Eng', department: 'Cyber' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2026-01-01', plan_year: 2026, status: 'Active', notes: '', milestone_count: 12 });
    const full = planGetById(db, plan.id)!;
    // Verify the plan was stored with correct milestone count
    expect(full.milestone_count).toBe(12);

    // Insert milestones for all 12 periods
    const item = db.prepare(`INSERT INTO development_items (plan_id, item_description, due_date, support_needed, sort_order) VALUES (?, ?, '', '', 0)`)
      .run(plan.id, 'Monthly skill development');
    const itemId = Number(item.lastInsertRowid);

    for (let m = 1; m <= 12; m++) {
      db.prepare(`INSERT INTO quarterly_milestones (item_id, quarter, status, percent_complete, notes) VALUES (?, ?, 'Not Started', 0, '')`)
        .run(itemId, m);
    }

    const milestones = db.prepare(`SELECT * FROM quarterly_milestones WHERE item_id = ? ORDER BY quarter`).all(itemId) as Array<{ quarter: number }>;
    expect(milestones).toHaveLength(12);
    expect(milestones[0].quarter).toBe(1);
    expect(milestones[11].quarter).toBe(12);
  });

  it('milestone_count persists through DB migration path', () => {
    // Simulate a pre-v1.0.8 DB that lacks milestone_count column
    const oldDb = new Database(':memory:');
    oldDb.pragma('foreign_keys = ON');
    // Create old schema WITHOUT milestone_count
    oldDb.exec(`
      CREATE TABLE employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        manager_name TEXT NOT NULL,
        job_title TEXT NOT NULL DEFAULT '',
        department TEXT NOT NULL DEFAULT '',
        created_at DATETIME DEFAULT (datetime('now')),
        updated_at DATETIME DEFAULT (datetime('now'))
      );
      CREATE TABLE development_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        plan_date TEXT NOT NULL,
        plan_year INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        notes TEXT NOT NULL DEFAULT '',
        created_at DATETIME DEFAULT (datetime('now')),
        updated_at DATETIME DEFAULT (datetime('now'))
      );
      CREATE TABLE development_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER NOT NULL REFERENCES development_plans(id) ON DELETE CASCADE,
        item_description TEXT NOT NULL,
        due_date TEXT NOT NULL DEFAULT '',
        support_needed TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT (datetime('now')),
        updated_at DATETIME DEFAULT (datetime('now'))
      );
      CREATE TABLE quarterly_milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL REFERENCES development_items(id) ON DELETE CASCADE,
        quarter INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'Not Started',
        percent_complete INTEGER NOT NULL DEFAULT 0,
        notes TEXT NOT NULL DEFAULT '',
        updated_at DATETIME DEFAULT (datetime('now')),
        UNIQUE(item_id, quarter)
      );
    `);

    // Seed a legacy plan (no milestone_count)
    oldDb.prepare(`INSERT INTO employees (name, manager_name) VALUES ('Legacy User', 'Old Boss')`).run();
    const empRow = oldDb.prepare(`SELECT id FROM employees LIMIT 1`).get() as { id: number };
    oldDb.prepare(`INSERT INTO development_plans (employee_id, plan_date, plan_year, status, notes) VALUES (?, '2025-01-01', 2025, 'Active', '')`).run(empRow.id);

    // Now run initSchema (migration) — should add milestone_count without error
    expect(() => initSchema(oldDb)).not.toThrow();

    // Verify the column now exists and defaults to 4
    const migratedPlan = oldDb.prepare(`SELECT milestone_count FROM development_plans LIMIT 1`).get() as { milestone_count: number };
    expect(migratedPlan.milestone_count).toBe(4);

    oldDb.close();
  });
});
