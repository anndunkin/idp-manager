import React, { useState, useEffect } from 'react';
import type { Employee, PlanCreate, ItemCreate, PlanStatus } from '../types';
import { MILESTONE_PRESETS } from '../utils/milestoneLabels';

export interface NewIDPFormData {
  employee_id: number;
  plan_date: string;
  plan_year: number;
  status: PlanStatus;
  notes: string;
  milestone_count: number;
  items: Array<{
    item_description: string;
    due_date: string;
    support_needed: string;
  }>;
}

interface Props {
  employees: Employee[];
  initialEmployeeId?: number;
  onSubmit: (data: NewIDPFormData) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const emptyItem = () => ({ item_description: '', due_date: '', support_needed: '' });

export default function IDPForm({ employees, initialEmployeeId, onSubmit, onCancel, submitting }: Props) {
  const [employeeId, setEmployeeId] = useState<number>(initialEmployeeId ?? (employees[0]?.id ?? 0));
  const [planDate, setPlanDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [planYear, setPlanYear] = useState(() => new Date().getFullYear());
  const [status, setStatus] = useState<PlanStatus>('Active');
  const [notes, setNotes] = useState('');
  const [milestoneCount, setMilestoneCount] = useState(4);
  const [items, setItems] = useState([emptyItem()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialEmployeeId) setEmployeeId(initialEmployeeId);
  }, [initialEmployeeId]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!employeeId) e.employee_id = 'Please select an employee';
    if (!planDate) e.plan_date = 'Plan date is required';
    items.forEach((item, i) => {
      if (!item.item_description.trim()) e[`item_${i}`] = 'Description is required';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      employee_id: employeeId,
      plan_date: planDate,
      plan_year: planYear,
      status,
      notes,
      milestone_count: milestoneCount,
      items: items.filter(i => i.item_description.trim()),
    });
  };

  const updateItem = (idx: number, field: string, value: string) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const removeItem = (idx: number) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Plan details */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Plan Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Employee *</label>
            <select
              className="input"
              value={employeeId}
              onChange={e => setEmployeeId(Number(e.target.value))}
              disabled={!!initialEmployeeId}
            >
              <option value="">Select employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            {errors.employee_id && <p className="text-red-500 text-xs mt-1">{errors.employee_id}</p>}
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={status}
              onChange={e => setStatus(e.target.value as PlanStatus)}
            >
              <option>Active</option>
              <option>Inactive</option>
              <option>Complete</option>
            </select>
          </div>
          <div>
            <label className="label">Plan Date *</label>
            <input
              type="date"
              className="input"
              value={planDate}
              onChange={e => {
                setPlanDate(e.target.value);
                if (e.target.value) setPlanYear(new Date(e.target.value).getFullYear());
              }}
            />
            {errors.plan_date && <p className="text-red-500 text-xs mt-1">{errors.plan_date}</p>}
          </div>
          <div>
            <label className="label">Plan Year</label>
            <input
              type="number"
              className="input"
              value={planYear}
              onChange={e => setPlanYear(Number(e.target.value))}
              min="2000" max="2100"
            />
          </div>
          <div className="col-span-2">
            <label className="label">Milestone Periods</label>
            <select
              className="input"
              value={milestoneCount}
              onChange={e => setMilestoneCount(Number(e.target.value))}
            >
              {MILESTONE_PRESETS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Choose how many tracking periods each development item will have (can be changed later).</p>
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea
            className="input resize-none"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any additional notes..."
          />
        </div>
      </div>

      {/* Development items */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Development Items</h3>
          <button type="button" onClick={addItem} className="btn-secondary text-xs">
            + Add Item
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Item {idx + 1}</span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div>
                <label className="label">Description *</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  value={item.item_description}
                  onChange={e => updateItem(idx, 'item_description', e.target.value)}
                  placeholder="e.g. Obtain CISSP certification, lead incident response tabletop, complete cloud security training..."
                />
                {errors[`item_${idx}`] && <p className="text-red-500 text-xs mt-1">{errors[`item_${idx}`]}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Due Date</label>
                  <input
                    type="date"
                    className="input"
                    value={item.due_date}
                    onChange={e => updateItem(idx, 'due_date', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Support Needed</label>
                  <input
                    type="text"
                    className="input"
                    value={item.support_needed}
                    onChange={e => updateItem(idx, 'support_needed', e.target.value)}
                    placeholder="e.g. study materials, lab access, manager coaching"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Saving...' : 'Create IDP'}
        </button>
      </div>
    </form>
  );
}
