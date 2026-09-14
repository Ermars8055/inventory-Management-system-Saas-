import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, UserX, Users } from 'lucide-react';

interface AdminUser { id: string; name: string; email: string; role: string; isActive: boolean; lastLogin: string }

const ROLE_STYLE: Record<string, { color: string; bg: string }> = {
  super_admin:   { color: '#be123c', bg: '#fff1f2' },
  support:       { color: '#0891b2', bg: '#e0f2fe' },
  billing_admin: { color: '#15803d', bg: '#dcfce7' },
};

const inp: React.CSSProperties = {
  width: '100%', background: '#f4f7f2', border: '2px solid transparent',
  color: '#141414', borderRadius: 16, padding: '10px 16px', fontSize: 14, outline: 'none',
};

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'support' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = () => api.get<AdminUser[]>('/admin-users').then(setUsers);
  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin-users', form);
      await load();
      setShowAdd(false);
      setForm({ name: '', email: '', password: '', role: 'support' });
      toast({ title: 'Admin user created' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally { setSaving(false); }
  }

  async function handleDeactivate(id: string) {
    await api.patch(`/admin-users/${id}/deactivate`, {});
    await load();
    toast({ title: 'User deactivated' });
  }

  return (
    <div className="h-full">
      {/* Heading */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1
            className="font-display leading-tight"
            style={{ fontSize: 44, fontWeight: 800, color: '#141414', letterSpacing: '-0.03em' }}
          >
            Admin{' '}
            <span
              className="inline-flex items-center justify-center rounded-2xl mx-1 align-middle"
              style={{ background: '#141414', width: 44, height: 44 }}
            >
              <Users className="h-5 w-5" style={{ color: '#c9f53c' }} />
            </span>
            {' '}Users
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: '#8a9080' }}>{users.length} admins with platform access</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[14px] font-semibold transition-all"
          style={{ background: '#141414', color: '#c9f53c' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#2a2a2a')}
          onMouseLeave={e => (e.currentTarget.style.background = '#141414')}
        >
          <Plus className="h-4 w-4" /> Add Admin
        </button>
      </div>

      {/* Table card */}
      <div className="rounded-3xl overflow-hidden card-shadow" style={{ background: '#ffffff' }}>
        {/* Header */}
        <div
          className="grid px-5 py-3"
          style={{
            gridTemplateColumns: '1.5fr 2fr 1fr 100px 1.5fr 44px',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          {['Name', 'Email', 'Role', 'Status', 'Last Login', ''].map((h, i) => (
            <span key={i} className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#a0a89a' }}>{h}</span>
          ))}
        </div>

        {users.map(u => {
          const role = ROLE_STYLE[u.role] ?? { color: '#6b7280', bg: '#f3f4f6' };
          return (
            <div
              key={u.id}
              className="grid items-center px-5 py-4 transition-colors"
              style={{ gridTemplateColumns: '1.5fr 2fr 1fr 100px 1.5fr 44px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8faf7')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span className="text-[14px] font-semibold" style={{ color: '#141414' }}>{u.name}</span>
              <span className="text-[13px] font-mono" style={{ color: '#8a9080' }}>{u.email}</span>
              <span>
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ color: role.color, background: role.bg }}
                >
                  {u.role}
                </span>
              </span>
              <span>
                <span className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ background: u.isActive ? '#22c55e' : '#d1d5db' }} />
                  <span className="text-[13px]" style={{ color: u.isActive ? '#15803d' : '#9ca3af' }}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </span>
              </span>
              <span className="text-[12px] font-mono" style={{ color: '#a0a89a' }}>{u.lastLogin?.slice(0, 16) ?? '—'}</span>
              <span>
                {u.isActive && (
                  <button
                    onClick={() => handleDeactivate(u.id)}
                    className="h-8 w-8 flex items-center justify-center rounded-xl transition-colors"
                    style={{ color: '#a0a89a' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fff1f2'; (e.currentTarget as HTMLElement).style.color = '#be123c'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#a0a89a'; }}
                  >
                    <UserX className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent style={{ background: '#ffffff', borderRadius: 24, border: 'none', boxShadow: '0 24px 48px rgba(0,0,0,0.12)', color: '#141414' }}>
          <DialogHeader>
            <DialogTitle className="font-display" style={{ fontSize: 20, fontWeight: 800, color: '#141414', letterSpacing: '-0.02em' }}>
              Add Admin User
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 py-2">
            {[
              { label: 'Full Name', key: 'name' as const, type: 'text' },
              { label: 'Email', key: 'email' as const, type: 'email' },
              { label: 'Password', key: 'password' as const, type: 'password' },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#a0a89a' }}>{f.label}</label>
                <input
                  required type={f.type} value={form[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={inp}
                  onFocus={e => (e.currentTarget.style.borderColor = '#c9f53c')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#a0a89a' }}>Role</label>
              <select
                value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                style={{ ...inp, cursor: 'pointer' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#c9f53c')}
                onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
              >
                <option value="support">Support</option>
                <option value="billing_admin">Billing Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <DialogFooter className="pt-2 gap-2">
              <button
                type="button" onClick={() => setShowAdd(false)}
                className="px-5 py-2.5 rounded-2xl text-[13px] font-semibold"
                style={{ background: '#f4f7f2', color: '#8a9080' }}
              >
                Cancel
              </button>
              <button
                type="submit" disabled={saving}
                className="px-5 py-2.5 rounded-2xl text-[13px] font-semibold"
                style={{ background: '#141414', color: '#c9f53c', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Creating…' : 'Create Admin'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
