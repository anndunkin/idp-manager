import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { EmployeeWithPlanSummary } from '../types';

interface Props {
  employee: EmployeeWithPlanSummary;
  onEdit: (e: EmployeeWithPlanSummary) => void;
  onDelete: (id: number) => void;
}

function getStatusBadge(status?: string) {
  switch (status) {
    case 'Active':   return <span className="badge-active">{status}</span>;
    case 'Complete': return <span className="badge-complete">{status}</span>;
    case 'Inactive': return <span className="badge-inactive">{status}</span>;
    default:         return <span className="badge-inactive">No Plans</span>;
  }
}

export default function EmployeeCard({ employee, onEdit, onDelete }: Props) {
  const navigate = useNavigate();

  const progressColor =
    employee.overallProgress >= 80 ? 'bg-green-500' :
    employee.overallProgress >= 50 ? 'bg-amber-500' : 'bg-primary-500';

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900">{employee.name}</div>
        <div className="text-xs text-gray-500">{employee.department}</div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{employee.manager_name}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{employee.job_title}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{employee.planCount}</td>
      <td className="px-4 py-3">{getStatusBadge(employee.latestPlanStatus)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
            <div
              className={`${progressColor} h-2 rounded-full transition-all`}
              style={{ width: `${employee.overallProgress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 w-8">{employee.overallProgress}%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/employees/${employee.id}`)}
            className="btn-ghost text-xs py-1 px-2"
          >
            View
          </button>
          <button
            onClick={() => onEdit(employee)}
            className="btn-ghost text-xs py-1 px-2"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(employee.id)}
            className="btn-ghost text-xs py-1 px-2 text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
