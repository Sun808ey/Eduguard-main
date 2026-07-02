import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const DashboardShell = lazy(() => import('./pages/dashboard/DashboardShell.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const DevicesPage = lazy(() => import('./pages/dashboard/DevicesPage.jsx'));
const PoliciesPage = lazy(() => import('./pages/dashboard/PoliciesPage.jsx'));
const AppsPage = lazy(() => import('./pages/dashboard/AppsPage.jsx'));
const AuditLogPage = lazy(() => import('./pages/dashboard/AuditLogPage.jsx'));
const ViolationsPage = lazy(() => import('./pages/dashboard/ViolationsPage.jsx'));
const ReportsPage = lazy(() => import('./pages/dashboard/ReportsPage.jsx'));
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage.jsx'));
const EnrollmentPage = lazy(() => import('./pages/EnrollmentPage.jsx'));

const routeFallback = (
  <div className="route-loading" role="status" aria-live="polite">
    <p>Loading page…</p>
  </div>
);

function withSuspense(node) {
  return <Suspense fallback={routeFallback}>{node}</Suspense>;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={withSuspense(<DashboardShell />)}>
        <Route index element={withSuspense(<DashboardPage />)} />
        <Route path="devices" element={withSuspense(<DevicesPage />)} />
        <Route path="policies" element={withSuspense(<PoliciesPage />)} />
        <Route path="apps" element={withSuspense(<AppsPage />)} />
        <Route path="audit-log" element={withSuspense(<AuditLogPage />)} />
        <Route path="violations" element={withSuspense(<ViolationsPage />)} />
        <Route path="reports" element={withSuspense(<ReportsPage />)} />
        <Route path="settings" element={withSuspense(<SettingsPage />)} />
      </Route>
      <Route path="/enrollment" element={withSuspense(<EnrollmentPage />)} />
      <Route path="/index.html" element={<Navigate to="/" replace />} />
      <Route path="/login.html" element={<Navigate to="/login" replace />} />
      <Route path="/dashboard.html" element={<Navigate to="/dashboard" replace />} />
      <Route path="/enrollment.html" element={<Navigate to="/enrollment" replace />} />
      <Route path="/404.html" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
