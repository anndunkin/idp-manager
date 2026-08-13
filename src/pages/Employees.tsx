import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import type { Employee, EmployeeCreate } from '../types';

interface ModalProps {
  employee?: Employee | null;
  onSave: (data: EmployeeCreate) => Promise<void>;
  onClose: () => void;
}

function EmployeeModal({ employee, onSave, onClose }: ModalProps) {
  const [name, setName] = useState(employee?.name ?? '');
  const [manager, setManager] = useState(employee?.manager_name ?? '');
  const [jobTitle, setJobTitle] = useState(employee?.job_title ?? '');
  const [department, setDepartment] = useState(employee?.department ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!manager.trim()) e.manager = 'Manager name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), manager_name: manager.trim(), job_title: jobTitle.trim(), department: department.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">{employee ? 'Edit Employee' : 'Add Employee'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="label">Manager Name *</label>
            <input className="input" value={manager} onChange={e => setManager(e.target.value)} placeholder="John Doe" />
            {errors.manager && <p className="text-red-500 text-xs mt-1">{errors.manager}</p>}
          </div>
          <div>
            <label className="label">Job Title</label>
            <input className="input" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Registered Nurse" />
          </div>
          <div>
            <label className="label">Department</label>
            <input className="input" value={department} onChange={e => setDepartment(e.target.value)} placeholder="Cardiology" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : employee ? 'Save Changes' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Employees() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    if (!window.api) return;
    setLoading(true);
    try {
      const data = await window.api.employees.getAll();
      setEmployees(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const handleSave = async (data: EmployeeCreate) => {
    if (!window.api) return;
    if (editingEmployee) {
      await window.api.employees.update(editingEmployee.id, data);
    } else {
      await window.api.employees.create(data);
    }
    setModalOpen(false);
    setEditingEmployee(null);
    loadEmployees();
  };

  const handleDelete = async (id: number) => {
    if (!window.api) return;
    if (!confirm('Delete this employee and all their development plans? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await window.api.employees.delete(id);
      loadEmployees();
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    return !q || e.name.toLowerCase().includes(q) || e.manager_name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-500 text-sm mt-1">Manage employee records</p>
        </div>
        <button
          onClick={() => { setEditingEmployee(null); setModalOpen(true); }}
          className="btn-primary"
        >
          + Add Employee
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            className="input pl-9"
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <svg className="animate-spin w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">
              {search ? 'No employees match your search' : 'No employees yet'}
            </p>
            {!search && (
              <button onClick={() => setModalOpen(true)} className="btn-primary">Add First Employee</button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Manager</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Job Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{emp.name}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.manager_name}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.job_title}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.department}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/employees/${emp.id}`)} className="btn-ghost text-xs py-1 px-2">View</button>
                      <button onClick={() => { setEditingEmployee(emp); setModalOpen(true); }} className="btn-ghost text-xs py-1 px-2">Edit</button>
                      <button
                        onClick={() => handleDelete(emp.id)}
                        disabled={deletingId === emp.id}
                        className="btn-ghost text-xs py-1 px-2 text-red-600 hover:bg-red-50"
                      >
                        {deletingId === emp.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <EmployeeModal
          employee={editingEmployee}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingEmployee(null); }}
        />
      )}
    </div>
  );
}
