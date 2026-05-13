import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const FolderOpenIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
  </svg>
);

const TableIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M3 10h18M3 14h18M10 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
  </svg>
);

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <ChartIcon /> },
  { to: '/employees', label: 'Employees', icon: <UsersIcon /> },
];

export default function NavBar() {
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);

  const handleOpenFile = async () => {
    setOpening(true);
    setOpenError(null);
    try {
      const result = await window.api.file.open();
      if (result.success && result.planId != null) {
        navigate(`/idp/${result.planId}`);
      } else if (result.error) {
        setOpenError(result.error);
        setTimeout(() => setOpenError(null), 4000);
      }
    } catch (err) {
      setOpenError(String(err));
      setTimeout(() => setOpenError(null), 4000);
    } finally {
      setOpening(false);
    }
  };

  const handleImportExcel = async () => {
    setImporting(true);
    setImportError(null);
    setImportSuccess(null);
    try {
      const result = await window.api.import.fromExcel();
      if (result.success && result.planId != null) {
        setImportSuccess('Form imported successfully.');
        setTimeout(() => setImportSuccess(null), 3000);
        navigate(`/idp/${result.planId}`);
      } else if (result.error) {
        setImportError(result.error);
        setTimeout(() => setImportError(null), 6000);
      }
    } catch (err) {
      setImportError(String(err));
      setTimeout(() => setImportError(null), 6000);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    setDownloadMsg(null);
    try {
      const result = await window.api.import.downloadTemplate();
      if (result.success) {
        setDownloadMsg('Template saved to Downloads.');
      } else {
        setDownloadMsg(result.error ?? 'Download failed.');
      }
      setTimeout(() => setDownloadMsg(null), 4000);
    } catch (err) {
      setDownloadMsg(String(err));
      setTimeout(() => setDownloadMsg(null), 4000);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <nav className="w-56 bg-primary-900 flex flex-col h-full shadow-xl">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-primary-700">
        <div className="flex items-center gap-3">
          {/* SVG Logo */}
          <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 32 32" fill="none" aria-label="IDP Manager">
            <rect width="32" height="32" rx="8" fill="#14B8A6" />
            <path d="M16 8v16M8 12h16M10 16h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16" cy="16" r="10" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" />
          </svg>
          <div>
            <div className="text-white font-bold text-sm leading-tight">Paul Selby's IDP Tool</div>
            <div className="text-primary-300 text-xs">Cybersecurity</div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-primary-700 text-white'
                  : 'text-primary-200 hover:bg-primary-800 hover:text-white'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* File Actions */}
      <div className="px-3 pb-2 space-y-1">
        {/* Open .idp File */}
        <button
          onClick={handleOpenFile}
          disabled={opening}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-primary-200 hover:bg-primary-800 hover:text-white disabled:opacity-50"
        >
          {opening ? (
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <FolderOpenIcon />
          )}
          Open File
        </button>
        {openError && (
          <p className="text-red-300 text-xs mt-1 px-3">{openError}</p>
        )}

        {/* Import Employee Excel Form */}
        <button
          onClick={handleImportExcel}
          disabled={importing}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-primary-200 hover:bg-primary-800 hover:text-white disabled:opacity-50"
          title="Import a completed Employee Input Form (.xlsx)"
        >
          {importing ? (
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <TableIcon />
          )}
          Import Employee Form
        </button>
        {importError && (
          <p className="text-red-300 text-xs mt-1 px-3">{importError}</p>
        )}
        {importSuccess && (
          <p className="text-green-300 text-xs mt-1 px-3">{importSuccess}</p>
        )}

        {/* Download blank template */}
        <button
          onClick={handleDownloadTemplate}
          disabled={downloading}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150 text-primary-400 hover:bg-primary-800 hover:text-primary-200 disabled:opacity-50"
          title="Download blank Employee Input Form template"
        >
          {downloading ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <DownloadIcon />
          )}
          Get Form Template
        </button>
        {downloadMsg && (
          <p className="text-primary-300 text-xs mt-1 px-3">{downloadMsg}</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-primary-700">
        <p className="text-primary-400 text-xs">v1.1.0</p>
      </div>
    </nav>
  );
}
