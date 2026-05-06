import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import IDPForm, { type NewIDPFormData } from '../components/IDPForm';
import type { Employee } from '../types';

export default function NewIDP() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.api) return;
    window.api.employees.getAll().then(emps => {
      setEmployees(emps);
      setLoading(false);
    }).catch(err => {
      setError(String(err));
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (data: NewIDPFormData) => {
    if (!window.api) return;
    setSubmitting(true);
    setError(null);
    try {
      const plan = await window.api.plans.create({
        employee_id: data.employee_id,
        plan_date: data.plan_date,
        plan_year: data.plan_year,
        status: data.status,
        notes: data.notes,
      });

      // Create items
      for (let i = 0; i < data.items.length; i++) {
        await window.api.items.create({
          plan_id: plan.id,
          item_description: data.items[i].item_description,
          due_date: data.items[i].due_date,
          support_needed: data.items[i].support_needed,
          sort_order: i,
        });
      }

      navigate(`/idp/${plan.id}`);
    } catch (err) {
      setError(String(err));
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (employeeId) {
      navigate(`/employees/${employeeId}`);
    } else {
      navigate('/employees');
    }
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

  const currentEmployee = employees.find(e => e.id === Number(employeeId));

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 flex items-center gap-2">
        <Link to="/employees" className="hover:text-primary-600">Employees</Link>
        {currentEmployee && (
          <>
            <span>/</span>
            <Link to={`/employees/${currentEmployee.id}`} className="hover:text-primary-600">{currentEmployee.name}</Link>
          </>
        )}
        <span>/</span>
        <span className="text-gray-900 font-medium">New IDP</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Development Plan</h1>
        <p className="text-gray-500 text-sm mt-1">
          {currentEmployee ? `For ${currentEmployee.name}` : 'New individual development plan'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      <IDPForm
        employees={employees}
        initialEmployeeId={employeeId ? Number(employeeId) : undefined}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitting={submitting}
      />
    </div>
  );
}
