import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check, Plus, Building2 } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { INDUSTRY_LABELS } from '@/data/modules';
import { cn } from '@/lib/utils';

export function OrgSwitcher() {
  const { organizations, currentOrg, setCurrentOrgId } = useOrganization();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (id: string) => {
    setCurrentOrgId(id);
    setOpen(false);
    navigate('/dashboard');
  };

  if (!currentOrg) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-muted transition-colors text-left"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
          {currentOrg.logoText || currentOrg.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{currentOrg.name}</p>
          <p className="text-xs text-muted-foreground">{INDUSTRY_LABELS[currentOrg.industry]}</p>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border bg-popover shadow-lg overflow-hidden">
          <div className="p-2">
            <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Organizations</p>
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSelect(org.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md p-2 hover:bg-accent transition-colors text-left',
                  org.id === currentOrg.id && 'bg-accent',
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground text-xs font-bold">
                  {org.logoText || org.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{org.name}</p>
                  <p className="text-xs text-muted-foreground">{INDUSTRY_LABELS[org.industry]}</p>
                </div>
                {org.id === currentOrg.id && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
          <div className="border-t">
            <button
              onClick={() => { setOpen(false); navigate('/organizations/new'); }}
              className="flex w-full items-center gap-2 p-3 text-sm font-medium text-primary hover:bg-accent transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Organization
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { Building2 };
