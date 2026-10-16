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
import { LocationsPage } from '@/pages/Locations';
import { WarehousesPage } from '@/pages/Warehouses';
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
import { RecordsPage } from '@/pages/Records';
import { ProfilePage } from '@/pages/Profile';
import { TermsPage } from '@/pages/TermsOfService';
import { PrivacyPage } from '@/pages/PrivacyPolicy';
import { MonthAnalyticsPage } from '@/pages/analytics/MonthAnalytics';
import { CategoryAnalyticsPage } from '@/pages/analytics/CategoryAnalytics';
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

function PermissionGuard({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { can, user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }
  if (!user || !can(permission)) {
    return <Navigate to="/access-denied" replace />;
  }
  return <>{children}</>;
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
                  <Route path="analytics/month/:monthKey" element={<MonthAnalyticsPage />} />
                  <Route path="analytics/category/:categoryName" element={<CategoryAnalyticsPage />} />
                  <Route path="inventory" element={<PermissionGuard permission="inventory:read"><InventoryPage /></PermissionGuard>} />
                  <Route path="inventory/:id" element={<PermissionGuard permission="inventory:read"><ItemDetailPage /></PermissionGuard>} />
                  <Route path="locations" element={<PermissionGuard permission="inventory:read"><LocationsPage /></PermissionGuard>} />
                  <Route path="warehouses" element={<PermissionGuard permission="inventory:read"><WarehousesPage /></PermissionGuard>} />
                  <Route path="transactions" element={<PermissionGuard permission="transactions:read"><TransactionsPage /></PermissionGuard>} />
                  <Route path="vendors" element={<PermissionGuard permission="vendors:read"><VendorsPage /></PermissionGuard>} />
                  <Route path="vendors/:id" element={<PermissionGuard permission="vendors:read"><VendorDetailPage /></PermissionGuard>} />
                  <Route path="uniforms" element={<PermissionGuard permission="inventory:read"><UniformsPage /></PermissionGuard>} />
                  <Route path="books" element={<PermissionGuard permission="inventory:read"><BooksPage /></PermissionGuard>} />
                  <Route path="student-issues" element={<PermissionGuard permission="assignments:read"><AssignmentsPage /></PermissionGuard>} />
                  <Route path="recipients" element={<PermissionGuard permission="recipients:read"><RecipientsPage /></PermissionGuard>} />
                  <Route path="recipients/:id" element={<PermissionGuard permission="recipients:read"><RecipientDetailPage /></PermissionGuard>} />
                  <Route path="assignments" element={<PermissionGuard permission="assignments:read"><AssignmentsPage /></PermissionGuard>} />
                  <Route path="medicines" element={<PermissionGuard permission="inventory:read"><MedicinesPage /></PermissionGuard>} />
                  <Route path="batches" element={<PermissionGuard permission="inventory:read"><BatchesPage /></PermissionGuard>} />
                  <Route path="expiry" element={<PermissionGuard permission="inventory:read"><ExpiryTrackingPage /></PermissionGuard>} />
                  <Route path="reports" element={<PermissionGuard permission="reports:read"><ReportsPage /></PermissionGuard>} />
                  <Route path="users" element={<PermissionGuard permission="users:read"><UsersPage /></PermissionGuard>} />
                  <Route path="modules" element={<PermissionGuard permission="settings:update"><ModulesPage /></PermissionGuard>} />
                  <Route path="barcode" element={<PermissionGuard permission="inventory:read"><BarcodePage /></PermissionGuard>} />
                  <Route path="assets" element={<PermissionGuard permission="inventory:read"><AssetsPage /></PermissionGuard>} />
                  <Route path="procurement" element={<PermissionGuard permission="vendors:read"><ProcurementPage /></PermissionGuard>} />
                  <Route path="maintenance" element={<PermissionGuard permission="inventory:read"><MaintenancePage /></PermissionGuard>} />
                  <Route path="settings" element={<PermissionGuard permission="settings:read"><SettingsPage /></PermissionGuard>} />
                  <Route path="settings/organization" element={<PermissionGuard permission="settings:update"><OrganizationSettingsPage /></PermissionGuard>} />
                  <Route path="settings/custom-fields" element={<PermissionGuard permission="settings:update"><CustomFieldsPage /></PermissionGuard>} />
                  <Route path="settings/document-templates" element={<PermissionGuard permission="settings:update"><DocumentTemplatesPage /></PermissionGuard>} />
                  <Route path="settings/subscription" element={<PermissionGuard permission="settings:update"><SubscriptionPage /></PermissionGuard>} />
                  <Route path="settings/class-templates" element={<PermissionGuard permission="settings:update"><ClassTemplatesPage /></PermissionGuard>} />
                  <Route path="classes" element={<PermissionGuard permission="inventory:read"><ClassesPage /></PermissionGuard>} />
                  <Route path="classes/:id" element={<PermissionGuard permission="inventory:read"><ClassDetailPage /></PermissionGuard>} />
                  <Route path="bulk-issue" element={<PermissionGuard permission="assignments:create"><BulkIssuePage /></PermissionGuard>} />
                  <Route path="class-report" element={<PermissionGuard permission="reports:read"><ClassIssueReportPage /></PermissionGuard>} />
                  <Route path="fees" element={<PermissionGuard permission="assignments:read"><FeesPage /></PermissionGuard>} />
                  <Route path="quotations" element={<PermissionGuard permission="vendors:read"><QuotationsPage /></PermissionGuard>} />
                  <Route path="quotations/:id" element={<PermissionGuard permission="vendors:read"><QuotationDetailPage /></PermissionGuard>} />
                  <Route path="support" element={<SupportPage />} />
                  <Route path="activity-log" element={<PermissionGuard permission="settings:read"><ActivityLogPage /></PermissionGuard>} />
                  <Route path="records" element={<PermissionGuard permission="settings:read"><RecordsPage /></PermissionGuard>} />
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
