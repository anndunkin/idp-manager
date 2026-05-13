// ─── Core domain types ────────────────────────────────────────────────────────

export interface Employee {
  id: number;
  name: string;
  manager_name: string;
  job_title: string;
  department: string;
  created_at: string;
  updated_at: string;
}

export type EmployeeCreate = Omit<Employee, 'id' | 'created_at' | 'updated_at'>;
export type EmployeeUpdate = Partial<EmployeeCreate>;

// ─── Development Plans ────────────────────────────────────────────────────────

export type PlanStatus = 'Active' | 'Inactive' | 'Complete';

export interface DevelopmentPlan {
  id: number;
  employee_id: number;
  plan_date: string;
  plan_year: number;
  status: PlanStatus;
  notes: string;
  /** Number of milestone periods (e.g. 4 = quarterly, 12 = monthly). Default 4. */
  milestone_count: number;
  created_at: string;
  updated_at: string;
}

export type PlanCreate = Omit<DevelopmentPlan, 'id' | 'created_at' | 'updated_at'>;
export type PlanUpdate = Partial<Omit<PlanCreate, 'employee_id'>>;

// ─── Development Items ────────────────────────────────────────────────────────

export interface DevelopmentItem {
  id: number;
  plan_id: number;
  item_description: string;
  due_date: string;
  support_needed: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ItemCreate = Omit<DevelopmentItem, 'id' | 'created_at' | 'updated_at'>;
export type ItemUpdate = Partial<Omit<ItemCreate, 'plan_id'>>;

// ─── Quarterly Milestones ─────────────────────────────────────────────────────

export type MilestoneStatus = 'Not Started' | 'In Progress' | 'Complete';
/** Milestone period number — 1-based, supports 1–12 */
export type Quarter = number;

export interface QuarterlyMilestone {
  id: number;
  item_id: number;
  quarter: Quarter;
  status: MilestoneStatus;
  percent_complete: number;
  notes: string;
  updated_at: string;
}

export type MilestoneUpsert = Omit<QuarterlyMilestone, 'id' | 'updated_at'>;

// ─── Aggregated / view types ──────────────────────────────────────────────────

export interface DevelopmentItemWithMilestones extends DevelopmentItem {
  milestones: QuarterlyMilestone[];
}

export interface PlanWithItems extends DevelopmentPlan {
  items: DevelopmentItemWithMilestones[];
  employee?: Employee;
}

export interface EmployeeWithPlanSummary extends Employee {
  planCount: number;
  latestPlanStatus?: PlanStatus;
  overallProgress: number; // 0-100
}

export interface DashboardStats {
  totalEmployees: number;
  activePlans: number;
  plansDueThisQuarter: number;
  completionRate: number;
}

// ─── IPC API types ────────────────────────────────────────────────────────────

export interface WindowApi {
  employees: {
    getAll: () => Promise<Employee[]>;
    getById: (id: number) => Promise<Employee | null>;
    create: (data: EmployeeCreate) => Promise<Employee>;
    update: (id: number, data: EmployeeUpdate) => Promise<Employee | null>;
    delete: (id: number) => Promise<boolean>;
  };
  plans: {
    getByEmployee: (employeeId: number) => Promise<DevelopmentPlan[]>;
    getById: (id: number) => Promise<PlanWithItems | null>;
    create: (data: PlanCreate) => Promise<DevelopmentPlan>;
    update: (id: number, data: PlanUpdate) => Promise<DevelopmentPlan | null>;
    delete: (id: number) => Promise<boolean>;
  };
  items: {
    getByPlan: (planId: number) => Promise<DevelopmentItem[]>;
    create: (data: ItemCreate) => Promise<DevelopmentItem>;
    update: (id: number, data: ItemUpdate) => Promise<DevelopmentItem | null>;
    delete: (id: number) => Promise<boolean>;
    reorder: (planId: number, itemIds: number[]) => Promise<boolean>;
  };
  milestones: {
    getByItem: (itemId: number) => Promise<QuarterlyMilestone[]>;
    upsert: (data: MilestoneUpsert) => Promise<QuarterlyMilestone>;
  };
  export: {
    toExcel: (planId: number) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    toWord: (planId: number) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    toPdf: (planId: number) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  };
  file: {
    save: (planId: number, filePath?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    saveAs: (planId: number) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    open: () => Promise<{ success: boolean; filePath?: string; error?: string; planId?: number }>;
  };
  import: {
    fromExcel: () => Promise<{ success: boolean; filePath?: string; planId?: number; error?: string }>;
    downloadTemplate: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
  };
}

// Augment Window
declare global {
  interface Window {
    api: WindowApi;
  }
}
