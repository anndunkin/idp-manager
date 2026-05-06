import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema, employeeCreate, planCreate, itemCreate, milestoneUpsert, planGetById } from '../electron/database';
import { exportToExcelBuffer, exportToWordBuffer, exportToPdfBuffer } from '../electron/exportMain';
import type { PlanWithItems } from '../src/types/index';

let db: Database.Database;
let testPlan: PlanWithItems;

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  initSchema(db);

  // Seed test data
  const emp = employeeCreate(db, {
    name: 'Test Employee',
    manager_name: 'Test Manager',
    job_title: 'Software Engineer',
    department: 'Engineering',
  });

  const plan = planCreate(db, {
    employee_id: emp.id,
    plan_date: '2024-01-15',
    plan_year: 2024,
    status: 'Active',
    notes: 'Test plan for export',
  });

  const item1 = itemCreate(db, {
    plan_id: plan.id,
    item_description: 'Complete TypeScript certification',
    due_date: '2024-06-30',
    support_needed: 'Training budget of $500',
    sort_order: 0,
  });

  const item2 = itemCreate(db, {
    plan_id: plan.id,
    item_description: 'Lead team standup meetings',
    due_date: '2024-12-31',
    support_needed: 'Manager coaching',
    sort_order: 1,
  });

  milestoneUpsert(db, { item_id: item1.id, quarter: 1, status: 'Complete', percent_complete: 100, notes: 'Passed exam' });
  milestoneUpsert(db, { item_id: item1.id, quarter: 2, status: 'In Progress', percent_complete: 60, notes: 'Advanced topics' });
  milestoneUpsert(db, { item_id: item2.id, quarter: 1, status: 'Not Started', percent_complete: 0, notes: '' });
  milestoneUpsert(db, { item_id: item2.id, quarter: 2, status: 'In Progress', percent_complete: 40, notes: 'Weekly meetings' });

  testPlan = planGetById(db, plan.id)!;
});

afterEach(() => {
  db.close();
});

describe('Excel Export', () => {
  it('creates a valid Excel buffer', async () => {
    const buffer = await exportToExcelBuffer(testPlan);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('Excel buffer starts with PK (ZIP/XLSX magic bytes)', async () => {
    const buffer = await exportToExcelBuffer(testPlan);
    // XLSX files are ZIP archives and begin with PK (0x50 0x4B)
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4B);
  });

  it('Excel export handles plan with no items', async () => {
    const emptyPlan: PlanWithItems = {
      ...testPlan,
      items: [],
    };
    const buffer = await exportToExcelBuffer(emptyPlan);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});

describe('Word Export', () => {
  it('creates a valid Word buffer', async () => {
    const buffer = await exportToWordBuffer(testPlan);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('Word buffer starts with PK (ZIP/DOCX magic bytes)', async () => {
    const buffer = await exportToWordBuffer(testPlan);
    // DOCX files are ZIP archives and begin with PK (0x50 0x4B)
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4B);
  });

  it('Word export handles plan with multiple items', async () => {
    const buffer = await exportToWordBuffer(testPlan);
    expect(buffer.length).toBeGreaterThan(5000); // Non-trivial file size
  });
});

describe('PDF Export', () => {
  it('creates a valid PDF buffer', async () => {
    const buffer = await exportToPdfBuffer(testPlan);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('PDF buffer starts with %PDF magic bytes', async () => {
    const buffer = await exportToPdfBuffer(testPlan);
    const header = buffer.toString('ascii', 0, 4);
    expect(header).toBe('%PDF');
  });

  it('PDF export handles plan with no milestones on some items', async () => {
    const planWithPartialMilestones: PlanWithItems = {
      ...testPlan,
      items: testPlan.items.map(item => ({ ...item, milestones: [] })),
    };
    const buffer = await exportToPdfBuffer(planWithPartialMilestones);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
