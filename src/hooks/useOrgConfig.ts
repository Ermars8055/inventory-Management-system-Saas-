import { useOrganization } from '@/context/OrganizationContext';
import { DEFAULT_ORG_CONFIG, type OrgConfig } from '@/types';

/**
 * Returns the current org's configuration with defaults filled in.
 * Use this instead of hardcoding labels like "Student", "Roll Number", "Class", etc.
 *
 * Examples by org type:
 *   School    → recipientLabel="Student",  identifierLabel="Roll Number", groupLabel="Class"
 *   Hospital  → recipientLabel="Patient",  identifierLabel="Patient ID",  groupLabel="Ward"
 *   Warehouse → recipientLabel="Employee", identifierLabel="Employee ID", groupLabel="Department"
 *   Library   → recipientLabel="Member",   identifierLabel="Member ID",   groupLabel="Branch"
 */
export function useOrgConfig(): OrgConfig {
  const { currentOrg } = useOrganization();
  if (!currentOrg?.config) return DEFAULT_ORG_CONFIG;
  return { ...DEFAULT_ORG_CONFIG, ...currentOrg.config };
}
