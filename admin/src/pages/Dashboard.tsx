import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Building2, Package, Users, Activity, ArrowUpRight } from 'lucide-react';

interface Stats {
  totalOrgs: number; totalItems: number; totalRecipients: number;
  totalAssignments: number; activeAssignments: number;
  planBreakdown: { plan: string; count: number }[];
  industryBreakdown: { industry: string; count: number }[];
}

// ── Pill progress bar ─────────────────────────────────────────────────────────
function PillBar({ value, max, dark = true }: { value: number; max: number; dark?: boolean }) {
  const TOTAL = 8;
  const filled = Math.min(TOTAL, Math.round((value / Math.max(max, 1)) * TOTAL));
  return (
    <div className="flex gap-1.5 mt-3">
      {Array.from({ length: TOTAL }).map((_, i) => (
        <div
          key={i}
          className="pill-bar flex-1"
          style={{ background: i < filled ? (dark ? '#141414' : '#c9f53c') : 'rgba(0,0,0,0.09)' }}
        />
      ))}
    </div>
  );
}

// ── Bar chart (interactive, single-series) ────────────────────────────────────
const PLAN_COLORS: Record<string, string> = {
  starter:      '#818cf8',
  professional: '#38bdf8',
  enterprise:   '#f59e0b',
};

function BarChart({ data }: { data: { label: string; count: number; color: string }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const H = 130;
  const BW = 52;
  const GAP = 32;
  const PADX = 32;
  const W = Math.max(data.length * (BW + GAP) - GAP + PADX * 2, 280);
  const SVGH = H + 44;
  const r = BW / 2;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        width="100%" height={SVGH}
        viewBox={`0 0 ${W} ${SVGH}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Dashed grid lines */}
        {[0.33, 0.66, 1].map(t => (
          <line key={t} x1={0} y1={H - t * H} x2={W} y2={H - t * H}
            stroke="rgba(0,0,0,0.06)" strokeWidth={1} strokeDasharray="4 4" />
        ))}

        {data.map((d, i) => {
          const x = PADX + i * (BW + GAP);
          const barH = Math.max(12, (d.count / maxVal) * H);
          const isH = hovered === i;
          return (
            <g key={d.label}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'default' }}
            >
              {/* Hover hit area */}
              <rect x={x - 8} y={0} width={BW + 16} height={H + 10} fill="transparent" />
              {/* Background track */}
              <rect x={x} y={0} width={BW} height={H} rx={r} ry={r}
                fill={isH ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.03)'} />
              {/* Bar */}
              <rect x={x} y={H - barH} width={BW} height={barH} rx={r} ry={r}
                fill={isH ? '#141414' : d.color}
                style={{ transition: 'fill 0.15s ease' }} />
              {/* Count above bar */}
              <text x={x + BW / 2} y={H - barH - 8} textAnchor="middle"
                fontSize="13" fontFamily="Inter" fontWeight="700"
                fill={isH ? '#141414' : '#6b7280'}
                style={{ transition: 'fill 0.1s' }}>
                {d.count}
              </text>
              {/* Label */}
              <text x={x + BW / 2} y={H + 28} textAnchor="middle"
                fontSize="12" fontFamily="Inter" fontWeight="500"
                fill={isH ? '#141414' : '#8a9080'}
                style={{ transition: 'fill 0.1s' }}>
                {d.label}
              </text>
            </g>
          );
        })}
        {/* Baseline */}
        <line x1={0} y1={H} x2={W} y2={H} stroke="rgba(0,0,0,0.08)" strokeWidth={1} />
      </svg>

      {/* Tooltip */}
      {hovered !== null && (() => {
        const d = data[hovered];
        const barH = Math.max(12, (d.count / maxVal) * H);
        const x = PADX + hovered * (BW + GAP) + BW / 2;
        const pct = Math.round((x / W) * 100);
        return (
          <div style={{
            position: 'absolute',
            top: H - barH - 46,
            left: `${pct}%`,
            transform: 'translateX(-50%)',
            background: '#141414',
            color: '#fff',
            padding: '5px 12px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}>
            {d.count} org{d.count !== 1 ? 's' : ''} on {d.label.toLowerCase()}
          </div>
        );
      })()}
    </div>
  );
}

// ── Inline heading badge ──────────────────────────────────────────────────────
function Badge({ icon: Icon, bg = '#c9f53c' }: { icon: React.ElementType; bg?: string }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-2xl mx-1 align-middle shrink-0"
      style={{ background: bg, width: 44, height: 44 }}
    >
      <Icon className="h-5 w-5" style={{ color: bg === '#c9f53c' ? '#141414' : 'white' }} />
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => { api.get<Stats>('/stats').then(setStats); }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[14px]" style={{ color: '#8a9080' }}>Loading…</div>
      </div>
    );
  }

  const totalOrgs = Math.max(stats.totalOrgs, 1);
  const totalItems = Math.max(stats.totalItems, 1);

  const chartData = stats.planBreakdown.map(p => ({
    label: p.plan.charAt(0).toUpperCase() + p.plan.slice(1),
    count: p.count,
    color: PLAN_COLORS[p.plan] ?? '#c9f53c',
  }));

  return (
    <div>
      {/* ── Large display heading ── */}
      <div className="mb-8">
        <h1
          className="font-display leading-[1.1]"
          style={{ fontSize: 48, fontWeight: 800, color: '#141414', letterSpacing: '-0.03em' }}
        >
          Monitoring{' '}
          <Badge icon={Building2} />
          {' '}Your Tenants
        </h1>
        <h1
          className="font-display leading-[1.1]"
          style={{ fontSize: 48, fontWeight: 800, color: '#141414', letterSpacing: '-0.03em' }}
        >
          and{' '}
          <Badge icon={Activity} bg="#141414" />
          {' '}Operations
        </h1>
        <p className="mt-3 text-[14px]" style={{ color: '#8a9080' }}>
          Welcome back, {user?.name?.split(' ')[0]} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex gap-5 items-start">

        {/* Left (main content) */}
        <div className="flex-1 space-y-4 min-w-0">

          {/* Stat cards row */}
          <div className="grid grid-cols-3 gap-4">

            {/* Orgs card (white) */}
            <div className="rounded-3xl p-5 card-shadow" style={{ background: '#ffffff' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-semibold" style={{ color: '#8a9080' }}>Organizations</span>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#f0f7ea', color: '#5a7a4a' }}
                >
                  Active
                </span>
              </div>
              <p className="stat-num" style={{ fontSize: 52, color: '#141414', lineHeight: 1 }}>
                {stats.totalOrgs}
              </p>
              <p className="text-[12px] mt-1" style={{ color: '#a0a89a' }}>/ {totalOrgs} registered</p>
              <PillBar value={stats.totalOrgs} max={Math.max(stats.totalOrgs, 10)} dark />
            </div>

            {/* Active issues card (LIME) */}
            <div className="rounded-3xl p-5 card-shadow" style={{ background: '#c9f53c' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-semibold" style={{ color: '#5a7a00' }}>Active Issues</span>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.1)', color: '#141414' }}
                >
                  Live
                </span>
              </div>
              <p className="stat-num" style={{ fontSize: 52, color: '#141414', lineHeight: 1 }}>
                {stats.activeAssignments}
              </p>
              <p className="text-[12px] mt-1" style={{ color: '#6a8a00' }}>/ {stats.totalAssignments} total</p>
              <PillBar value={stats.activeAssignments} max={Math.max(stats.totalAssignments, 1)} dark={false} />
            </div>

            {/* Items card (white) */}
            <div className="rounded-3xl p-5 card-shadow" style={{ background: '#ffffff' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-semibold" style={{ color: '#8a9080' }}>Inventory Items</span>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#f0f7ea', color: '#5a7a4a' }}
                >
                  All orgs
                </span>
              </div>
              <p className="stat-num" style={{ fontSize: 52, color: '#141414', lineHeight: 1 }}>
                {stats.totalItems.toLocaleString()}
              </p>
              <p className="text-[12px] mt-1" style={{ color: '#a0a89a' }}>across {stats.totalOrgs} tenants</p>
              <PillBar value={Math.min(totalItems, 8)} max={8} dark />
            </div>
          </div>

          {/* Chart card */}
          <div className="rounded-3xl p-6 card-shadow" style={{ background: '#ffffff', minHeight: 260 }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <span className="text-[16px] font-semibold" style={{ color: '#141414' }}>Plan Distribution</span>
                <p className="text-[12px] mt-0.5" style={{ color: '#a0a89a' }}>Organizations per subscription tier · hover a bar</p>
              </div>
              <div className="flex items-center gap-2">
                {Object.entries(PLAN_COLORS).map(([plan, color]) => (
                  <span key={plan} className="flex items-center gap-1.5 text-[11px] font-medium capitalize" style={{ color: '#8a9080' }}>
                    <span className="h-2 w-2 rounded-full inline-block" style={{ background: color }} />
                    {plan}
                  </span>
                ))}
              </div>
            </div>
            {chartData.length > 0
              ? <BarChart data={chartData} />
              : <div className="h-44 flex items-center justify-center text-[13px]" style={{ color: '#a0a89a' }}>No data yet</div>
            }
          </div>
        </div>

        {/* Right rail */}
        <div className="w-[220px] shrink-0 space-y-3">

          {/* Recipients */}
          <div className="rounded-3xl p-5 card-shadow" style={{ background: '#ffffff' }}>
            <div className="flex items-center justify-between mb-3">
              <Users className="h-4 w-4" style={{ color: '#8a9080' }} />
              <ArrowUpRight className="h-3.5 w-3.5" style={{ color: '#a0a89a' }} />
            </div>
            <p className="stat-num" style={{ fontSize: 36, color: '#141414', lineHeight: 1 }}>
              {stats.totalRecipients}
            </p>
            <p className="text-[12px] mt-1.5" style={{ color: '#8a9080' }}>Total Recipients</p>
          </div>

          {/* Package */}
          <div className="rounded-3xl p-5 card-shadow" style={{ background: '#ffffff' }}>
            <div className="flex items-center justify-between mb-3">
              <Package className="h-4 w-4" style={{ color: '#8a9080' }} />
              <ArrowUpRight className="h-3.5 w-3.5" style={{ color: '#a0a89a' }} />
            </div>
            <p className="stat-num" style={{ fontSize: 36, color: '#141414', lineHeight: 1 }}>
              {stats.totalAssignments}
            </p>
            <p className="text-[12px] mt-1.5" style={{ color: '#8a9080' }}>Total Assignments</p>
          </div>

          {/* Industry breakdown */}
          <div className="rounded-3xl p-5 card-shadow" style={{ background: '#ffffff' }}>
            <p className="text-[12px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#a0a89a' }}>
              Industries
            </p>
            <div className="space-y-2.5">
              {stats.industryBreakdown.map((item, idx) => (
                <div key={item.industry} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: ['#141414','#c9f53c','#6366f1','#f43f5e','#f59e0b'][idx % 5] }}
                    />
                    <span className="text-[12px] capitalize" style={{ color: '#141414' }}>{item.industry}</span>
                  </div>
                  <span className="text-[12px] font-mono font-semibold" style={{ color: '#141414' }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="rounded-3xl p-5 card-shadow" style={{ background: '#141414' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full" style={{ background: '#c9f53c', boxShadow: '0 0 6px #c9f53c' }} />
              <p className="text-[12px] font-semibold" style={{ color: '#c9f53c' }}>All systems go</p>
            </div>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Backend · Frontend · DB healthy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
