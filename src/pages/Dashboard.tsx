import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Employee, DevelopmentPlan, EmployeeWithPlanSummary, DashboardStats } from '../types';

function StatCard({ title, value, subtitle, color }: { title: string; value: string | number; subtitle?: string; color: string }) {
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
        <div className="w-5 h-5 bg-white/30 rounded" />
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm font-medium text-gray-600 mt-1">{title}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [plansMap, setPlansMap] = useState<Map<number, DevelopmentPlan[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    (async () => {
      if (!window.api) return;
      setLoading(true);
      try {
        const emps = await window.api.employees.getAll();
        setEmployees(emps);

        const planEntries = await Promise.all(
          emps.map(async e => {
            const plans = await window.api.plans.getByEmployee(e.id);
            return [e.id, plans] as [number, DevelopmentPlan[]];
          })
        );
        setPlansMap(new Map(planEntries));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const enrichedEmployees: EmployeeWithPlanSummary[] = useMemo(() => {
    return employees.map(e => {
      const plans = plansMap.get(e.id) ?? [];
      const sorted = [...plans].sort((a, b) => b.plan_date.localeCompare(a.plan_date));
      return {
        ...e,
        planCount: plans.length,
        latestPlanStatus: sorted[0]?.status,
        overallProgress: 0, // will be enriched below when milestone data available
      };
    });
  }, [employees, plansMap]);

  // Stats computation
  const stats: DashboardStats = useMemo(() => {
    const now = new Date();
    const currentQ = Math.ceil((now.getMonth() + 1) / 3);
    const currentYear = now.getFullYear();

    let activePlans = 0;
    let plansDueThisQuarter = 0;

    for (const plans of plansMap.values()) {
      for (const plan of plans) {
        if (plan.status === 'Active') activePlans++;
        // Plans with due date in current quarter
        if (plan.plan_year === currentYear && plan.status === 'Active') {
          plansDueThisQuarter++;
        }
      }
    }

    return {
      totalEmployees: employees.length,
      activePlans,
      plansDueThisQuarter,
      completionRate: 0,
    };
  }, [employees, plansMap]);

  const filtered = useMemo(() => {
    return enrichedEmployees.filter(e => {
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        e.name.toLowerCase().includes(q) ||
        e.manager_name.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || e.latestPlanStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [enrichedEmployees, search, statusFilter]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Active':   return <span className="badge-active">Active</span>;
      case 'Complete': return <span className="badge-complete">Complete</span>;
      case 'Inactive': return <span className="badge-inactive">Inactive</span>;
      default:         return <span className="badge-not-started">No Plans</span>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Individual Development Plan overview</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={stats.totalEmployees} color="bg-primary-500" />
        <StatCard title="Active Plans" value={stats.activePlans} color="bg-accent-500" />
        <StatCard title="Plans This Year" value={stats.plansDueThisQuarter} color="bg-amber-500" subtitle="Active plans for current year" />
        <StatCard title="Completion Rate" value={`${stats.completionRate}%`} color="bg-green-500" subtitle="Avg across all milestones" />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              className="input pl-9"
              placeholder="Search by name, manager, department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input w-44"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option>Active</option>
            <option>Inactive</option>
            <option>Complete</option>
          </select>
        </div>
      </div>

      {/* Employees table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Employees</h2>
        </div>
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
            <p className="text-gray-400">No employees found</p>
            <button
              onClick={() => navigate('/employees')}
              className="btn-primary mt-4 text-sm"
            >
              Add Employee
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Manager</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plans</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{emp.name}</div>
                      <div className="text-xs text-gray-500">{emp.job_title} · {emp.department}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{emp.manager_name}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.planCount}</td>
                    <td className="px-4 py-3">{getStatusBadge(emp.latestPlanStatus)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full"
                            style={{ width: `${emp.overallProgress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{emp.overallProgress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/employees/${emp.id}`)}
                        className="btn-ghost text-xs py-1 px-2"
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
