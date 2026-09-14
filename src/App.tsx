import './App.css';
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { OrganizationProvider, useOrganization } from '@/context/OrganizationContext';
import { Toaster } from '@/components/ui/toaster';
import { AppLayout } from '@/components/layout/AppLayout';

import { LandingPage } from '@/pages/Landing';
import { SignupPage } from '@/pages/Signup';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { InventoryPage } from '@/pages/Inventory';
import { ItemDetailPage } from '@/pages/ItemDetail';
import { TransactionsPage } from '@/pages/Transactions';
import { SuppliersPage } from '@/pages/Suppliers';
import { SupplierDetailPage } from '@/pages/SupplierDetail';
import { UniformsPage } from '@/pages/Uniforms';
import { BooksPage } from '@/pages/Books';
import { AssignmentsPage } from '@/pages/Assignments';
import { RecipientsPage } from '@/pages/Recipients';
import { RecipientDetailPage } from '@/pages/RecipientDetail';
import { MedicinesPage } from '@/pages/Medicines';
import { BatchesPage } from '@/pages/Batches';
import { ExpiryTrackingPage } from '@/pages/ExpiryTracking';
import { ReportsPage } from '@/pages/Reports';
import { UsersPage } from '@/pages/Users';
import { ModulesPage } from '@/pages/Modules';
import { BarcodePage } from '@/pages/Barcode';
import { AssetsPage } from '@/pages/Assets';
import { ProcurementPage } from '@/pages/Procurement';
import { MaintenancePage } from '@/pages/Maintenance';
import { CreateOrganizationPage } from '@/pages/CreateOrganization';
import { SettingsPage } from '@/pages/settings/SettingsIndex';
import { OrganizationSettingsPage } from '@/pages/settings/Organization';
import { CustomFieldsPage } from '@/pages/settings/CustomFields';
import { DocumentTemplatesPage } from '@/pages/settings/DocumentTemplates';
import { SubscriptionPage } from '@/pages/settings/Subscription';

// Loads orgs after auth is ready
function AppInitializer({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { refreshOrganizations, setCurrentOrgId } = useOrganization();

  useEffect(() => {
    if (user) {
      refreshOrganizations().then(() => {
        setCurrentOrgId(user.organizationId);
      });
    }
  }, [user, refreshOrganizations, setCurrentOrgId]);

  return <>{children}</>;
}

// Redirects to /login if not authenticated
function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrganizationProvider>
          <AppInitializer>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/login" element={<LoginPage />} />

              <Route element={<ProtectedRoutes />}>
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="inventory/:id" element={<ItemDetailPage />} />
                  <Route path="transactions" element={<TransactionsPage />} />
                  <Route path="suppliers" element={<SuppliersPage />} />
                  <Route path="suppliers/:id" element={<SupplierDetailPage />} />
                  <Route path="uniforms" element={<UniformsPage />} />
                  <Route path="books" element={<BooksPage />} />
                  <Route path="student-issues" element={<AssignmentsPage />} />
                  <Route path="recipients" element={<RecipientsPage />} />
                  <Route path="recipients/:id" element={<RecipientDetailPage />} />
                  <Route path="assignments" element={<AssignmentsPage />} />
                  <Route path="medicines" element={<MedicinesPage />} />
                  <Route path="batches" element={<BatchesPage />} />
                  <Route path="expiry" element={<ExpiryTrackingPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="modules" element={<ModulesPage />} />
                  <Route path="barcode" element={<BarcodePage />} />
                  <Route path="assets" element={<AssetsPage />} />
                  <Route path="procurement" element={<ProcurementPage />} />
                  <Route path="maintenance" element={<MaintenancePage />} />
                  <Route path="organizations/new" element={<CreateOrganizationPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="settings/organization" element={<OrganizationSettingsPage />} />
                  <Route path="settings/custom-fields" element={<CustomFieldsPage />} />
                  <Route path="settings/document-templates" element={<DocumentTemplatesPage />} />
                  <Route path="settings/subscription" element={<SubscriptionPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster />
          </AppInitializer>
        </OrganizationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
