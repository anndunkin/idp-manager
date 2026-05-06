import React, { useState } from 'react';
import type { QuarterlyMilestone, MilestoneStatus, Quarter } from '../types';

interface MilestoneCell {
  itemId: number;
  quarter: Quarter;
  milestone?: QuarterlyMilestone;
  onSave: (data: { item_id: number; quarter: Quarter; status: MilestoneStatus; percent_complete: number; notes: string }) => Promise<void>;
}

function statusBadgeClass(status: MilestoneStatus) {
  switch (status) {
    case 'In Progress': return 'badge-in-progress';
    case 'Complete':    return 'badge-complete';
    default:            return 'badge-not-started';
  }
}

export function MilestoneCell({ itemId, quarter, milestone, onSave }: MilestoneCell) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<MilestoneStatus>(milestone?.status ?? 'Not Started');
  const [percent, setPercent] = useState(milestone?.percent_complete ?? 0);
  const [notes, setNotes] = useState(milestone?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ item_id: itemId, quarter, status, percent_complete: percent, notes });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setStatus(milestone?.status ?? 'Not Started');
    setPercent(milestone?.percent_complete ?? 0);
    setNotes(milestone?.notes ?? '');
    setEditing(false);
  };

  if (editing) {
    return (
      <td className="px-2 py-2 min-w-[160px] align-top">
        <div className="bg-white border border-primary-300 rounded-lg p-2 shadow-md space-y-2">
          <select
            className="input text-xs py-1"
            value={status}
            onChange={e => setStatus(e.target.value as MilestoneStatus)}
          >
            <option>Not Started</option>
            <option>In Progress</option>
            <option>Complete</option>
          </select>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{percent}%</span>
            </div>
            <input
              type="range"
              min="0" max="100" step="5"
              value={percent}
              onChange={e => setPercent(Number(e.target.value))}
              className="w-full accent-primary-600"
            />
          </div>
          <textarea
            className="input text-xs py-1 resize-none"
            rows={2}
            placeholder="Notes..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <div className="flex gap-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 text-xs bg-primary-600 text-white rounded py-1 hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? '...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 text-xs bg-gray-100 text-gray-700 rounded py-1 hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </td>
    );
  }

  const currentStatus = milestone?.status ?? 'Not Started';
  const currentPct = milestone?.percent_complete ?? 0;

  return (
    <td className="px-2 py-2 text-center align-middle">
      <button
        onClick={() => setEditing(true)}
        className="flex flex-col items-center gap-1 w-full hover:bg-gray-50 rounded p-1 transition-colors"
        title={`Q${quarter}: ${currentStatus} (${currentPct}%)`}
      >
        <span className={statusBadgeClass(currentStatus)}>
          {currentStatus === 'Not Started' ? 'Not Started' :
           currentStatus === 'In Progress' ? 'In Progress' : 'Complete'}
        </span>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-0.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              currentStatus === 'Complete' ? 'bg-green-500' :
              currentStatus === 'In Progress' ? 'bg-amber-500' : 'bg-gray-300'
            }`}
            style={{ width: `${currentPct}%` }}
          />
        </div>
        <span className="text-xs text-gray-500">{currentPct}%</span>
      </button>
    </td>
  );
}

interface MilestoneTrackerProps {
  milestones: QuarterlyMilestone[];
}

export default function MilestoneTracker({ milestones }: MilestoneTrackerProps) {
  const getStatus = (q: Quarter) => milestones.find(m => m.quarter === q)?.status ?? 'Not Started';
  const getPct = (q: Quarter) => milestones.find(m => m.quarter === q)?.percent_complete ?? 0;

  return (
    <div className="flex gap-2">
      {([1, 2, 3, 4] as Quarter[]).map(q => (
        <div key={q} className="text-center">
          <div className="text-xs font-medium text-gray-500 mb-1">Q{q}</div>
          <span className={statusBadgeClass(getStatus(q))}>
            {getStatus(q)}
          </span>
          <div className="text-xs text-gray-500 mt-0.5">{getPct(q)}%</div>
        </div>
      ))}
    </div>
  );
}
