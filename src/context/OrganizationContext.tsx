import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Organization, ModuleId, OrgConfig } from '@/types';
import { organizationService } from '@/services';

interface OrganizationContextValue {
  organizations: Organization[];
  currentOrg: Organization | null;
  setCurrentOrgId: (id: string) => void;
  refreshOrganizations: () => Promise<void>;
  updateModules: (modules: ModuleId[]) => Promise<void>;
  updateConfig: (config: Partial<OrgConfig>) => Promise<void>;
  isModuleEnabled: (moduleId: ModuleId) => boolean;
  loading: boolean;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrgId, setCurrentOrgIdState] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // No dependency on currentOrgId — caller sets the org after refresh
  const refreshOrganizations = useCallback(async () => {
    const orgs = await organizationService.getAll();
    setOrganizations(orgs);
    setLoading(false);
  }, []);

  const setCurrentOrgId = useCallback((id: string) => {
    setCurrentOrgIdState(id);
  }, []);

  const updateModules = useCallback(async (modules: ModuleId[]) => {
    if (!currentOrgId) return;
    await organizationService.updateModules(currentOrgId, modules);
    const updated = await organizationService.getAll();
    setOrganizations(updated);
  }, [currentOrgId]);

  const updateConfig = useCallback(async (config: Partial<OrgConfig>) => {
    if (!currentOrgId) return;
    await organizationService.updateConfig(currentOrgId, config);
    const updated = await organizationService.getAll();
    setOrganizations(updated);
  }, [currentOrgId]);

  const currentOrg = organizations.find((o) => o.id === currentOrgId) || null;

  const isModuleEnabled = useCallback(
    (moduleId: ModuleId) => {
      return currentOrg?.enabledModules.includes(moduleId) ?? false;
    },
    [currentOrg],
  );

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrg,
        setCurrentOrgId,
        refreshOrganizations,
        updateModules,
        updateConfig,
        isModuleEnabled,
        loading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error('useOrganization must be used within OrganizationProvider');
  return ctx;
}
