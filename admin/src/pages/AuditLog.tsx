import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ScrollText } from 'lucide-react';

interface Log { id: string; adminEmail: string; action: string; targetType: string; targetId: string; detail: string; createdAt: string }

const ACTION_STYLE: Record<string, { color: string; bg: string }> = {
  impersonate:       { color: '#a16207', bg: '#fef9c3' },
  suspend_org:       { color: '#be123c', bg: '#fff1f2' },
  activate_org:      { color: '#15803d', bg: '#dcfce7' },
  update_plan:       { color: '#0891b2', bg: '#e0f2fe' },
  create_admin_user: { color: '#6d28d9', bg: '#ede9fe' },
};

export function AuditLogPage() {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => { api.get<Log[]>('/audit').then(setLogs); }, []);

  return (
    <div className="h-full">
      {/* Heading */}
      <div className="mb-8">
        <h1
          className="font-display leading-tight"
          style={{ fontSize: 44, fontWeight: 800, color: '#141414', letterSpacing: '-0.03em' }}
        >
          Admin{' '}
          <span
            className="inline-flex items-center justify-center rounded-2xl mx-1 align-middle"
            style={{ background: '#c9f53c', width: 44, height: 44 }}
          >
            <ScrollText className="h-5 w-5" style={{ color: '#141414' }} />
          </span>
          {' '}Activity
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: '#8a9080' }}>Last {logs.length} admin actions across the platform</p>
      </div>

      {/* Table card */}
      <div className="rounded-3xl overflow-hidden card-shadow" style={{ background: '#ffffff' }}>
        {/* Header */}
        <div
          className="grid px-5 py-3"
          style={{
            gridTemplateColumns: '130px 1.5fr 1fr 1fr 2fr',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          {['Time', 'Admin', 'Action', 'Target', 'Detail'].map(h => (
            <span key={h} className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#a0a89a' }}>{h}</span>
          ))}
        </div>

        {logs.length === 0 ? (
          <div className="py-20 text-center text-[14px]" style={{ color: '#a0a89a' }}>No audit events yet</div>
        ) : logs.map(l => {
          const s = ACTION_STYLE[l.action] ?? { color: '#6b7280', bg: '#f3f4f6' };
          return (
            <div
              key={l.id}
              className="grid items-center px-5 py-3.5 transition-colors"
              style={{ gridTemplateColumns: '130px 1.5fr 1fr 1fr 2fr', borderBottom: '1px solid rgba(0,0,0,0.04)' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8faf7')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span className="text-[12px] font-mono" style={{ color: '#a0a89a' }}>{l.createdAt?.slice(0, 16)}</span>
              <span className="text-[13px] font-mono truncate" style={{ color: '#8a9080' }}>{l.adminEmail}</span>
              <span>
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full font-mono"
                  style={{ color: s.color, background: s.bg }}
                >
                  {l.action}
                </span>
              </span>
              <span className="text-[12px] font-mono" style={{ color: '#8a9080' }}>
                {l.targetType} <span style={{ color: '#c0c8b8' }}>{l.targetId?.slice(0, 8)}</span>
              </span>
              <span className="text-[13px] truncate" style={{ color: '#8a9080' }}>
                {l.detail || <span style={{ color: '#d0d8c8' }}>—</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
