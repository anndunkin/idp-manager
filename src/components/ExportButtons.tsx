import React, { useState } from 'react';

interface Props {
  planId: number;
}

type ExportFormat = 'excel' | 'word' | 'pdf';

export default function ExportButtons({ planId }: Props) {
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setLoading(format);
    setError(null);
    try {
      let result;
      if (format === 'excel') {
        result = await window.api.export.toExcel(planId);
      } else if (format === 'word') {
        result = await window.api.export.toWord(planId);
      } else {
        result = await window.api.export.toPdf(planId);
      }
      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 mr-1">Export:</span>

      <button
        onClick={() => handleExport('excel')}
        disabled={loading !== null}
        className="btn-secondary text-xs"
        title="Export to Excel"
      >
        {loading === 'excel' ? (
          <span className="flex items-center gap-1">
            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Exporting...
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 13h3v2H8v-2zm0 4h3v2H8v-2zm5-4h3v2h-3v-2zm0 4h3v2h-3v-2z" />
            </svg>
            Excel
          </span>
        )}
      </button>

      <button
        onClick={() => handleExport('word')}
        disabled={loading !== null}
        className="btn-secondary text-xs"
        title="Export to Word"
      >
        {loading === 'word' ? (
          <span className="flex items-center gap-1">
            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Exporting...
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 11h8v2H8v-2zm0 4h8v2H8v-2z" />
            </svg>
            Word
          </span>
        )}
      </button>

      <button
        onClick={() => handleExport('pdf')}
        disabled={loading !== null}
        className="btn-secondary text-xs"
        title="Export to PDF"
      >
        {loading === 'pdf' ? (
          <span className="flex items-center gap-1">
            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Exporting...
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM9 13h2v2H9v-2zm4 0h2v2h-2v-2zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2z" />
            </svg>
            PDF
          </span>
        )}
      </button>

      {error && (
        <span className="text-xs text-red-600 ml-2">{error}</span>
      )}
    </div>
  );
}
