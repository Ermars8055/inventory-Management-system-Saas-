import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { OrganizationsPage } from '@/pages/Organizations';
import { OrgDetailPage } from '@/pages/OrgDetail';
import { AdminUsersPage } from '@/pages/AdminUsers';
import { AuditLogPage } from '@/pages/AuditLog';
import { CouponsPage } from '@/pages/Coupons';
import { BillingPage } from '@/pages/Billing';

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-slate-400 text-sm">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoutes />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/organizations" element={<OrganizationsPage />} />
              <Route path="/organizations/:id" element={<OrgDetailPage />} />
              <Route path="/admin-users" element={<AdminUsersPage />} />
              <Route path="/coupons" element={<CouponsPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/audit" element={<AuditLogPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
