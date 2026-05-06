import React, { useState } from 'react';

// ─── Icons ────────────────────────────────────────────────────────────────────

const SaveIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

const SaveAsIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const OpenIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  planId: number;
  /** The last file path this plan was saved to (tracked by the parent). */
  currentFilePath?: string;
  /** Called after a successful Save or Save As with the new file path. */
  onFileSaved?: (filePath: string) => void;
  /** Called after a successful Open; the parent should navigate to the new plan. */
  onFileOpened?: (planId: number, filePath: string) => void;
}

type Op = 'save' | 'saveAs' | 'open';

// ─── Component ────────────────────────────────────────────────────────────────

export default function FileMenuBar({ planId, currentFilePath, onFileSaved, onFileOpened }: Props) {
  const [busy, setBusy] = useState<Op | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const setTemporaryStatus = (ok: boolean, msg: string) => {
    setStatus({ ok, msg });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleSave = async () => {
    setBusy('save');
    try {
      const result = await window.api.file.save(planId, currentFilePath);
      if (result.success && result.filePath) {
        onFileSaved?.(result.filePath);
        // Show short path for feedback
        const parts = result.filePath.replace(/\\/g, '/').split('/');
        setTemporaryStatus(true, `Saved: ${parts.slice(-2).join('/')}`);
      } else if (!result.success && result.error) {
        setTemporaryStatus(false, result.error);
      }
      // success:false with no error = user cancelled — no message needed
    } catch (err) {
      setTemporaryStatus(false, String(err));
    } finally {
      setBusy(null);
    }
  };

  const handleSaveAs = async () => {
    setBusy('saveAs');
    try {
      const result = await window.api.file.saveAs(planId);
      if (result.success && result.filePath) {
        onFileSaved?.(result.filePath);
        const parts = result.filePath.replace(/\\/g, '/').split('/');
        setTemporaryStatus(true, `Saved: ${parts.slice(-2).join('/')}`);
      } else if (result.error) {
        setTemporaryStatus(false, result.error);
      }
    } catch (err) {
      setTemporaryStatus(false, String(err));
    } finally {
      setBusy(null);
    }
  };

  const handleOpen = async () => {
    setBusy('open');
    try {
      const result = await window.api.file.open();
      if (result.success && result.planId != null && result.filePath) {
        onFileOpened?.(result.planId, result.filePath);
        const parts = result.filePath.replace(/\\/g, '/').split('/');
        setTemporaryStatus(true, `Opened: ${parts.slice(-1)[0]}`);
      } else if (result.error) {
        setTemporaryStatus(false, result.error);
      }
    } catch (err) {
      setTemporaryStatus(false, String(err));
    } finally {
      setBusy(null);
    }
  };

  const isBusy = busy !== null;

  return (
    <div className="flex items-center gap-1.5">
      {/* Save */}
      <button
        onClick={handleSave}
        disabled={isBusy}
        title={currentFilePath ? `Save to ${currentFilePath}` : 'Save (choose location)'}
        className="btn-secondary text-xs flex items-center gap-1.5 px-2.5 py-1.5"
      >
        {busy === 'save' ? (
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <SaveIcon />
        )}
        <span>Save</span>
        {currentFilePath && (
          <span className="text-gray-400 font-normal hidden sm:inline">
            {' '}(Ctrl+S)
          </span>
        )}
      </button>

      {/* Save As */}
      <button
        onClick={handleSaveAs}
        disabled={isBusy}
        title="Save As — choose a new file name and location"
        className="btn-secondary text-xs flex items-center gap-1.5 px-2.5 py-1.5"
      >
        {busy === 'saveAs' ? (
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <SaveAsIcon />
        )}
        <span>Save As</span>
      </button>

      {/* Open */}
      <button
        onClick={handleOpen}
        disabled={isBusy}
        title="Open an existing .idp file"
        className="btn-secondary text-xs flex items-center gap-1.5 px-2.5 py-1.5"
      >
        {busy === 'open' ? (
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <OpenIcon />
        )}
        <span>Open</span>
      </button>

      {/* Current file indicator */}
      {currentFilePath && !status && (
        <span
          className="hidden md:flex items-center gap-1 text-xs text-gray-400 ml-1 max-w-xs truncate"
          title={currentFilePath}
        >
          <CheckIcon />
          {currentFilePath.replace(/\\/g, '/').split('/').slice(-1)[0]}
        </span>
      )}

      {/* Status flash */}
      {status && (
        <span className={`text-xs ml-1 flex items-center gap-1 ${status.ok ? 'text-green-600' : 'text-red-500'}`}>
          {status.ok ? <CheckIcon /> : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {status.msg}
        </span>
      )}
    </div>
  );
}
