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
import { ForgotPasswordPage } from '@/pages/ForgotPassword';
import { ResetPasswordPage } from '@/pages/ResetPassword';
import { NotFoundPage } from '@/pages/NotFound';
import { AccessDeniedPage } from '@/pages/AccessDenied';
import { DashboardPage } from '@/pages/Dashboard';
import { InventoryPage } from '@/pages/Inventory';
import { ItemDetailPage } from '@/pages/ItemDetail';
import { TransactionsPage } from '@/pages/Transactions';
import { VendorsPage } from '@/pages/Vendors';
import { VendorDetailPage } from '@/pages/VendorDetail';
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
import { SettingsPage } from '@/pages/settings/SettingsIndex';
import { OrganizationSettingsPage } from '@/pages/settings/Organization';
import { CustomFieldsPage } from '@/pages/settings/CustomFields';
import { DocumentTemplatesPage } from '@/pages/settings/DocumentTemplates';
import { SubscriptionPage } from '@/pages/settings/Subscription';
import { ClassTemplatesPage } from '@/pages/settings/ClassTemplates';
import { BulkIssuePage } from '@/pages/BulkIssue';
import { ClassIssueReportPage } from '@/pages/ClassIssueReport';
import { ClassesPage } from '@/pages/Classes';
import { ClassDetailPage } from '@/pages/ClassDetail';
import { QuotationsPage } from '@/pages/Quotations';
import { QuotationDetailPage } from '@/pages/QuotationDetail';
import { FeesPage } from '@/pages/Fees';
import { SupportPage } from '@/pages/Support';
import { ActivityLogPage } from '@/pages/ActivityLog';
import { ProfilePage } from '@/pages/Profile';
import { TermsPage } from '@/pages/TermsOfService';
import { PrivacyPage } from '@/pages/PrivacyPolicy';
import { CookieConsent } from '@/components/shared/CookieConsent';

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

// Detect if we're on a tenant subdomain
function isSubdomain(): boolean {
  const host = window.location.hostname;
  return host.includes('.stockpilot.') && host !== 'stockpilot.ermarscastar.in';
}

// Shows landing page for guests on main domain, login on subdomains
function RootRoute() {
  const { user, loading } = useAuth();
  const { currentOrg } = useOrganization();
  if (loading) return <div className="flex h-screen items-center justify-center"><div className="text-muted-foreground text-sm">Loading…</div></div>;
  if (user) {
    // On main domain: if org has a subdomain, redirect there
    if (!isSubdomain() && currentOrg?.subdomain) {
      window.location.href = `https://${currentOrg.subdomain}.stockpilot.ermarscastar.in/dashboard`;
      return <div className="flex h-screen items-center justify-center"><div className="text-muted-foreground text-sm">Redirecting to your workspace…</div></div>;
    }
    return <Navigate to="/dashboard" replace />;
  }
  // On subdomain → go to login, not landing page
  if (isSubdomain()) return <Navigate to="/login" replace />;
  return <LandingPage />;
}

// Redirects to /login if not authenticated
// On main domain, redirects to subdomain if org has one
function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const { currentOrg } = useOrganization();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // On main domain: if org has subdomain, redirect to it
  if (!isSubdomain() && currentOrg?.subdomain) {
    window.location.href = `https://${currentOrg.subdomain}.stockpilot.ermarscastar.in${window.location.pathname}`;
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Redirecting to your workspace…</div>
      </div>
    );
  }

  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrganizationProvider>
          <AppInitializer>
            <Routes>
              <Route path="/" element={<RootRoute />} />
              <Route path="/signup" element={isSubdomain() ? <Navigate to="/login" replace /> : <SignupPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />

              <Route element={<ProtectedRoutes />}>
                <Route element={<AppLayout />}>
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="inventory/:id" element={<ItemDetailPage />} />
                  <Route path="transactions" element={<TransactionsPage />} />
                  <Route path="vendors" element={<VendorsPage />} />
                  <Route path="vendors/:id" element={<VendorDetailPage />} />
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
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="settings/organization" element={<OrganizationSettingsPage />} />
                  <Route path="settings/custom-fields" element={<CustomFieldsPage />} />
                  <Route path="settings/document-templates" element={<DocumentTemplatesPage />} />
                  <Route path="settings/subscription" element={<SubscriptionPage />} />
                  <Route path="settings/class-templates" element={<ClassTemplatesPage />} />
                  <Route path="classes" element={<ClassesPage />} />
                  <Route path="classes/:id" element={<ClassDetailPage />} />
                  <Route path="bulk-issue" element={<BulkIssuePage />} />
                  <Route path="class-report" element={<ClassIssueReportPage />} />
                  <Route path="fees" element={<FeesPage />} />
                  <Route path="quotations" element={<QuotationsPage />} />
                  <Route path="quotations/:id" element={<QuotationDetailPage />} />
                  <Route path="support" element={<SupportPage />} />
                  <Route path="activity-log" element={<ActivityLogPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
              </Route>

              <Route path="/access-denied" element={<AccessDeniedPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <CookieConsent />
            <Toaster />
          </AppInitializer>
        </OrganizationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
