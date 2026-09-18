import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, Package, MessageCircle, CreditCard, Info } from 'lucide-react';
import { api } from '@/lib/api';

interface Notif {
  id: string; type: string; title: string; message: string; read: boolean; createdAt: string;
}

const TYPE_ICON: Record<string, typeof Package> = {
  low_stock: Package,
  ticket_reply: MessageCircle,
  invoice_due: CreditCard,
  general: Info,
};

// Inline notification sound (short beep generated via Web Audio API)
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const prevUnread = useRef(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(() => {
    api.get<Notif[]>('/notifications?limit=20').then(setNotifs).catch(() => {});
    api.get<{ count: number }>('/notifications/unread-count').then(r => {
      setUnread(r.count);
      // Play sound if new notifications arrived
      if (r.count > prevUnread.current && prevUnread.current >= 0) {
        playNotificationSound();
      }
      prevUnread.current = r.count;
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleMarkRead(id: string) {
    await api.patch(`/notifications/${id}/read`, {});
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  }

  async function handleMarkAllRead() {
    await api.patch('/notifications/read-all', {});
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifs(); }}
        className="relative h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl border shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unread > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No notifications</div>
            ) : (
              notifs.map(n => {
                const Icon = TYPE_ICON[n.type] ?? Info;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? 'font-medium' : 'text-muted-foreground'}`}>{n.title}</p>
                      {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{n.createdAt?.slice(0, 16).replace('T', ' ')}</p>
                    </div>
                    {!n.read && (
                      <button onClick={() => handleMarkRead(n.id)} className="shrink-0 mt-1" title="Mark read">
                        <Check className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
