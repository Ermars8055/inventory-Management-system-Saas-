import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Plus, Ticket, ToggleLeft, ToggleRight } from 'lucide-react';

interface Coupon {
  id: string; code: string; discountType: string; discountValue: number;
  applicablePlans: string; maxUses: number; usesCount: number;
  validFrom: string | null; validUntil: string | null;
  isActive: boolean; createdAt: string;
}

const EMPTY = { code: '', discountType: 'percent', discountValue: '', applicablePlans: 'all', maxUses: '0', validFrom: '', validUntil: '' };

export function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { api.get<Coupon[]>('/coupons').then(setCoupons); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/coupons', {
        code: form.code,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue) || 0,
        applicablePlans: form.applicablePlans,
        maxUses: parseInt(form.maxUses) || 0,
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
      });
      toast({ title: `Coupon ${form.code.toUpperCase()} created` });
      setShowForm(false);
      setForm(EMPTY);
      api.get<Coupon[]>('/coupons').then(setCoupons);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally { setSaving(false); }
  }

  async function toggleActive(c: Coupon) {
    await api.put(`/coupons/${c.id}`, { isActive: !c.isActive });
    setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, isActive: !x.isActive } : x));
    toast({ title: `${c.code} ${c.isActive ? 'deactivated' : 'activated'}` });
  }

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display" style={{ fontSize: 44, fontWeight: 800, color: '#141414', letterSpacing: '-0.03em' }}>
            <span className="inline-flex items-center justify-center rounded-2xl mx-1 align-middle" style={{ background: '#c9f53c', width: 44, height: 44 }}>
              <Ticket className="h-5 w-5" style={{ color: '#141414' }} />
            </span>
            {' '}Coupons
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: '#8a9080' }}>{coupons.length} coupons</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="h-10 px-4 rounded-2xl flex items-center gap-2 text-[13px] font-semibold transition-colors"
          style={{ background: '#141414', color: '#fff' }}
        >
          <Plus className="h-4 w-4" /> Create Coupon
        </button>
      </div>

      {showForm && (
        <div className="rounded-3xl p-6 mb-6 card-shadow" style={{ background: '#ffffff' }}>
          <form onSubmit={handleCreate} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#8a9080' }}>Code</label>
              <input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. WELCOME20" className="w-full h-10 px-3 rounded-xl border text-[14px] outline-none" style={{ borderColor: 'rgba(0,0,0,0.1)' }} />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#8a9080' }}>Type</label>
              <select value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border text-[14px] outline-none" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                <option value="percent">Percentage (%)</option>
                <option value="flat">Flat (₹)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#8a9080' }}>Value</label>
              <input required type="number" step="0.01" value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })}
                placeholder={form.discountType === 'percent' ? 'e.g. 20' : 'e.g. 500'} className="w-full h-10 px-3 rounded-xl border text-[14px] outline-none" style={{ borderColor: 'rgba(0,0,0,0.1)' }} />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#8a9080' }}>Plans</label>
              <input value={form.applicablePlans} onChange={e => setForm({ ...form, applicablePlans: e.target.value })}
                placeholder="all or starter,professional" className="w-full h-10 px-3 rounded-xl border text-[14px] outline-none" style={{ borderColor: 'rgba(0,0,0,0.1)' }} />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#8a9080' }}>Max Uses (0=unlimited)</label>
              <input type="number" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border text-[14px] outline-none" style={{ borderColor: 'rgba(0,0,0,0.1)' }} />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#8a9080' }}>Valid From</label>
              <input type="date" value={form.validFrom} onChange={e => setForm({ ...form, validFrom: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border text-[14px] outline-none" style={{ borderColor: 'rgba(0,0,0,0.1)' }} />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: '#8a9080' }}>Valid Until</label>
              <input type="date" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border text-[14px] outline-none" style={{ borderColor: 'rgba(0,0,0,0.1)' }} />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={saving} className="h-10 px-6 rounded-xl text-[13px] font-semibold" style={{ background: '#c9f53c', color: '#141414' }}>
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="rounded-3xl overflow-hidden card-shadow" style={{ background: '#ffffff' }}>
        <div className="grid px-5 py-2.5" style={{ gridTemplateColumns: '1fr 100px 100px 120px 80px 80px 100px 60px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          {['Code', 'Type', 'Value', 'Plans', 'Max', 'Used', 'Expires', ''].map((h, i) => (
            <span key={i} className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#a0a89a' }}>{h}</span>
          ))}
        </div>
        {coupons.map(c => (
          <div key={c.id} className="grid items-center px-5 py-3.5" style={{ gridTemplateColumns: '1fr 100px 100px 120px 80px 80px 100px 60px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
            <span className="font-mono font-bold text-[14px]" style={{ color: c.isActive ? '#141414' : '#a0a89a' }}>{c.code}</span>
            <span className="text-[13px] capitalize" style={{ color: '#8a9080' }}>{c.discountType}</span>
            <span className="text-[14px] font-semibold" style={{ color: '#141414' }}>
              {c.discountType === 'percent' ? `${c.discountValue}%` : `₹${c.discountValue}`}
            </span>
            <span className="text-[12px]" style={{ color: '#8a9080' }}>{c.applicablePlans}</span>
            <span className="text-[13px] font-mono" style={{ color: '#8a9080' }}>{c.maxUses || '∞'}</span>
            <span className="text-[13px] font-mono font-semibold" style={{ color: '#141414' }}>{c.usesCount}</span>
            <span className="text-[12px] font-mono" style={{ color: '#a0a89a' }}>{c.validUntil?.slice(0, 10) || '—'}</span>
            <button onClick={() => toggleActive(c)} title={c.isActive ? 'Deactivate' : 'Activate'}>
              {c.isActive
                ? <ToggleRight className="h-5 w-5" style={{ color: '#10b981' }} />
                : <ToggleLeft className="h-5 w-5" style={{ color: '#a0a89a' }} />}
            </button>
          </div>
        ))}
        {coupons.length === 0 && (
          <div className="py-16 text-center text-[14px]" style={{ color: '#a0a89a' }}>No coupons yet</div>
        )}
      </div>
    </div>
  );
}
