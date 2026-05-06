import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

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

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <ChartIcon /> },
  { to: '/employees', label: 'Employees', icon: <UsersIcon /> },
];

export default function NavBar() {
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
            <div className="text-white font-bold text-base leading-tight">IDP Manager</div>
            <div className="text-primary-300 text-xs">Healthcare</div>
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

      {/* Footer */}
      <div className="px-5 py-4 border-t border-primary-700">
        <p className="text-primary-400 text-xs">v1.0.0</p>
      </div>
    </nav>
  );
}
