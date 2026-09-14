import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { getNavSections } from '@/config/navigation';
import { OrgSwitcher } from './OrgSwitcher';
import { cn } from '@/lib/utils';
import { X, LogOut } from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { isModuleEnabled, currentOrg } = useOrganization();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }
  const navSections = getNavSections(currentOrg?.config);

  const isVisible = (item: ReturnType<typeof getNavSections>[0]['items'][0]) => {
    if (!item.module) return true;
    return isModuleEnabled(item.module);
  };

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(isVisible),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 h-screen w-64 shrink-0 border-r bg-sidebar flex flex-col transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-4 h-14 border-b">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 7l9-4 9 4M3 7v10l9 4 9-4V7M3 7l9 4 9-4M12 11v10" />
              </svg>
            </div>
            <span className="font-bold text-sm tracking-tight">StockPilot</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-muted rounded-md">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Org switcher */}
        <div className="p-3 border-b">
          <OrgSwitcher />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {visibleSections.map((section, idx) => (
            <div key={idx}>
              {section.title && (
                <p className="px-2 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path ||
                    (item.path !== '/dashboard' && item.path !== '/settings' && location.pathname.startsWith(item.path));
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/dashboard' || item.path === '/settings'}
                      onClick={onClose}
                      className={({ isActive: navActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                          navActive || isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t p-3 space-y-1">
          {user && (
            <div className="px-2 py-1 text-xs text-muted-foreground truncate">
              <span className="font-medium text-foreground">{user.name}</span>
              <span className="ml-1 capitalize">· {user.role.replace('_', ' ')}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
