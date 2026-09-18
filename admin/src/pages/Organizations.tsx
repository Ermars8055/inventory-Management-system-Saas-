import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Eye, LogIn, Search, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Org {
  id: string; name: string; industry: string; plan: string;
  created_at: string; email: string;
  user_count: number; item_count: number; recipient_count: number; assignment_count: number;
  vendor_count: number;
  onboarding: { completed: number; total: number; percent: number };
}

const PLAN_STYLE: Record<string, { color: string; bg: string }> = {
  starter:      { color: '#6366f1', bg: '#ede9fe' },
  professional: { color: '#0891b2', bg: '#e0f2fe' },
  enterprise:   { color: '#b45309', bg: '#fef3c7' },
};

export function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => { api.get<Org[]>('/organizations').then(setOrgs); }, []);

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.industry.toLowerCase().includes(search.toLowerCase())
  );

  async function handleImpersonate(orgId: string, orgName: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const res = await api.post<{ access_token: string }>(`/organizations/${orgId}/impersonate`, {});
      const tenantUrl = import.meta.env.VITE_TENANT_URL || 'http://localhost:8060';
      window.open(`${tenantUrl}/dashboard?admin_token=${res.access_token}`, '_blank');
      toast({ title: `Impersonating ${orgName}` });
    } catch (err: unknown) {
      toast({ title: 'Failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    }
  }

  return (
    <div className="h-full">
      {/* Heading */}
      <div className="mb-8">
        <h1
          className="font-display leading-tight"
          style={{ fontSize: 44, fontWeight: 800, color: '#141414', letterSpacing: '-0.03em' }}
        >
          Your{' '}
          <span
            className="inline-flex items-center justify-center rounded-2xl mx-1 align-middle"
            style={{ background: '#c9f53c', width: 44, height: 44 }}
          >
            <Building2 className="h-5 w-5" style={{ color: '#141414' }} />
          </span>
          {' '}Tenants
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: '#8a9080' }}>
          {orgs.length} organizations on the platform
        </p>
      </div>

      {/* Search + Table card */}
      <div className="rounded-3xl overflow-hidden card-shadow" style={{ background: '#ffffff' }}>
        {/* Search bar inside card */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-b"
          style={{ borderColor: 'rgba(0,0,0,0.06)' }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: '#a0a89a' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search organizations…"
            className="flex-1 outline-none bg-transparent text-[14px]"
            style={{ color: '#141414' }}
          />
          <span className="text-[12px] font-mono px-2 py-1 rounded-lg" style={{ background: '#f4f7f2', color: '#8a9080' }}>
            {filtered.length} results
          </span>
        </div>

        {/* Column headers */}
        <div
          className="grid px-5 py-2.5"
          style={{
            gridTemplateColumns: '2fr 1fr 1fr 80px 64px 64px 64px 64px 100px 72px',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          {['Name', 'Industry', 'Plan', 'Setup', 'Users', 'Items', 'Recip.', 'Issues', 'Created', ''].map((h, i) => (
            <span
              key={i}
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: '#a0a89a', textAlign: i >= 3 && i <= 6 ? 'right' : 'left' }}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {filtered.map(org => {
          const plan = PLAN_STYLE[org.plan] ?? { color: '#6b7280', bg: '#f3f4f6' };
          return (
            <div
              key={org.id}
              className="grid items-center px-5 py-3.5 cursor-pointer transition-colors"
              style={{
                gridTemplateColumns: '2fr 1fr 1fr 80px 64px 64px 64px 64px 100px 72px',
                borderBottom: '1px solid rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8faf7')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => navigate(`/organizations/${org.id}`)}
            >
              <div>
                <p className="text-[14px] font-semibold" style={{ color: '#141414' }}>{org.name}</p>
                <p className="text-[11px] font-mono mt-0.5" style={{ color: '#c0c8b8' }}>{org.email}</p>
              </div>
              <span className="text-[13px] capitalize" style={{ color: '#8a9080' }}>{org.industry}</span>
              <span>
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize"
                  style={{ color: plan.color, background: plan.bg }}
                >
                  {org.plan}
                </span>
              </span>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden" style={{ maxWidth: 40 }}>
                  <div className="h-full rounded-full" style={{ width: `${org.onboarding?.percent ?? 0}%`, background: (org.onboarding?.percent ?? 0) === 100 ? '#10b981' : '#f59e0b' }} />
                </div>
                <span className="text-[11px] font-mono font-semibold" style={{ color: (org.onboarding?.percent ?? 0) === 100 ? '#059669' : '#a16207' }}>{org.onboarding?.percent ?? 0}%</span>
              </div>
              {[org.user_count, org.item_count, org.recipient_count, org.assignment_count].map((v, i) => (
                <span
                  key={i}
                  className="text-[13px] font-mono font-semibold"
                  style={{ color: '#141414', textAlign: 'right', display: 'block' }}
                >
                  {v}
                </span>
              ))}
              <span className="text-[12px] font-mono" style={{ color: '#a0a89a' }}>{org.created_at?.slice(0, 10)}</span>
              <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => navigate(`/organizations/${org.id}`)}
                  className="h-7 w-7 flex items-center justify-center rounded-xl transition-colors"
                  style={{ color: '#a0a89a' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f4f7f2'; (e.currentTarget as HTMLElement).style.color = '#141414'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#a0a89a'; }}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => handleImpersonate(org.id, org.name, e)}
                  className="h-7 w-7 flex items-center justify-center rounded-xl transition-colors"
                  style={{ color: '#a0a89a' }}
                  title="Impersonate"
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fef9c3'; (e.currentTarget as HTMLElement).style.color = '#a16207'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#a0a89a'; }}
                >
                  <LogIn className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-16 text-center text-[14px]" style={{ color: '#a0a89a' }}>No organizations found</div>
        )}
      </div>
    </div>
  );
}
