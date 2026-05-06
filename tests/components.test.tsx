import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MilestoneTracker, { MilestoneCell } from '../src/components/MilestoneTracker';
import IDPForm from '../src/components/IDPForm';
import type { QuarterlyMilestone, Employee } from '../src/types';

// ─── Mock window.api ──────────────────────────────────────────────────────────

beforeAll(() => {
  Object.defineProperty(window, 'api', {
    value: {
      employees: {
        getAll: vi.fn().mockResolvedValue([]),
        getById: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 1 }),
        update: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue(true),
      },
      plans: {
        getByEmployee: vi.fn().mockResolvedValue([]),
        getById: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 1 }),
        update: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue(true),
      },
      items: {
        getByPlan: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 1 }),
        update: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue(true),
        reorder: vi.fn().mockResolvedValue(true),
      },
      milestones: {
        getByItem: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockResolvedValue({ id: 1, item_id: 1, quarter: 1, status: 'Complete', percent_complete: 100, notes: '', updated_at: '' }),
      },
      export: {
        toExcel: vi.fn().mockResolvedValue({ success: true }),
        toWord: vi.fn().mockResolvedValue({ success: true }),
        toPdf: vi.fn().mockResolvedValue({ success: true }),
      },
    },
    writable: false,
  });
});

// ─── MilestoneTracker component ───────────────────────────────────────────────

describe('MilestoneTracker', () => {
  const mockMilestones: QuarterlyMilestone[] = [
    { id: 1, item_id: 1, quarter: 1, status: 'Complete',    percent_complete: 100, notes: 'Done', updated_at: '2024-01-01' },
    { id: 2, item_id: 1, quarter: 2, status: 'In Progress', percent_complete: 50,  notes: '',     updated_at: '2024-01-01' },
    { id: 3, item_id: 1, quarter: 3, status: 'Not Started', percent_complete: 0,   notes: '',     updated_at: '2024-01-01' },
    { id: 4, item_id: 1, quarter: 4, status: 'Not Started', percent_complete: 0,   notes: '',     updated_at: '2024-01-01' },
  ];

  it('renders without crashing', () => {
    render(<MilestoneTracker milestones={mockMilestones} />);
    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('Q2')).toBeInTheDocument();
    expect(screen.getByText('Q3')).toBeInTheDocument();
    expect(screen.getByText('Q4')).toBeInTheDocument();
  });

  it('displays correct status badges', () => {
    render(<MilestoneTracker milestones={mockMilestones} />);
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    // Both Q3 and Q4 are Not Started
    expect(screen.getAllByText('Not Started')).toHaveLength(2);
  });

  it('displays percentage values', () => {
    render(<MilestoneTracker milestones={mockMilestones} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders with empty milestones', () => {
    render(<MilestoneTracker milestones={[]} />);
    // All 4 quarters should show Not Started
    expect(screen.getAllByText('Not Started')).toHaveLength(4);
  });
});

// ─── MilestoneCell component ──────────────────────────────────────────────────

describe('MilestoneCell', () => {
  it('renders the cell with Not Started by default', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <table><tbody><tr>
        <MilestoneCell itemId={1} quarter={1} milestone={undefined} onSave={onSave} />
      </tr></tbody></table>
    );
    expect(screen.getByText('Not Started')).toBeInTheDocument();
  });

  it('shows editing form when cell is clicked', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <table><tbody><tr>
        <MilestoneCell
          itemId={1}
          quarter={2}
          milestone={{ id: 1, item_id: 1, quarter: 2, status: 'In Progress', percent_complete: 50, notes: 'Ongoing', updated_at: '' }}
          onSave={onSave}
        />
      </tr></tbody></table>
    );

    // Click the edit button
    const btn = screen.getByRole('button');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('calls onSave when save button clicked', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <table><tbody><tr>
        <MilestoneCell itemId={1} quarter={3} milestone={undefined} onSave={onSave} />
      </tr></tbody></table>
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        item_id: 1,
        quarter: 3,
        status: 'Not Started',
        percent_complete: 0,
        notes: '',
      });
    });
  });
});

// ─── IDPForm component ────────────────────────────────────────────────────────

describe('IDPForm', () => {
  const mockEmployees: Employee[] = [
    { id: 1, name: 'Alice Johnson', manager_name: 'Bob Smith', job_title: 'RN', department: 'ICU', created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: 2, name: 'Carol Davis', manager_name: 'Dan Brown', job_title: 'Dr', department: 'ER', created_at: '2024-01-01', updated_at: '2024-01-01' },
  ];

  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <IDPForm employees={mockEmployees} onSubmit={vi.fn()} onCancel={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByText('Plan Details')).toBeInTheDocument();
    expect(screen.getByText('Development Items')).toBeInTheDocument();
  });

  it('shows employee options', () => {
    render(
      <MemoryRouter>
        <IDPForm employees={mockEmployees} onSubmit={vi.fn()} onCancel={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Carol Davis')).toBeInTheDocument();
  });

  it('shows validation error when submitting empty item description', async () => {
    render(
      <MemoryRouter>
        <IDPForm employees={mockEmployees} initialEmployeeId={1} onSubmit={vi.fn()} onCancel={vi.fn()} />
      </MemoryRouter>
    );

    // Clear the item description field if there's a default
    const textareas = screen.getAllByRole('textbox');
    // Find the description textarea and clear it
    const descTextarea = textareas.find(el => el.closest('div')?.textContent?.includes('Description'));
    if (descTextarea) {
      fireEvent.change(descTextarea, { target: { value: '' } });
    }

    // Submit the form
    const submitBtn = screen.getByText('Create IDP');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Description is required')).toBeInTheDocument();
    });
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(
      <MemoryRouter>
        <IDPForm employees={mockEmployees} onSubmit={vi.fn()} onCancel={onCancel} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('adds a new development item when + Add Item is clicked', () => {
    render(
      <MemoryRouter>
        <IDPForm employees={mockEmployees} onSubmit={vi.fn()} onCancel={vi.fn()} />
      </MemoryRouter>
    );

    const addBtn = screen.getByText('+ Add Item');
    fireEvent.click(addBtn);

    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('shows disabled employee dropdown when initialEmployeeId is set', () => {
    render(
      <MemoryRouter>
        <IDPForm employees={mockEmployees} initialEmployeeId={1} onSubmit={vi.fn()} onCancel={vi.fn()} />
      </MemoryRouter>
    );

    // The employee select should be disabled when initialEmployeeId is provided
    const allSelects = screen.getAllByRole('combobox');
    const disabledSelect = allSelects.find(s => (s as HTMLSelectElement).disabled);
    expect(disabledSelect).toBeTruthy();
  });
});
