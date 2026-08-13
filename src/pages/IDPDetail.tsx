import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import type {
  PlanWithItems, DevelopmentItemWithMilestones,
  QuarterlyMilestone, MilestoneStatus, Quarter, PlanStatus
} from '../types';
import { MilestoneCell } from '../components/MilestoneTracker';
import ExportButtons from '../components/ExportButtons';
import FileMenuBar from '../components/FileMenuBar';
import { milestoneColumnHeader, milestonePeriods, MILESTONE_PRESETS } from '../utils/milestoneLabels';

interface EditItemModal {
  item: DevelopmentItemWithMilestones;
  onSave: (data: { item_description: string; due_date: string; support_needed: string }) => Promise<void>;
  onClose: () => void;
}

function EditItemModal({ item, onSave, onClose }: EditItemModal) {
  const [desc, setDesc] = useState(item.item_description);
  const [dueDate, setDueDate] = useState(item.due_date);
  const [support, setSupport] = useState(item.support_needed);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!desc.trim()) { setError('Description is required'); return; }
    setSaving(true);
    try {
      await onSave({ item_description: desc.trim(), due_date: dueDate, support_needed: support.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Edit Development Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Description *</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
          <div>
            <label className="label">Due Date</label>
            <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Support Needed</label>
            <input type="text" className="input" value={support} onChange={e => setSupport(e.target.value)} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AddItemFormProps {
  planId: number;
  sortOrder: number;
  onSaved: () => void;
  onCancel: () => void;
}

function AddItemForm({ planId, sortOrder, onSaved, onCancel }: AddItemFormProps) {
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [support, setSupport] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!desc.trim()) { setError('Description is required'); return; }
    setSaving(true);
    try {
      await window.api.items.create({
        plan_id: planId,
        item_description: desc.trim(),
        due_date: dueDate,
        support_needed: support.trim(),
        cost_estimate: '',
        sort_order: sortOrder,
      });
      onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="bg-primary-50">
      <td className="px-3 py-2 text-center text-gray-400 align-top pt-3">—</td>
      <td className="px-3 py-2 align-top">
        <textarea
          className="input resize-none text-sm"
          rows={2}
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="e.g. Complete Security+ certification, learn threat modeling..."
          autoFocus
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </td>
      <td className="px-3 py-2 align-top">
        <input type="date" className="input text-sm" value={dueDate} onChange={e => setDueDate(e.target.value)} />
      </td>
      <td className="px-3 py-2 align-top">
        <input type="text" className="input text-sm" value={support} onChange={e => setSupport(e.target.value)} placeholder="Support needed" />
      </td>
      <td colSpan={4} className="px-3 py-2 align-top">
        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} disabled={saving} className="btn-primary text-xs">
            {saving ? 'Saving...' : 'Add Item'}
          </button>
          <button onClick={onCancel} className="btn-secondary text-xs">Cancel</button>
        </div>
      </td>
    </tr>
  );
}

export default function IDPDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PlanWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<DevelopmentItemWithMilestones | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [editingPlanStatus, setEditingPlanStatus] = useState(false);
  const [planStatus, setPlanStatus] = useState<PlanStatus>('Active');
  const [planNotes, setPlanNotes] = useState('');
  const [planMilestoneCount, setPlanMilestoneCount] = useState(4);
  const [currentFilePath, setCurrentFilePath] = useState<string | undefined>();

  const load = useCallback(async () => {
    if (!window.api || !id) return;
    setLoading(true);
    try {
      const data = await window.api.plans.getById(Number(id));
      if (!data) { setError('Plan not found'); return; }
      setPlan(data);
      setPlanStatus(data.status);
      setPlanNotes(data.notes);
      setPlanMilestoneCount(data.milestone_count ?? 4);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Ctrl+S / Cmd+S keyboard shortcut for Save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        if (plan) window.api.file.save(plan.id, currentFilePath).then(r => {
          if (r.success && r.filePath) setCurrentFilePath(r.filePath);
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [plan, currentFilePath]);

  const handleMilestoneSave = async (data: {
    item_id: number; quarter: Quarter; status: MilestoneStatus; percent_complete: number; notes: string
  }) => {
    await window.api.milestones.upsert(data);
    load();
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Delete this development item and all its milestones?')) return;
    await window.api.items.delete(itemId);
    load();
  };

  const handleSaveItemEdit = async (itemId: number, data: { item_description: string; due_date: string; support_needed: string }) => {
    await window.api.items.update(itemId, data);
    setEditingItem(null);
    load();
  };

  const handleSavePlanDetails = async () => {
    if (!plan || !window.api) return;
    await window.api.plans.update(plan.id, { status: planStatus, notes: planNotes, milestone_count: planMilestoneCount });
    setEditingPlanStatus(false);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="animate-spin w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading...
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error ?? 'Not found'}</div>
      </div>
    );
  }

  const employee = plan.employee;

  const statusBadge = (s: PlanStatus) => {
    switch (s) {
      case 'Active':   return <span className="badge-active">Active</span>;
      case 'Complete': return <span className="badge-complete">Complete</span>;
      default:         return <span className="badge-inactive">Inactive</span>;
    }
  };

  return (
    <div className="p-6 space-y-5 min-h-screen">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 flex items-center gap-2">
        <Link to="/employees" className="hover:text-primary-600">Employees</Link>
        {employee && (
          <>
            <span>/</span>
            <Link to={`/employees/${employee.id}`} className="hover:text-primary-600">{employee.name}</Link>
          </>
        )}
        <span>/</span>
        <span className="text-gray-900 font-medium">IDP {plan.plan_year}</span>
      </nav>

      {/* Plan header */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{employee?.name} — {plan.plan_year} Development Plan</h1>
              {statusBadge(plan.status)}
            </div>
            <div className="text-sm text-gray-500">
              Manager: <span className="text-gray-700 font-medium">{employee?.manager_name}</span>
              {' · '}
              Date: <span className="text-gray-700 font-medium">{new Date(plan.plan_date).toLocaleDateString()}</span>
              {employee?.department && (
                <> · <span className="text-gray-700">{employee.department}</span></>
              )}
            </div>
            {plan.notes && (
              <div className="text-sm text-gray-500 mt-1 italic">"{plan.notes}"</div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            <FileMenuBar
              planId={plan.id}
              currentFilePath={currentFilePath}
              onFileSaved={fp => setCurrentFilePath(fp)}
              onFileOpened={(newPlanId, fp) => {
                setCurrentFilePath(fp);
                navigate(`/idp/${newPlanId}`);
              }}
            />
            <ExportButtons planId={plan.id} />
            <button
              onClick={() => setEditingPlanStatus(s => !s)}
              className="btn-secondary text-xs"
            >
              {editingPlanStatus ? 'Cancel' : 'Edit Plan'}
            </button>
          </div>
        </div>

        {editingPlanStatus && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={planStatus}
                onChange={e => setPlanStatus(e.target.value as PlanStatus)}
              >
                <option>Active</option>
                <option>Inactive</option>
                <option>Complete</option>
              </select>
            </div>
            <div>
              <label className="label">Milestone Periods</label>
              <select
                className="input"
                value={planMilestoneCount}
                onChange={e => setPlanMilestoneCount(Number(e.target.value))}
              >
                {MILESTONE_PRESETS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <input
                type="text"
                className="input"
                value={planNotes}
                onChange={e => setPlanNotes(e.target.value)}
              />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <button onClick={() => setEditingPlanStatus(false)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleSavePlanDetails} className="btn-primary text-xs">Save Changes</button>
            </div>
          </div>
        )}
      </div>

      {/* Development Items table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Development Items</h2>
          <button
            onClick={() => setAddingItem(true)}
            className="btn-secondary text-xs"
          >
            + Add Item
          </button>
        </div>

        {plan.items.length === 0 && !addingItem ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm mb-3">No development items yet</p>
            <button onClick={() => setAddingItem(true)} className="btn-primary text-sm">
              Add First Item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Development Item</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Due Date</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Support Needed</th>
                  {milestonePeriods(plan.milestone_count ?? 4).map(p => (
                    <th key={p} className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">
                      {milestoneColumnHeader(p, plan.milestone_count ?? 4)}
                    </th>
                  ))}
                  <th className="px-3 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plan.items.map((item, idx) => {
                  const getMilestone = (q: Quarter) =>
                    item.milestones.find((m: QuarterlyMilestone) => m.quarter === q);

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 align-top">
                      <td className="px-3 py-3 text-gray-500 font-medium text-center">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <div className="text-gray-900 leading-relaxed">{item.item_description}</div>
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs">
                        {item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs">{item.support_needed || '—'}</td>

                      {milestonePeriods(plan.milestone_count ?? 4).map((p: Quarter) => (
                        <MilestoneCell
                          key={p}
                          itemId={item.id}
                          quarter={p}
                          milestone={getMilestone(p)}
                          periodLabel={milestoneColumnHeader(p, plan.milestone_count ?? 4)}
                          onSave={handleMilestoneSave}
                        />
                      ))}

                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="btn-ghost text-xs py-0.5 px-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="btn-ghost text-xs py-0.5 px-2 text-red-500 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {addingItem && (
                  <AddItemForm
                    planId={plan.id}
                    sortOrder={plan.items.length}
                    onSaved={() => { setAddingItem(false); load(); }}
                    onCancel={() => setAddingItem(false)}
                  />
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit item modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          onSave={(data) => handleSaveItemEdit(editingItem.id, data)}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
