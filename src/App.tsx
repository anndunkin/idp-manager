import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import NewIDP from './pages/NewIDP';
import IDPDetail from './pages/IDPDetail';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/employees/:id" element={<EmployeeDetail />} />
          <Route path="/employees/:employeeId/idp/new" element={<NewIDP />} />
          <Route path="/idp/:id" element={<IDPDetail />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
