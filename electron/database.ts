import Database from 'better-sqlite3';
import path from 'path';
import type {
  Employee, EmployeeCreate, EmployeeUpdate,
  DevelopmentPlan, PlanCreate, PlanUpdate, PlanWithItems,
  DevelopmentItem, ItemCreate, ItemUpdate,
  QuarterlyMilestone, MilestoneUpsert,
  DevelopmentItemWithMilestones,
} from './types';

let db: Database.Database;

export function getDatabase(): Database.Database {
  if (!db) {
    // Dynamic import of electron app to avoid breaking in test environments
    const { app } = require('electron') as typeof import('electron');
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'idp-manager.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

// For testing – allow injecting an in-memory database
export function setDatabase(testDb: Database.Database): void {
  db = testDb;
}

export function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      manager_name TEXT   NOT NULL,
      job_title   TEXT    NOT NULL DEFAULT '',
      department  TEXT    NOT NULL DEFAULT '',
      created_at  DATETIME DEFAULT (datetime('now')),
      updated_at  DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS development_plans (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id      INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      plan_date        TEXT    NOT NULL,
      plan_year        INTEGER NOT NULL,
      status           TEXT    NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Inactive','Complete')),
      notes            TEXT    NOT NULL DEFAULT '',
      milestone_count  INTEGER NOT NULL DEFAULT 4 CHECK(milestone_count BETWEEN 1 AND 52),
      created_at       DATETIME DEFAULT (datetime('now')),
      updated_at       DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS development_items (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id          INTEGER NOT NULL REFERENCES development_plans(id) ON DELETE CASCADE,
      item_description TEXT    NOT NULL,
      due_date         TEXT    NOT NULL DEFAULT '',
      support_needed   TEXT    NOT NULL DEFAULT '',
      cost_estimate    TEXT    NOT NULL DEFAULT '',
      sort_order       INTEGER NOT NULL DEFAULT 0,
      created_at       DATETIME DEFAULT (datetime('now')),
      updated_at       DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quarterly_milestones (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id          INTEGER NOT NULL REFERENCES development_items(id) ON DELETE CASCADE,
      quarter          INTEGER NOT NULL CHECK(quarter BETWEEN 1 AND 52),
      status           TEXT    NOT NULL DEFAULT 'Not Started' CHECK(status IN ('Not Started','In Progress','Complete')),
      percent_complete INTEGER NOT NULL DEFAULT 0 CHECK(percent_complete BETWEEN 0 AND 100),
      notes            TEXT    NOT NULL DEFAULT '',
      updated_at       DATETIME DEFAULT (datetime('now')),
      UNIQUE(item_id, quarter)
    );
  `);

  // ─── Migrations for existing databases ───────────────────────────────────────
  // Add milestone_count if it doesn't exist (safe to run every time)
  const planCols = database.prepare(`PRAGMA table_info(development_plans)`).all() as Array<{ name: string }>;
  if (!planCols.some(c => c.name === 'milestone_count')) {
    database.exec(`ALTER TABLE development_plans ADD COLUMN milestone_count INTEGER NOT NULL DEFAULT 4`);
  }

  // Add cost_estimate to development_items if it doesn't exist
  const itemCols = database.prepare(`PRAGMA table_info(development_items)`).all() as Array<{ name: string }>;
  if (!itemCols.some(c => c.name === 'cost_estimate')) {
    database.exec(`ALTER TABLE development_items ADD COLUMN cost_estimate TEXT NOT NULL DEFAULT ''`);
  }
}

// ─── Employee CRUD ────────────────────────────────────────────────────────────

export function employeeGetAll(database: Database.Database): Employee[] {
  return database.prepare('SELECT * FROM employees ORDER BY name').all() as Employee[];
}

export function employeeGetById(database: Database.Database, id: number): Employee | null {
  return (database.prepare('SELECT * FROM employees WHERE id = ?').get(id) as Employee) ?? null;
}

export function employeeCreate(database: Database.Database, data: EmployeeCreate): Employee {
  if (!data.name?.trim()) throw new Error('Employee name is required');
  if (!data.manager_name?.trim()) throw new Error('Manager name is required');

  const result = database.prepare(`
    INSERT INTO employees (name, manager_name, job_title, department)
    VALUES (@name, @manager_name, @job_title, @department)
  `).run({
    name: data.name.trim(),
    manager_name: data.manager_name.trim(),
    job_title: (data.job_title ?? '').trim(),
    department: (data.department ?? '').trim(),
  });
  return employeeGetById(database, result.lastInsertRowid as number)!;
}

export function employeeUpdate(database: Database.Database, id: number, data: EmployeeUpdate): Employee | null {
  const existing = employeeGetById(database, id);
  if (!existing) return null;

  const merged = {
    name: (data.name ?? existing.name).trim(),
    manager_name: (data.manager_name ?? existing.manager_name).trim(),
    job_title: (data.job_title ?? existing.job_title).trim(),
    department: (data.department ?? existing.department).trim(),
  };

  if (!merged.name) throw new Error('Employee name is required');
  if (!merged.manager_name) throw new Error('Manager name is required');

  database.prepare(`
    UPDATE employees
    SET name = @name, manager_name = @manager_name, job_title = @job_title,
        department = @department, updated_at = datetime('now')
    WHERE id = @id
  `).run({ ...merged, id });

  return employeeGetById(database, id);
}

export function employeeDelete(database: Database.Database, id: number): boolean {
  const result = database.prepare('DELETE FROM employees WHERE id = ?').run(id);
  return result.changes > 0;
}

// ─── Development Plans CRUD ───────────────────────────────────────────────────

export function planGetByEmployee(database: Database.Database, employeeId: number): DevelopmentPlan[] {
  return database.prepare(
    'SELECT * FROM development_plans WHERE employee_id = ? ORDER BY plan_date DESC'
  ).all(employeeId) as DevelopmentPlan[];
}

export function planGetById(database: Database.Database, id: number): PlanWithItems | null {
  const plan = database.prepare('SELECT * FROM development_plans WHERE id = ?').get(id) as DevelopmentPlan | undefined;
  if (!plan) return null;

  const items = itemGetByPlan(database, id);
  const itemsWithMilestones: DevelopmentItemWithMilestones[] = items.map(item => ({
    ...item,
    milestones: milestoneGetByItem(database, item.id),
  }));

  const employee = employeeGetById(database, plan.employee_id) ?? undefined;

  return { ...plan, items: itemsWithMilestones, employee };
}

export function planCreate(database: Database.Database, data: PlanCreate): DevelopmentPlan {
  if (!data.plan_date?.trim()) throw new Error('Plan date is required');
  if (!data.employee_id) throw new Error('Employee ID is required');

  const result = database.prepare(`
    INSERT INTO development_plans (employee_id, plan_date, plan_year, status, notes, milestone_count)
    VALUES (@employee_id, @plan_date, @plan_year, @status, @notes, @milestone_count)
  `).run({
    employee_id: data.employee_id,
    plan_date: data.plan_date.trim(),
    plan_year: data.plan_year ?? new Date(data.plan_date).getFullYear(),
    status: data.status ?? 'Active',
    notes: (data.notes ?? '').trim(),
    milestone_count: data.milestone_count ?? 4,
  });

  return database.prepare('SELECT * FROM development_plans WHERE id = ?').get(result.lastInsertRowid) as DevelopmentPlan;
}

export function planUpdate(database: Database.Database, id: number, data: PlanUpdate): DevelopmentPlan | null {
  const existing = database.prepare('SELECT * FROM development_plans WHERE id = ?').get(id) as DevelopmentPlan | undefined;
  if (!existing) return null;

  const merged = {
    plan_date: (data.plan_date ?? existing.plan_date).trim(),
    plan_year: data.plan_year ?? existing.plan_year,
    status: data.status ?? existing.status,
    notes: ((data.notes ?? existing.notes) ?? '').trim(),
    milestone_count: data.milestone_count ?? existing.milestone_count ?? 4,
  };

  database.prepare(`
    UPDATE development_plans
    SET plan_date = @plan_date, plan_year = @plan_year, status = @status,
        notes = @notes, milestone_count = @milestone_count, updated_at = datetime('now')
    WHERE id = @id
  `).run({ ...merged, id });

  return database.prepare('SELECT * FROM development_plans WHERE id = ?').get(id) as DevelopmentPlan;
}

export function planDelete(database: Database.Database, id: number): boolean {
  const result = database.prepare('DELETE FROM development_plans WHERE id = ?').run(id);
  return result.changes > 0;
}

// ─── Development Items CRUD ───────────────────────────────────────────────────

export function itemGetByPlan(database: Database.Database, planId: number): DevelopmentItem[] {
  return database.prepare(
    'SELECT * FROM development_items WHERE plan_id = ? ORDER BY sort_order, id'
  ).all(planId) as DevelopmentItem[];
}

export function itemCreate(database: Database.Database, data: ItemCreate): DevelopmentItem {
  if (!data.item_description?.trim()) throw new Error('Item description is required');

  const maxOrder = (database.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) as m FROM development_items WHERE plan_id = ?'
  ).get(data.plan_id) as { m: number }).m;

  const result = database.prepare(`
    INSERT INTO development_items (plan_id, item_description, due_date, support_needed, cost_estimate, sort_order)
    VALUES (@plan_id, @item_description, @due_date, @support_needed, @cost_estimate, @sort_order)
  `).run({
    plan_id: data.plan_id,
    item_description: data.item_description.trim(),
    due_date: (data.due_date ?? '').trim(),
    support_needed: (data.support_needed ?? '').trim(),
    cost_estimate: (data.cost_estimate ?? '').trim(),
    sort_order: data.sort_order ?? (maxOrder + 1),
  });

  return database.prepare('SELECT * FROM development_items WHERE id = ?').get(result.lastInsertRowid) as DevelopmentItem;
}

export function itemUpdate(database: Database.Database, id: number, data: ItemUpdate): DevelopmentItem | null {
  const existing = database.prepare('SELECT * FROM development_items WHERE id = ?').get(id) as DevelopmentItem | undefined;
  if (!existing) return null;

  const merged = {
    item_description: ((data.item_description ?? existing.item_description)).trim(),
    due_date: ((data.due_date ?? existing.due_date) ?? '').trim(),
    support_needed: ((data.support_needed ?? existing.support_needed) ?? '').trim(),
    cost_estimate: ((data.cost_estimate ?? existing.cost_estimate) ?? '').trim(),
    sort_order: data.sort_order ?? existing.sort_order,
  };

  if (!merged.item_description) throw new Error('Item description is required');

  database.prepare(`
    UPDATE development_items
    SET item_description = @item_description, due_date = @due_date,
        support_needed = @support_needed, cost_estimate = @cost_estimate,
        sort_order = @sort_order, updated_at = datetime('now')
    WHERE id = @id
  `).run({ ...merged, id });

  return database.prepare('SELECT * FROM development_items WHERE id = ?').get(id) as DevelopmentItem;
}

export function itemDelete(database: Database.Database, id: number): boolean {
  const result = database.prepare('DELETE FROM development_items WHERE id = ?').run(id);
  return result.changes > 0;
}

export function itemReorder(database: Database.Database, planId: number, itemIds: number[]): boolean {
  const update = database.prepare('UPDATE development_items SET sort_order = ? WHERE id = ? AND plan_id = ?');
  const reorderAll = database.transaction((ids: number[]) => {
    ids.forEach((itemId, idx) => update.run(idx, itemId, planId));
  });
  reorderAll(itemIds);
  return true;
}

// ─── Quarterly Milestones CRUD ────────────────────────────────────────────────

export function milestoneGetByItem(database: Database.Database, itemId: number): QuarterlyMilestone[] {
  return database.prepare(
    'SELECT * FROM quarterly_milestones WHERE item_id = ? ORDER BY quarter'
  ).all(itemId) as QuarterlyMilestone[];
}

export function milestoneUpsert(database: Database.Database, data: MilestoneUpsert): QuarterlyMilestone {
  database.prepare(`
    INSERT INTO quarterly_milestones (item_id, quarter, status, percent_complete, notes, updated_at)
    VALUES (@item_id, @quarter, @status, @percent_complete, @notes, datetime('now'))
    ON CONFLICT(item_id, quarter) DO UPDATE SET
      status           = excluded.status,
      percent_complete = excluded.percent_complete,
      notes            = excluded.notes,
      updated_at       = datetime('now')
  `).run({
    item_id: data.item_id,
    quarter: data.quarter,
    status: data.status ?? 'Not Started',
    percent_complete: data.percent_complete ?? 0,
    notes: (data.notes ?? '').trim(),
  });

  return database.prepare(
    'SELECT * FROM quarterly_milestones WHERE item_id = ? AND quarter = ?'
  ).get(data.item_id, data.quarter) as QuarterlyMilestone;
}
