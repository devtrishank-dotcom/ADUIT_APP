import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import DashboardLayout from './components/Layout/DashboardLayout';
import './App.css';

const LoginPage = lazy(() => import('./pages/Login'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const UnauthorizedPage = lazy(() => import('./pages/Unauthorized'));

const TemplateList = lazy(() => import('./pages/Admin/TemplateList'));
const TemplateBuilder = lazy(() => import('./pages/Admin/TemplateBuilder'));
const OptionListManager = lazy(() => import('./pages/Admin/OptionListManager'));
const ValueStatementManager = lazy(() => import('./pages/Admin/ValueStatementManager'));
const RiskConfigManager = lazy(() => import('./pages/Admin/RiskConfigManager'));
const MastersPanel = lazy(() => import('./pages/Admin/MastersPanel'));
const UserManager = lazy(() => import('./pages/Admin/UserManager'));
const RoleManager = lazy(() => import('./pages/Admin/RoleManager'));
const WorkflowDesigner = lazy(() => import('./pages/Admin/WorkflowDesigner'));
const NotificationTemplateManager = lazy(() => import('./pages/Admin/NotificationTemplateManager'));

const AuditPlanList = lazy(() => import('./pages/Planner/AuditPlanList'));
const PlanCalendar = lazy(() => import('./pages/Planner/PlanCalendar'));

const MyAudits = lazy(() => import('./pages/Auditor/MyAudits'));
const AuditExecution = lazy(() => import('./pages/Auditor/AuditExecution'));
const AuditDetail = lazy(() => import('./pages/Auditor/AuditDetail'));

const HIADashboard = lazy(() => import('./pages/HIA/HIADashboard'));
const HIAReview = lazy(() => import('./pages/HIA/HIAReview'));
const HIAAuditReview = lazy(() => import('./pages/HIA/HIAAuditReview'));

const MyObservations = lazy(() => import('./pages/Compliance/MyObservations'));
const ObservationDetail = lazy(() => import('./pages/Compliance/ObservationDetail'));

const ClosureList = lazy(() => import('./pages/Closure/ClosureList'));
const ClosureCertificate = lazy(() => import('./pages/Closure/ClosureCertificate'));

const ReportsDashboard = lazy(() => import('./pages/Reports/ReportsDashboard'));
const AuditHistory = lazy(() => import('./pages/Reports/AuditHistory'));
const NotificationsPage = lazy(() => import('./pages/Notifications'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
    <Spin size="large" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Dashboard */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
            </Route>

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="templates" element={<TemplateList />} />
              <Route path="templates/:templateId/builder" element={<TemplateBuilder />} />
              <Route path="option-lists" element={<OptionListManager />} />
              <Route path="value-statements" element={<ValueStatementManager />} />
              <Route path="risk-configs" element={<RiskConfigManager />} />
              <Route path="masters" element={<MastersPanel />} />
              <Route path="users" element={<UserManager />} />
              <Route path="roles" element={<RoleManager />} />
              <Route path="workflows" element={<WorkflowDesigner />} />
              <Route path="notification-templates" element={<NotificationTemplateManager />} />
            </Route>

            {/* Planner */}
            <Route path="/planner" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<AuditPlanList />} />
              <Route path="calendar" element={<PlanCalendar />} />
            </Route>

            {/* Auditor */}
            <Route path="/auditor" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<MyAudits />} />
              <Route path="audit/:auditInstanceId" element={<AuditExecution />} />
              <Route path="audit/:auditInstanceId/view" element={<AuditDetail />} />
            </Route>

            {/* HIA */}
            <Route path="/hia" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<HIADashboard />} />
              <Route path="review" element={<HIAReview />} />
              <Route path="review/:auditInstanceId" element={<HIAAuditReview />} />
            </Route>

            {/* Compliance */}
            <Route path="/compliance" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<MyObservations />} />
              <Route path=":observationId" element={<ObservationDetail />} />
            </Route>

            {/* Closure */}
            <Route path="/closure" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<ClosureList />} />
              <Route path="certificate/:auditInstanceId" element={<ClosureCertificate />} />
            </Route>

            {/* Reports */}
            <Route path="/reports" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<ReportsDashboard />} />
              <Route path="history/:entityType/:entityId" element={<AuditHistory />} />
            </Route>

            {/* Notifications */}
            <Route path="/notifications" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<NotificationsPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
