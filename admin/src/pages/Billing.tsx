import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Receipt, CheckCircle2, Clock, AlertTriangle, Zap } from 'lucide-react';

interface Invoice {
  id: string; orgId: string; orgName: string; plan: string;
  baseAmount: number; discountCode?: string; discountAmount: number;
  finalAmount: number; status: string; billingPeriod: string;
  dueDate: string; paidDate?: string; createdAt: string;
}

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: '#a16207', bg: '#fef9c3', label: 'Pending' },
  paid:    { color: '#059669', bg: '#d1fae5', label: 'Paid' },
  overdue: { color: '#dc2626', bg: '#fee2e2', label: 'Overdue' },
};

export function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => { api.get<Invoice[]>('/billing').then(setInvoices); }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await api.post<{ generated: number; period: string }>('/billing/generate', {});
      toast({ title: `${res.generated} invoices generated for ${res.period}` });
      api.get<Invoice[]>('/billing').then(setInvoices);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally { setGenerating(false); }
  }

  async function handleMarkPaid(id: string) {
    await api.patch(`/billing/${id}/pay`, {});
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'paid', paidDate: new Date().toISOString() } : i));
    toast({ title: 'Invoice marked as paid' });
  }

  async function handleMarkOverdue(id: string) {
    await api.patch(`/billing/${id}/overdue`, {});
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'overdue' } : i));
    toast({ title: 'Invoice marked as overdue' });
  }

  const totalPending = invoices.filter(i => i.status === 'pending').reduce((a, i) => a + i.finalAmount, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((a, i) => a + i.finalAmount, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((a, i) => a + i.finalAmount, 0);

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display" style={{ fontSize: 44, fontWeight: 800, color: '#141414', letterSpacing: '-0.03em' }}>
            <span className="inline-flex items-center justify-center rounded-2xl mx-1 align-middle" style={{ background: '#c9f53c', width: 44, height: 44 }}>
              <Receipt className="h-5 w-5" style={{ color: '#141414' }} />
            </span>
            {' '}Billing
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: '#8a9080' }}>{invoices.length} invoices</p>
        </div>
        <button
          onClick={handleGenerate} disabled={generating}
          className="h-10 px-4 rounded-2xl flex items-center gap-2 text-[13px] font-semibold transition-colors"
          style={{ background: '#141414', color: '#fff' }}
        >
          <Zap className="h-4 w-4" /> {generating ? 'Generating…' : 'Generate Monthly Invoices'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending', amount: totalPending, color: '#a16207', bg: '#fef9c3', icon: Clock },
          { label: 'Paid', amount: totalPaid, color: '#059669', bg: '#d1fae5', icon: CheckCircle2 },
          { label: 'Overdue', amount: totalOverdue, color: '#dc2626', bg: '#fee2e2', icon: AlertTriangle },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-5 card-shadow" style={{ background: '#ffffff' }}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="h-4 w-4" style={{ color: s.color }} />
              <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#8a9080' }}>{s.label}</span>
            </div>
            <p className="text-[24px] font-bold" style={{ color: '#141414' }}>₹{s.amount.toLocaleString('en-IN')}</p>
          </div>
        ))}
      </div>

      {/* Invoice table */}
      <div className="rounded-3xl overflow-hidden card-shadow" style={{ background: '#ffffff' }}>
        <div className="grid px-5 py-2.5" style={{ gridTemplateColumns: '1.5fr 1fr 80px 90px 90px 90px 90px 120px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          {['Organization', 'Period', 'Plan', 'Base', 'Discount', 'Total', 'Status', ''].map((h, i) => (
            <span key={i} className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#a0a89a' }}>{h}</span>
          ))}
        </div>
        {invoices.map(inv => {
          const st = STATUS_STYLE[inv.status] ?? STATUS_STYLE.pending;
          return (
            <div key={inv.id} className="grid items-center px-5 py-3" style={{ gridTemplateColumns: '1.5fr 1fr 80px 90px 90px 90px 90px 120px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: '#141414' }}>{inv.orgName}</p>
                <p className="text-[11px] font-mono" style={{ color: '#a0a89a' }}>{inv.orgId.slice(0, 16)}</p>
              </div>
              <span className="text-[13px] font-mono" style={{ color: '#8a9080' }}>{inv.billingPeriod}</span>
              <span className="text-[12px] capitalize" style={{ color: '#8a9080' }}>{inv.plan}</span>
              <span className="text-[13px] font-mono" style={{ color: '#141414' }}>₹{inv.baseAmount}</span>
              <span className="text-[13px] font-mono" style={{ color: inv.discountAmount > 0 ? '#059669' : '#a0a89a' }}>
                {inv.discountAmount > 0 ? `-₹${inv.discountAmount}` : '—'}
              </span>
              <span className="text-[14px] font-bold font-mono" style={{ color: '#141414' }}>₹{inv.finalAmount}</span>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full text-center" style={{ color: st.color, background: st.bg }}>{st.label}</span>
              <div className="flex gap-1 justify-end">
                {inv.status === 'pending' && (
                  <>
                    <button onClick={() => handleMarkPaid(inv.id)} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: '#d1fae5', color: '#059669' }}>Paid</button>
                    <button onClick={() => handleMarkOverdue(inv.id)} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: '#fee2e2', color: '#dc2626' }}>Overdue</button>
                  </>
                )}
                {inv.status === 'overdue' && (
                  <button onClick={() => handleMarkPaid(inv.id)} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: '#d1fae5', color: '#059669' }}>Mark Paid</button>
                )}
              </div>
            </div>
          );
        })}
        {invoices.length === 0 && (
          <div className="py-16 text-center text-[14px]" style={{ color: '#a0a89a' }}>No invoices yet. Click "Generate Monthly Invoices" to create them.</div>
        )}
      </div>
    </div>
  );
}
