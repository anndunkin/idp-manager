import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import type { Employee, DevelopmentPlan } from '../types';

function planStatusBadge(status: string) {
  switch (status) {
    case 'Active':   return <span className="badge-active">{status}</span>;
    case 'Complete': return <span className="badge-complete">{status}</span>;
    default:         return <span className="badge-inactive">{status}</span>;
  }
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [plans, setPlans] = useState<DevelopmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!window.api || !id) return;
    setLoading(true);
    try {
      const emp = await window.api.employees.getById(Number(id));
      if (!emp) { setError('Employee not found'); return; }
      setEmployee(emp);
      const p = await window.api.plans.getByEmployee(emp.id);
      setPlans(p);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleDeletePlan = async (planId: number) => {
    if (!window.api) return;
    if (!confirm('Delete this development plan and all its items?')) return;
    await window.api.plans.delete(planId);
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

  if (error || !employee) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error ?? 'Not found'}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 flex items-center gap-2">
        <Link to="/employees" className="hover:text-primary-600">Employees</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{employee.name}</span>
      </nav>

      {/* Employee info card */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-bold text-lg">
                  {employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{employee.name}</h1>
                <p className="text-gray-500 text-sm">{employee.job_title} · {employee.department}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/employees/${employee.id}/idp/new`)}
            className="btn-primary"
          >
            + New IDP
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4 pt-5 border-t border-gray-100">
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Manager</div>
            <div className="text-sm text-gray-900 mt-1">{employee.manager_name}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Department</div>
            <div className="text-sm text-gray-900 mt-1">{employee.department || '—'}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Member Since</div>
            <div className="text-sm text-gray-900 mt-1">{new Date(employee.created_at).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {/* IDPs */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Development Plans ({plans.length})</h2>
          <button
            onClick={() => navigate(`/employees/${employee.id}/idp/new`)}
            className="btn-secondary text-xs"
          >
            + New Plan
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm mb-3">No development plans yet</p>
            <button
              onClick={() => navigate(`/employees/${employee.id}/idp/new`)}
              className="btn-primary text-sm"
            >
              Create First IDP
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Year</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plans.map(plan => (
                <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {new Date(plan.plan_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{plan.plan_year}</td>
                  <td className="px-4 py-3">{planStatusBadge(plan.status)}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{plan.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/idp/${plan.id}`)}
                        className="btn-ghost text-xs py-1 px-2"
                      >
                        Open →
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="btn-ghost text-xs py-1 px-2 text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
