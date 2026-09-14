import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { ArrowLeft, LogIn, ShieldOff, ShieldCheck, Users, Package, UserCheck, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrgDetail {
  id: string; name: string; industry: string; plan: string;
  created_at: string; email: string; address: string;
  user_count: number; item_count: number; recipient_count: number; assignment_count: number;
  enabled_modules: string[];
}

const PLANS = ['starter', 'professional', 'enterprise'];
const PLAN_STYLE: Record<string, { color: string; bg: string }> = {
  starter:      { color: '#6366f1', bg: '#ede9fe' },
  professional: { color: '#0891b2', bg: '#e0f2fe' },
  enterprise:   { color: '#b45309', bg: '#fef3c7' },
};

export function OrgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [suspended, setSuspended] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<OrgDetail>(`/organizations/${id}`).then(setOrg);
  }, [id]);

  async function handlePlan(plan: string) {
    if (!id) return;
    setPlanSaving(true);
    try {
      await api.patch(`/organizations/${id}/plan`, { plan });
      setOrg(o => o ? { ...o, plan } : o);
      toast({ title: `Plan updated to ${plan}` });
    } finally { setPlanSaving(false); }
  }

  async function handleSuspend() {
    if (!id) return;
    const newStatus = suspended ? 'active' : 'suspended';
    await api.patch(`/organizations/${id}/status`, { status: newStatus });
    setSuspended(!suspended);
    toast({ title: `Organization ${newStatus}` });
  }

  async function handleImpersonate() {
    if (!id || !org) return;
    try {
      const res = await api.post<{ access_token: string }>(`/organizations/${id}/impersonate`, {});
      window.open(`http://localhost:5173?impersonate=${res.access_token}`, '_blank');
      toast({ title: `Impersonating ${org.name}` });
    } catch (e: unknown) {
      toast({ title: 'Failed', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' });
    }
  }

  if (!org) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[14px]" style={{ color: '#8a9080' }}>Loading…</div>
      </div>
    );
  }

  const stats = [
    { label: 'Users',       value: org.user_count,      icon: Users,         accent: false },
    { label: 'Items',       value: org.item_count,       icon: Package,       accent: true  },
    { label: 'Recipients',  value: org.recipient_count,  icon: UserCheck,     accent: false },
    { label: 'Assignments', value: org.assignment_count, icon: ClipboardList, accent: false },
  ];

  return (
    <div className="h-full">
      {/* Back */}
      <button
        onClick={() => navigate('/organizations')}
        className="flex items-center gap-1.5 text-[13px] font-medium mb-6 transition-colors"
        style={{ color: '#8a9080' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#141414')}
        onMouseLeave={e => (e.currentTarget.style.color = '#8a9080')}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      {/* Heading */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1
            className="font-display leading-tight"
            style={{ fontSize: 38, fontWeight: 800, color: '#141414', letterSpacing: '-0.03em' }}
          >
            {org.name}
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: '#8a9080' }}>
            <span className="capitalize">{org.industry}</span>
            <span className="mx-2">·</span>
            {org.email}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleImpersonate}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[13px] font-semibold transition-all"
            style={{ background: '#fef9c3', color: '#a16207', border: '1.5px solid #fde68a' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fef08a')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fef9c3')}
          >
            <LogIn className="h-3.5 w-3.5" /> Impersonate
          </button>
          <button
            onClick={handleSuspend}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[13px] font-semibold transition-all"
            style={suspended
              ? { background: '#dcfce7', color: '#15803d', border: '1.5px solid #bbf7d0' }
              : { background: '#fff1f2', color: '#be123c', border: '1.5px solid #fecdd3' }
            }
          >
            {suspended ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
            {suspended ? 'Activate' : 'Suspend'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {stats.map(s => (
            <div
              key={s.label}
              className="rounded-3xl p-5 card-shadow"
              style={{ background: s.accent ? '#c9f53c' : '#ffffff' }}
            >
              <s.icon className="h-4 w-4 mb-4" style={{ color: s.accent ? '#5a7a00' : '#a0a89a' }} />
              <p className="stat-num" style={{ fontSize: 40, color: '#141414', lineHeight: 1 }}>{s.value}</p>
              <p className="text-[12px] mt-2" style={{ color: s.accent ? '#5a7a00' : '#8a9080' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Plan + Modules row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Plan */}
          <div className="rounded-3xl p-5 card-shadow" style={{ background: '#ffffff' }}>
            <p className="text-[12px] font-semibold uppercase tracking-widest mb-4" style={{ color: '#a0a89a' }}>
              Subscription Plan
            </p>
            <div className="flex flex-wrap gap-2">
              {PLANS.map(p => {
                const isActive = org.plan === p;
                const s = PLAN_STYLE[p] ?? { color: '#6b7280', bg: '#f3f4f6' };
                return (
                  <button
                    key={p}
                    onClick={() => handlePlan(p)}
                    disabled={planSaving}
                    className="px-4 py-2 rounded-2xl text-[13px] font-semibold capitalize transition-all"
                    style={isActive
                      ? { background: s.bg, color: s.color, border: `1.5px solid ${s.color}40` }
                      : { background: '#f4f7f2', color: '#8a9080', border: '1.5px solid transparent' }
                    }
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modules */}
          <div className="rounded-3xl p-5 card-shadow" style={{ background: '#ffffff' }}>
            <p className="text-[12px] font-semibold uppercase tracking-widest mb-4" style={{ color: '#a0a89a' }}>
              Enabled Modules
            </p>
            <div className="flex flex-wrap gap-2">
              {(org.enabled_modules ?? []).map(m => (
                <span
                  key={m}
                  className="text-[12px] font-mono px-2.5 py-1 rounded-xl"
                  style={{ background: '#f4f7f2', color: '#6a7a62', border: '1px solid rgba(0,0,0,0.06)' }}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
