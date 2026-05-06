import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  initSchema,
  employeeGetAll, employeeGetById, employeeCreate, employeeUpdate, employeeDelete,
  planGetByEmployee, planGetById, planCreate, planUpdate, planDelete,
  itemGetByPlan, itemCreate, itemUpdate, itemDelete, itemReorder,
  milestoneGetByItem, milestoneUpsert,
} from '../electron/database';

// Use in-memory database for all tests
let db: Database.Database;

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  initSchema(db);
});

afterEach(() => {
  db.close();
});

// ─── Employee CRUD ─────────────────────────────────────────────────────────────

describe('Employee CRUD', () => {
  it('creates an employee and reads it back', () => {
    const emp = employeeCreate(db, {
      name: 'Jane Smith',
      manager_name: 'Bob Jones',
      job_title: 'Registered Nurse',
      department: 'Cardiology',
    });

    expect(emp.id).toBeTypeOf('number');
    expect(emp.name).toBe('Jane Smith');
    expect(emp.manager_name).toBe('Bob Jones');
    expect(emp.job_title).toBe('Registered Nurse');
    expect(emp.department).toBe('Cardiology');
    expect(emp.created_at).toBeTruthy();
    expect(emp.updated_at).toBeTruthy();
  });

  it('gets all employees', () => {
    employeeCreate(db, { name: 'Alice', manager_name: 'Manager A', job_title: 'Nurse', department: 'ICU' });
    employeeCreate(db, { name: 'Bob', manager_name: 'Manager B', job_title: 'Doctor', department: 'ER' });

    const all = employeeGetAll(db);
    expect(all).toHaveLength(2);
  });

  it('gets employee by id', () => {
    const created = employeeCreate(db, { name: 'Carol', manager_name: 'Dan', job_title: 'Tech', department: 'IT' });
    const found = employeeGetById(db, created.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Carol');
  });

  it('returns null for missing employee id', () => {
    const found = employeeGetById(db, 9999);
    expect(found).toBeNull();
  });

  it('updates an employee', () => {
    const emp = employeeCreate(db, { name: 'Eve', manager_name: 'Frank', job_title: 'PA', department: 'Surgery' });
    const updated = employeeUpdate(db, emp.id, { name: 'Eve Updated', department: 'Neurology' });
    expect(updated!.name).toBe('Eve Updated');
    expect(updated!.manager_name).toBe('Frank');
    expect(updated!.department).toBe('Neurology');
  });

  it('returns null when updating non-existent employee', () => {
    const result = employeeUpdate(db, 9999, { name: 'Ghost' });
    expect(result).toBeNull();
  });

  it('deletes an employee', () => {
    const emp = employeeCreate(db, { name: 'Greg', manager_name: 'Hal', job_title: 'Tech', department: 'Lab' });
    const deleted = employeeDelete(db, emp.id);
    expect(deleted).toBe(true);
    expect(employeeGetById(db, emp.id)).toBeNull();
  });

  it('throws on missing required name', () => {
    expect(() => employeeCreate(db, { name: '', manager_name: 'Boss', job_title: '', department: '' }))
      .toThrow('Employee name is required');
  });

  it('throws on missing required manager_name', () => {
    expect(() => employeeCreate(db, { name: 'Test', manager_name: '', job_title: '', department: '' }))
      .toThrow('Manager name is required');
  });
});

// ─── Development Plans CRUD ────────────────────────────────────────────────────

describe('Development Plans CRUD', () => {
  let employeeId: number;

  beforeEach(() => {
    const emp = employeeCreate(db, { name: 'Iris', manager_name: 'Jack', job_title: 'RN', department: 'Oncology' });
    employeeId = emp.id;
  });

  it('creates a plan linked to employee', () => {
    const plan = planCreate(db, {
      employee_id: employeeId,
      plan_date: '2024-01-15',
      plan_year: 2024,
      status: 'Active',
      notes: 'Test plan notes',
    });

    expect(plan.id).toBeTypeOf('number');
    expect(plan.employee_id).toBe(employeeId);
    expect(plan.plan_date).toBe('2024-01-15');
    expect(plan.plan_year).toBe(2024);
    expect(plan.status).toBe('Active');
    expect(plan.notes).toBe('Test plan notes');
  });

  it('gets plans by employee', () => {
    planCreate(db, { employee_id: employeeId, plan_date: '2024-01-01', plan_year: 2024, status: 'Active', notes: '' });
    planCreate(db, { employee_id: employeeId, plan_date: '2023-01-01', plan_year: 2023, status: 'Inactive', notes: '' });

    const plans = planGetByEmployee(db, employeeId);
    expect(plans).toHaveLength(2);
  });

  it('gets plan with items and milestones via getById', () => {
    const plan = planCreate(db, { employee_id: employeeId, plan_date: '2024-06-01', plan_year: 2024, status: 'Active', notes: '' });
    const item = itemCreate(db, { plan_id: plan.id, item_description: 'Learn React', due_date: '2024-09-30', support_needed: 'Training budget', sort_order: 0 });
    milestoneUpsert(db, { item_id: item.id, quarter: 1, status: 'In Progress', percent_complete: 40, notes: 'Going well' });

    const full = planGetById(db, plan.id);
    expect(full).not.toBeNull();
    expect(full!.items).toHaveLength(1);
    expect(full!.items[0].milestones).toHaveLength(1);
    expect(full!.items[0].milestones[0].status).toBe('In Progress');
    expect(full!.employee!.name).toBe('Iris');
  });

  it('updates plan status and notes', () => {
    const plan = planCreate(db, { employee_id: employeeId, plan_date: '2024-01-01', plan_year: 2024, status: 'Active', notes: '' });
    const updated = planUpdate(db, plan.id, { status: 'Complete', notes: 'Completed successfully' });
    expect(updated!.status).toBe('Complete');
    expect(updated!.notes).toBe('Completed successfully');
  });

  it('deletes a plan', () => {
    const plan = planCreate(db, { employee_id: employeeId, plan_date: '2024-01-01', plan_year: 2024, status: 'Active', notes: '' });
    expect(planDelete(db, plan.id)).toBe(true);
    expect(planGetById(db, plan.id)).toBeNull();
  });

  it('throws on missing plan date', () => {
    expect(() => planCreate(db, { employee_id: employeeId, plan_date: '', plan_year: 2024, status: 'Active', notes: '' }))
      .toThrow('Plan date is required');
  });
});

// ─── Development Items CRUD ────────────────────────────────────────────────────

describe('Development Items CRUD', () => {
  let planId: number;

  beforeEach(() => {
    const emp = employeeCreate(db, { name: 'Kate', manager_name: 'Liam', job_title: 'RN', department: 'Peds' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2024-03-01', plan_year: 2024, status: 'Active', notes: '' });
    planId = plan.id;
  });

  it('creates a development item', () => {
    const item = itemCreate(db, {
      plan_id: planId,
      item_description: 'Complete CPR certification',
      due_date: '2024-06-30',
      support_needed: 'Manager approval',
      sort_order: 0,
    });
    expect(item.id).toBeTypeOf('number');
    expect(item.item_description).toBe('Complete CPR certification');
    expect(item.plan_id).toBe(planId);
  });

  it('gets items by plan in sort order', () => {
    itemCreate(db, { plan_id: planId, item_description: 'B', due_date: '', support_needed: '', sort_order: 1 });
    itemCreate(db, { plan_id: planId, item_description: 'A', due_date: '', support_needed: '', sort_order: 0 });

    const items = itemGetByPlan(db, planId);
    expect(items[0].item_description).toBe('A');
    expect(items[1].item_description).toBe('B');
  });

  it('updates a development item', () => {
    const item = itemCreate(db, { plan_id: planId, item_description: 'Old desc', due_date: '', support_needed: '', sort_order: 0 });
    const updated = itemUpdate(db, item.id, { item_description: 'Updated desc', due_date: '2024-12-31' });
    expect(updated!.item_description).toBe('Updated desc');
    expect(updated!.due_date).toBe('2024-12-31');
  });

  it('deletes a development item', () => {
    const item = itemCreate(db, { plan_id: planId, item_description: 'To delete', due_date: '', support_needed: '', sort_order: 0 });
    expect(itemDelete(db, item.id)).toBe(true);
    expect(itemGetByPlan(db, planId)).toHaveLength(0);
  });

  it('reorders development items', () => {
    const a = itemCreate(db, { plan_id: planId, item_description: 'A', due_date: '', support_needed: '', sort_order: 0 });
    const b = itemCreate(db, { plan_id: planId, item_description: 'B', due_date: '', support_needed: '', sort_order: 1 });
    const c = itemCreate(db, { plan_id: planId, item_description: 'C', due_date: '', support_needed: '', sort_order: 2 });

    // Reverse order: C, A, B
    itemReorder(db, planId, [c.id, a.id, b.id]);

    const items = itemGetByPlan(db, planId);
    expect(items[0].item_description).toBe('C');
    expect(items[1].item_description).toBe('A');
    expect(items[2].item_description).toBe('B');
  });

  it('throws on empty item description', () => {
    expect(() => itemCreate(db, { plan_id: planId, item_description: '', due_date: '', support_needed: '', sort_order: 0 }))
      .toThrow('Item description is required');
  });
});

// ─── Quarterly Milestones ──────────────────────────────────────────────────────

describe('Quarterly Milestones', () => {
  let itemId: number;

  beforeEach(() => {
    const emp = employeeCreate(db, { name: 'Mia', manager_name: 'Noah', job_title: 'Tech', department: 'Lab' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2024-01-01', plan_year: 2024, status: 'Active', notes: '' });
    const item = itemCreate(db, { plan_id: plan.id, item_description: 'Milestone test item', due_date: '', support_needed: '', sort_order: 0 });
    itemId = item.id;
  });

  it('creates a milestone via upsert', () => {
    const m = milestoneUpsert(db, {
      item_id: itemId,
      quarter: 1,
      status: 'In Progress',
      percent_complete: 50,
      notes: 'Halfway there',
    });

    expect(m.id).toBeTypeOf('number');
    expect(m.item_id).toBe(itemId);
    expect(m.quarter).toBe(1);
    expect(m.status).toBe('In Progress');
    expect(m.percent_complete).toBe(50);
    expect(m.notes).toBe('Halfway there');
  });

  it('updates an existing milestone via upsert', () => {
    milestoneUpsert(db, { item_id: itemId, quarter: 2, status: 'Not Started', percent_complete: 0, notes: '' });
    const updated = milestoneUpsert(db, { item_id: itemId, quarter: 2, status: 'Complete', percent_complete: 100, notes: 'Done!' });

    expect(updated.status).toBe('Complete');
    expect(updated.percent_complete).toBe(100);
    expect(updated.notes).toBe('Done!');

    // Should only have 1 row for this item+quarter
    const all = milestoneGetByItem(db, itemId);
    const q2s = all.filter(m => m.quarter === 2);
    expect(q2s).toHaveLength(1);
  });

  it('can create milestones for all 4 quarters', () => {
    for (const q of [1, 2, 3, 4] as const) {
      milestoneUpsert(db, { item_id: itemId, quarter: q, status: 'Not Started', percent_complete: 0, notes: '' });
    }
    const all = milestoneGetByItem(db, itemId);
    expect(all).toHaveLength(4);
  });

  it('gets milestones by item in quarter order', () => {
    milestoneUpsert(db, { item_id: itemId, quarter: 3, status: 'Not Started', percent_complete: 0, notes: '' });
    milestoneUpsert(db, { item_id: itemId, quarter: 1, status: 'Not Started', percent_complete: 0, notes: '' });

    const all = milestoneGetByItem(db, itemId);
    expect(all[0].quarter).toBe(1);
    expect(all[1].quarter).toBe(3);
  });
});

// ─── Cascade deletes ───────────────────────────────────────────────────────────

describe('Cascade deletes', () => {
  it('deleting employee cascades to plans, items, milestones', () => {
    const emp = employeeCreate(db, { name: 'Oliver', manager_name: 'Pat', job_title: 'Dr', department: 'ER' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2024-01-01', plan_year: 2024, status: 'Active', notes: '' });
    const item = itemCreate(db, { plan_id: plan.id, item_description: 'Cascade test', due_date: '', support_needed: '', sort_order: 0 });
    milestoneUpsert(db, { item_id: item.id, quarter: 1, status: 'Not Started', percent_complete: 0, notes: '' });

    // Verify all exist
    expect(planGetByEmployee(db, emp.id)).toHaveLength(1);
    expect(itemGetByPlan(db, plan.id)).toHaveLength(1);
    expect(milestoneGetByItem(db, item.id)).toHaveLength(1);

    // Delete employee
    employeeDelete(db, emp.id);

    // All cascaded records should be gone
    expect(planGetByEmployee(db, emp.id)).toHaveLength(0);
    expect(itemGetByPlan(db, plan.id)).toHaveLength(0);
    expect(milestoneGetByItem(db, item.id)).toHaveLength(0);
  });

  it('deleting plan cascades to items and milestones', () => {
    const emp = employeeCreate(db, { name: 'Quinn', manager_name: 'Rose', job_title: 'RN', department: 'ICU' });
    const plan = planCreate(db, { employee_id: emp.id, plan_date: '2024-01-01', plan_year: 2024, status: 'Active', notes: '' });
    const item = itemCreate(db, { plan_id: plan.id, item_description: 'Cascade item', due_date: '', support_needed: '', sort_order: 0 });
    milestoneUpsert(db, { item_id: item.id, quarter: 2, status: 'In Progress', percent_complete: 30, notes: '' });

    planDelete(db, plan.id);

    expect(itemGetByPlan(db, plan.id)).toHaveLength(0);
    expect(milestoneGetByItem(db, item.id)).toHaveLength(0);
  });
});
