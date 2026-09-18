import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, Building2, Users, ScrollText, LogOut, ShieldCheck, Ticket, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Dashboard',     path: '/',             icon: LayoutDashboard, exact: true },
  { label: 'Organizations', path: '/organizations', icon: Building2 },
  { label: 'Admin Users',   path: '/admin-users',  icon: Users },
  { label: 'Coupons',       path: '/coupons',      icon: Ticket },
  { label: 'Billing',       path: '/billing',      icon: Receipt },
  { label: 'Audit Log',     path: '/audit',        icon: ScrollText },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="flex h-screen" style={{ background: '#cdd9c4' }}>

      {/* ── Icon-only sidebar ────────────────────────────── */}
      <aside
        className="w-[72px] shrink-0 flex flex-col items-center py-5 gap-3"
        style={{ background: '#141414', borderRadius: '0 0 0 0' }}
      >
        {/* Logo */}
        <div
          className="h-10 w-10 rounded-2xl flex items-center justify-center mb-4 shrink-0"
          style={{ background: '#c9f53c' }}
        >
          <ShieldCheck className="h-5 w-5" style={{ color: '#141414' }} />
        </div>

        {/* Nav */}
        <nav className="flex flex-col items-center gap-1.5 flex-1">
          {NAV.map((item) => (
            <div key={item.path} className="relative group">
              <NavLink
                to={item.path}
                end={item.exact}
                className={({ isActive }) => cn(
                  'h-10 w-10 rounded-2xl flex items-center justify-center transition-all',
                  isActive ? 'bg-white' : 'hover:bg-white/10',
                )}
              >
                {({ isActive }) => (
                  <item.icon
                    className="h-[18px] w-[18px]"
                    style={{ color: isActive ? '#141414' : 'rgba(255,255,255,0.35)' }}
                  />
                )}
              </NavLink>
              {/* Tooltip */}
              <div
                className="absolute left-[56px] top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap px-2.5 py-1.5 rounded-xl text-[12px] font-medium"
                style={{ background: '#141414', color: '#f0f0f0', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </nav>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="h-10 w-10 rounded-2xl flex items-center justify-center transition-colors mb-1 group relative"
          style={{ color: 'rgba(255,255,255,0.25)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut className="h-[16px] w-[16px]" />
          <div
            className="absolute left-[56px] top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap px-2.5 py-1.5 rounded-xl text-[12px] font-medium"
            style={{ background: '#141414', color: '#f0f0f0', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Sign out
          </div>
        </button>

        {/* Avatar */}
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: '#c9f53c' }}
          title={user?.name}
        >
          <span className="font-display font-bold text-[13px]" style={{ color: '#141414' }}>
            {initials}
          </span>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5">
        <div
          className="min-h-full rounded-3xl"
          style={{ background: '#e8f0e2', minHeight: 'calc(100vh - 40px)' }}
        >
          <div className="p-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
