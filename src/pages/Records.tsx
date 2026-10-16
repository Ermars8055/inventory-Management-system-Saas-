import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package, Users, Wallet, ShoppingCart, Store, Building2, Shield,
  UserCheck, ArrowLeftRight, Layers, Search, Download, ChevronDown,
  ChevronRight, Activity, TrendingUp, CalendarDays, Clock, User,
  GraduationCap, Sliders, Wrench, FileSpreadsheet, X, RotateCcw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { recordsService, type AuditEntry } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';

// ── Entity config ────────────────────────────────────────────────────────────

const ENTITY: Record<string, { label: string; icon: any; color: string; dot: string; chart: string }> = {
  item:              { label: 'Inventory',        icon: Package,          color: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-500',    chart: '#3b82f6' },
  recipient:         { label: 'Recipient',        icon: Users,            color: 'bg-green-100 text-green-800',   dot: 'bg-green-500',   chart: '#22c55e' },
  assignment:        { label: 'Assignment',       icon: UserCheck,        color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500',  chart: '#f97316' },
  fee_record:        { label: 'Fee',              icon: Wallet,           color: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-500',   chart: '#f59e0b' },
  purchase_order:    { label: 'Purchase Order',   icon: ShoppingCart,     color: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500',  chart: '#a855f7' },
  vendor:            { label: 'Vendor',           icon: Store,            color: 'bg-cyan-100 text-cyan-800',     dot: 'bg-cyan-500',    chart: '#06b6d4' },
  user:              { label: 'User',             icon: User,             color: 'bg-pink-100 text-pink-800',     dot: 'bg-pink-500',    chart: '#ec4899' },
  organization:      { label: 'Organization',     icon: Building2,        color: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-500',  chart: '#6366f1' },
  template:          { label: 'Template',         icon: Layers,          color: 'bg-teal-100 text-teal-800',     dot: 'bg-teal-500',    chart: '#14b8a6' },
  auth:              { label: 'Auth & Security',  icon: Shield,           color: 'bg-slate-100 text-slate-800',   dot: 'bg-slate-500',   chart: '#64748b' },
  stock_transaction: { label: 'Stock Movement',   icon: ArrowLeftRight,   color: 'bg-sky-100 text-sky-800',       dot: 'bg-sky-500',     chart: '#0ea5e9' },
  class:             { label: 'Classes & Cohorts',icon: GraduationCap,    color: 'bg-violet-100 text-violet-800', dot: 'bg-violet-500', chart: '#8b5cf6' },
  variant_group:     { label: 'Item Variants',    icon: Layers,           color: 'bg-rose-100 text-rose-800',     dot: 'bg-rose-500',    chart: '#f43f5e' },
  modules:           { label: 'Module Settings',  icon: Sliders,          color: 'bg-emerald-100 text-emerald-800',dot: 'bg-emerald-500',chart: '#10b981' },
  asset:             { label: 'Asset Management', icon: Wrench,           color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500', chart: '#eab308' },
  maintenance:       { label: 'Maintenance',      icon: Wrench,           color: 'bg-red-100 text-red-800',       dot: 'bg-red-500',     chart: '#ef4444' },
  quotation:         { label: 'Quotations',       icon: FileSpreadsheet,  color: 'bg-blue-100 text-blue-900',     dot: 'bg-blue-600',    chart: '#2563eb' },
};
const DEFAULT_ENTITY = { label: 'System Event', icon: Activity, color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400', chart: '#94a3b8' };
const ecfg = (type: string) => ENTITY[type] ?? DEFAULT_ENTITY;

const USER_ROLES: Record<string, string> = {
  'Priya Sharma': 'Org Admin',
  'Anita Verma': 'Staff',
  'Rajesh Kumar': 'Manager',
  'Meena Pillai': 'Staff',
  'Suresh Babu': 'Viewer',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Created', update: 'Updated', delete: 'Deleted',
  issue: 'Issued', return: 'Returned', lost: 'Marked Lost',
  fine_paid: 'Fine Paid', fee_paid: 'Fee Paid', fee_waived: 'Fee Waived',
  distribute: 'Distributed', distribute_all: 'Bulk Distributed',
  stock_adjust: 'Stock Adjusted', receive: 'PO Received',
  login: 'Logged In', login_failed: 'Login Failed', login_blocked: 'Login Blocked',
  password_changed: 'Password Changed', password_reset: 'Password Reset',
  status_change: 'Status Changed', import_template: 'Template Imported',
  add_item: 'Item Added', remove_item: 'Item Removed', update_item: 'Item Updated',
  enrol: 'Enrolled', unenrol: 'Unenrolled',
};
const actionLabel = (a: string) => ACTION_LABELS[a] ?? a.replace(/_/g, ' ');

// ── Helpers ──────────────────────────────────────────────────────────────────

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function nDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function fmtDateLabel(ds: string) {
  try {
    const d = new Date(ds + 'T00:00:00');
    const today = isoDate(new Date());
    const yesterday = nDaysAgo(1);
    if (ds === today) return 'Today';
    if (ds === yesterday) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ds; }
}

function fmtDayShort(ds: string) {
  try { return new Date(ds + 'T00:00:00').toLocaleDateString([], { day: 'numeric', month: 'short' }); }
  catch { return ds.slice(5); }
}

function exportCSV(entries: AuditEntry[]) {
  const header = ['Date', 'Time', 'User', 'Type', 'Action', 'Detail', 'Entity ID'];
  const rows = entries.map(e => [
    e.createdAt?.slice(0, 10) ?? '',
    fmtTime(e.createdAt),
    e.userName,
    ecfg(e.entityType).label,
    actionLabel(e.action),
    (e.detail ?? '').replace(/\n/g, ' | '),
    e.entityId,
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `records-export-${isoDate(new Date())}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ── Entry card ───────────────────────────────────────────────────────────────

function EntryCard({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = ecfg(entry.entityType);
  const Icon = cfg.icon;
  const lines = (entry.detail ?? '').split('\n').filter(Boolean);
  const summary = lines[0] ?? '';
  const diffs = lines.slice(1);

  return (
    <div className="flex gap-3 items-start p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      {/* Icon */}
      <div className={`mt-0.5 h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${cfg.color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Top row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-0 ${cfg.color}`}>
            {cfg.label}
          </Badge>
          <span className="text-xs font-semibold capitalize">{actionLabel(entry.action)}</span>
          <span className="text-xs text-muted-foreground ml-auto shrink-0 flex items-center gap-1">
            <Clock className="h-3 w-3" />{fmtTime(entry.createdAt)}
          </span>
        </div>

        {/* Summary */}
        {summary && (
          <p className="text-xs text-foreground mt-1 leading-snug">{summary}</p>
        )}

        {/* Who */}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" /> {entry.userName}
          </span>
          {entry.entityId && (
            <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[120px]">
              #{entry.entityId.slice(-8)}
            </span>
          )}
        </div>

        {/* Diffs — expandable */}
        {diffs.length > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mt-1.5 transition-colors"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {expanded ? 'Hide changes' : `${diffs.length} change${diffs.length > 1 ? 's' : ''}`}
          </button>
        )}
        {expanded && diffs.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {diffs.map((d, i) => (
              <p key={i} className="text-[11px] font-mono text-muted-foreground bg-muted rounded px-2 py-0.5">{d}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function KPI({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: typeof Activity; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function RecordsPage() {
  const { t } = useTranslation();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(nDaysAgo(29));
  const [dateTo, setDateTo]     = useState(isoDate(new Date()));
  const [typeFilter, setTypeFilter] = useState('__all__');
  const [actionFilter, setActionFilter] = useState('__all__');
  const [userFilter, setUserFilter] = useState('__all__');
  const [search, setSearch] = useState('');
  const [activeRangePreset, setActiveRangePreset] = useState<'7d' | '14d' | '30d' | 'custom'>('30d');

  const setRangePreset = (preset: '7d' | '14d' | '30d') => {
    setActiveRangePreset(preset);
    const days = preset === '7d' ? 6 : preset === '14d' ? 13 : 29;
    setDateFrom(nDaysAgo(days));
    setDateTo(isoDate(new Date()));
  };

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await recordsService.getTimeline({ dateFrom, dateTo, limit: 1000 });
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetch(); }, [fetch]);

  // ── Filtered entries ──

  const filtered = useMemo(() => {
    let list = entries;
    if (typeFilter !== '__all__') list = list.filter(e => e.entityType === typeFilter);
    if (actionFilter !== '__all__') list = list.filter(e => e.action === actionFilter);
    if (userFilter !== '__all__') list = list.filter(e => e.userName === userFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        (e.detail ?? '').toLowerCase().includes(q) ||
        (e.userName ?? '').toLowerCase().includes(q) ||
        (e.action ?? '').toLowerCase().includes(q) ||
        (e.entityType ?? '').toLowerCase().includes(q) ||
        (e.entityId ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [entries, typeFilter, actionFilter, userFilter, search]);

  // ── KPIs ──

  const kpis = useMemo(() => {
    const today = isoDate(new Date());
    const todayCount = filtered.filter(e => e.createdAt?.slice(0, 10) === today).length;
    const users = new Set(filtered.map(e => e.userName)).size;
    const byType = Object.entries(
      filtered.reduce<Record<string, number>>((acc, e) => { acc[e.entityType] = (acc[e.entityType] ?? 0) + 1; return acc; }, {})
    ).sort((a, b) => b[1] - a[1]);
    const topType = byType[0] ? ecfg(byType[0][0]).label : '—';

    const byDay = filtered.reduce<Record<string, number>>((acc, e) => {
      const d = e.createdAt?.slice(0, 10) ?? '';
      acc[d] = (acc[d] ?? 0) + 1; return acc;
    }, {});
    const busiestDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
    const busiestLabel = busiestDay ? `${fmtDateLabel(busiestDay[0])} (${busiestDay[1]})` : '—';

    return { total: filtered.length, todayCount, users, topType, busiestLabel };
  }, [filtered]);

  // ── Activity bar chart (entries per day in range) ──

  const activityData = useMemo(() => {
    const byDay: Record<string, number> = {};
    // Fill every day in range with 0
    const start = new Date(dateFrom + 'T00:00:00');
    const end   = new Date(dateTo   + 'T00:00:00');
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      byDay[isoDate(d)] = 0;
    }
    for (const e of filtered) {
      const d = e.createdAt?.slice(0, 10) ?? '';
      if (d in byDay) byDay[d]++;
    }
    return Object.entries(byDay)
      .sort()
      .map(([date, count]) => ({ date, short: fmtDayShort(date), count }));
  }, [filtered, dateFrom, dateTo]);

  const activityStats = useMemo(() => {
    let peak = { date: '', short: '', count: 0 };
    let sum = 0;
    for (const d of activityData) {
      sum += d.count;
      if (d.count > peak.count) peak = d;
    }
    const days = activityData.length || 1;
    const avg = (sum / days).toFixed(1);
    return { peak, avg, total: sum };
  }, [activityData]);

  // ── Entity type breakdown ──

  const typeBreakdown = useMemo(() => {
    const counts = filtered.reduce<Record<string, number>>((acc, e) => {
      acc[e.entityType] = (acc[e.entityType] ?? 0) + 1; return acc;
    }, {});
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count, label: ecfg(type).label, color: ecfg(type).chart }));
  }, [filtered]);

  // ── Action breakdown ──

  const actionBreakdown = useMemo(() => {
    const counts = filtered.reduce<Record<string, number>>((acc, e) => {
      acc[e.action] = (acc[e.action] ?? 0) + 1; return acc;
    }, {});
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([action, count]) => ({ action, count, label: actionLabel(action) }));
  }, [filtered]);

  // ── Top users ──

  const topUsers = useMemo(() => {
    const counts = filtered.reduce<Record<string, number>>((acc, e) => {
      acc[e.userName] = (acc[e.userName] ?? 0) + 1; return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered]);

  // ── Timeline grouped by date ──

  const grouped = useMemo(() => {
    const map: Record<string, AuditEntry[]> = {};
    for (const e of filtered) {
      const d = e.createdAt?.slice(0, 10) ?? 'unknown';
      if (!map[d]) map[d] = [];
      map[d].push(e);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  // ── Distinct action types present ──

  const presentActions = useMemo(() => [...new Set(entries.map(e => e.action))].sort(), [entries]);
  const presentTypes   = useMemo(() => [...new Set(entries.map(e => e.entityType))].sort(), [entries]);

  const maxBarCount = Math.max(...activityData.map(d => d.count), 1);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('Records & Analytics')}
        description={t('Complete organisational activity — every event, who did it, when, and what changed.')}
      />

      {/* ── Toolbar ── */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All types</SelectItem>
                {presentTypes.map(t => <SelectItem key={t} value={t}>{ecfg(t).label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All actions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All actions</SelectItem>
                {presentActions.map(a => <SelectItem key={a} value={a}>{actionLabel(a)}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="h-8 pl-7 text-xs"
                placeholder="Search events, users, details…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <Button
              variant="outline" size="sm" className="h-8 text-xs gap-1.5 ml-auto"
              onClick={() => exportCSV(filtered)}
              disabled={filtered.length === 0}
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Total Events" value={kpis.total} icon={Activity} color="bg-blue-100 text-blue-700" />
        <KPI label="Events Today" value={kpis.todayCount} icon={CalendarDays} color="bg-green-100 text-green-700" />
        <KPI label="Active Users" value={kpis.users} icon={Users} color="bg-purple-100 text-purple-700" />
        <KPI label="Busiest Day" value={kpis.busiestLabel} icon={TrendingUp} color="bg-amber-100 text-amber-700" />
      </div>

      {/* ── Analytics + Timeline ── */}
      <div className="flex flex-col xl:flex-row gap-5">

        {/* ── Left: analytics panels ── */}
        <div className="xl:w-80 shrink-0 space-y-4">

          {/* Activity trend */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" /> {t('Activity Trend')}
              </CardTitle>
              <div className="flex items-center gap-1 bg-muted p-0.5 rounded text-[10px] font-medium">
                {(['7d', '14d', '30d'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setRangePreset(p)}
                    className={`px-1.5 py-0.5 rounded uppercase transition-colors ${
                      activeRangePreset === p ? 'bg-background shadow-xs font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2 pt-1 border-t border-border/50">
                <span>{t('Total')}: <strong className="text-foreground">{activityStats.total}</strong></span>
                <span>{t('Avg')}: <strong className="text-foreground">{activityStats.avg}/d</strong></span>
                <span>{t('Peak')}: <strong className="text-foreground">{activityStats.peak.count}</strong></span>
              </div>
              <ResponsiveContainer width="100%" height={110}>
                <AreaChart data={activityData} margin={{ top: 5, right: 4, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="short" tick={{ fontSize: 9, fill: 'hsl(215 16% 47%)' }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(215 16% 47%)' }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '6px', fontSize: '11px', padding: '4px 8px' }}
                    formatter={(v: any) => [`${v} events`, 'Activity']}
                    labelFormatter={(l) => `${l}`}
                  />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#actGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Entity breakdown */}
          {typeBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" /> {t('By Entity Type')}
                </CardTitle>
                {typeFilter !== '__all__' && (
                  <button
                    type="button"
                    onClick={() => setTypeFilter('__all__')}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    {t('Clear filter')}
                  </button>
                )}
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1.5">
                {typeBreakdown.map(({ type, count, label, color }) => {
                  const cfg = ecfg(type);
                  const Icon = cfg.icon;
                  const pct = Math.round((count / (filtered.length || 1)) * 100);
                  const isSelected = typeFilter === type;
                  return (
                    <div
                      key={type}
                      onClick={() => setTypeFilter(prev => prev === type ? '__all__' : type)}
                      className={`group p-1.5 rounded-md cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-primary/10 border-primary shadow-xs'
                          : 'border-transparent hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5 font-medium truncate">
                          <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${cfg.color}`}>
                            <Icon className="h-2.5 w-2.5" />
                          </span>
                          <span className="truncate">{label}</span>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[10px] text-muted-foreground">{pct}%</span>
                          <Badge variant={isSelected ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5 font-semibold">
                            {count}
                          </Badge>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Top actions */}
          {actionBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-primary" /> {t('By Action')}
                </CardTitle>
                {actionFilter !== '__all__' && (
                  <button
                    type="button"
                    onClick={() => setActionFilter('__all__')}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    {t('Clear filter')}
                  </button>
                )}
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1">
                {actionBreakdown.map(({ action, count, label }) => {
                  const isSelected = actionFilter === action;
                  return (
                    <button
                      key={action}
                      type="button"
                      onClick={() => setActionFilter(prev => prev === action ? '__all__' : action)}
                      className={`w-full flex items-center justify-between text-xs py-1 px-2 rounded-md transition-colors text-left ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-semibold border border-primary/40'
                          : 'hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      <span className="capitalize truncate">{label}</span>
                      <Badge variant={isSelected ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5 shrink-0 ml-2">
                        {count}
                      </Badge>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Top users */}
          {topUsers.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" /> {t('Most Active Users')}
                </CardTitle>
                {userFilter !== '__all__' && (
                  <button
                    type="button"
                    onClick={() => setUserFilter('__all__')}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    {t('Clear filter')}
                  </button>
                )}
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1.5">
                {topUsers.map(([name, count], i) => {
                  const role = USER_ROLES[name] || 'Staff';
                  const pct = Math.round((count / (filtered.length || 1)) * 100);
                  const isSelected = userFilter === name;
                  return (
                    <div
                      key={name}
                      onClick={() => setUserFilter(prev => prev === name ? '__all__' : name)}
                      className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-primary/10 border-primary shadow-xs'
                          : 'border-transparent hover:bg-muted/50'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-muted-foreground w-3.5">{i + 1}</span>
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate leading-tight">{name}</p>
                        <p className="text-[10px] text-muted-foreground">{role} · {pct}%</p>
                      </div>
                      <Badge variant={isSelected ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5 font-semibold">
                        {count}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Pie breakdown */}
          {typeBreakdown.length > 1 && (
            <Card>
              <CardHeader className="pb-1 pt-3 px-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('Distribution')}
                </CardTitle>
                <span className="text-[11px] text-muted-foreground font-mono">{filtered.length} {t('events')}</span>
              </CardHeader>
              <CardContent className="pb-3 pt-1">
                <div className="relative">
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={typeBreakdown}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={56}
                        paddingAngle={2}
                        className="cursor-pointer"
                        onClick={(entry: any) => {
                          if (entry?.type) {
                            setTypeFilter(prev => prev === entry.type ? '__all__' : entry.type);
                          }
                        }}
                      >
                        {typeBreakdown.map(({ type, color }) => (
                          <Cell key={type} fill={color} className="cursor-pointer hover:opacity-80 transition-opacity" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '6px', fontSize: '11px', padding: '4px 8px' }} formatter={(v: number) => [`${v} events`, 'Share']} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Counter */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-1">
                    <span className="text-base font-bold leading-none">{filtered.length}</span>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{t('Total')}</span>
                  </div>
                </div>

                {/* Compact Legend Grid */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 pt-2 border-t border-border/60">
                  {typeBreakdown.slice(0, 6).map(({ type, label, count, color }) => {
                    const pct = Math.round((count / (filtered.length || 1)) * 100);
                    const isSelected = typeFilter === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTypeFilter(prev => prev === type ? '__all__' : type)}
                        className={`flex items-center justify-between text-[11px] p-1 rounded transition-colors text-left ${
                          isSelected ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="truncate">{label}</span>
                        </div>
                        <span className="font-mono text-[10px] shrink-0 ml-1">{pct}%</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right: timeline ── */}
        <div className="flex-1 min-w-0">
          {/* Active Filter Chips */}
          {(typeFilter !== '__all__' || actionFilter !== '__all__' || userFilter !== '__all__' || search) && (
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20 text-xs mb-3">
              <span className="font-medium text-foreground">{t('Active Filters')}:</span>
              {typeFilter !== '__all__' && (
                <Badge variant="secondary" className="gap-1 bg-background text-foreground border">
                  <span>Type: {ecfg(typeFilter).label}</span>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setTypeFilter('__all__')} />
                </Badge>
              )}
              {actionFilter !== '__all__' && (
                <Badge variant="secondary" className="gap-1 bg-background text-foreground border">
                  <span>Action: {actionLabel(actionFilter)}</span>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setActionFilter('__all__')} />
                </Badge>
              )}
              {userFilter !== '__all__' && (
                <Badge variant="secondary" className="gap-1 bg-background text-foreground border">
                  <span>User: {userFilter}</span>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setUserFilter('__all__')} />
                </Badge>
              )}
              {search && (
                <Badge variant="secondary" className="gap-1 bg-background text-foreground border">
                  <span>Search: &quot;{search}&quot;</span>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setSearch('')} />
                </Badge>
              )}
              <button
                type="button"
                onClick={() => {
                  setTypeFilter('__all__');
                  setActionFilter('__all__');
                  setUserFilter('__all__');
                  setSearch('');
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground underline ml-auto"
              >
                {t('Reset all')}
              </button>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              Loading records…
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                No records match your filters.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {grouped.map(([date, dayEntries]) => (
                <div key={date}>
                  {/* Day header */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {fmtDateLabel(date)}
                    </div>
                    <div className="flex-1 h-px bg-border" />
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                      {dayEntries.length}
                    </Badge>
                  </div>

                  {/* Entries */}
                  <div className="space-y-1.5">
                    {dayEntries.map(entry => (
                      <EntryCard key={entry.id} entry={entry} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
