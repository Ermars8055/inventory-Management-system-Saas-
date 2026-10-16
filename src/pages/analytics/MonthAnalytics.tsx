import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Download, Search, TrendingUp, TrendingDown, Package,
  Layers, AlertCircle, ArrowUpDown, Calendar, HelpCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { useOrganization } from '@/context/OrganizationContext';
import { useTranslation } from '@/hooks/useTranslation';
import { inventoryService, transactionService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { Item, StockTransaction } from '@/types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#64748B'];

function exportCSV(rows: (string | number)[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function MonthAnalyticsPage() {
  const { monthKey } = useParams<{ monthKey: string }>(); // e.g. "2026-06"
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();
  const { t } = useTranslation();

  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (!currentOrg) return;
    setLoading(true);
    Promise.all([
      inventoryService.getByOrganization(currentOrg.id),
      transactionService.getByOrganization(currentOrg.id),
    ])
      .then(([itemsData, txData]) => {
        setItems(itemsData);
        setTransactions(txData);
      })
      .finally(() => setLoading(false));
  }, [currentOrg]);

  // Parse Month Title
  const monthDisplay = useMemo(() => {
    if (!monthKey || !monthKey.includes('-')) return monthKey || '';
    const [year, month] = monthKey.split('-');
    const mIdx = parseInt(month, 10) - 1;
    return `${MONTH_NAMES[mIdx] || month} ${year}`;
  }, [monthKey]);

  // Filter transactions belonging to this month
  const monthTx = useMemo(() => {
    if (!monthKey) return [];
    return transactions.filter((t) => t.date && t.date.startsWith(monthKey));
  }, [transactions, monthKey]);

  // Aggregate daily activity across the month
  const dailyData = useMemo(() => {
    if (!monthKey || !monthKey.includes('-')) return [];
    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const dailyMap: Record<string, { day: string; date: string; in: number; out: number; net: number; count: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateKey = `${monthKey}-${dayStr}`;
      dailyMap[dateKey] = {
        day: dayStr,
        date: dateKey,
        in: 0,
        out: 0,
        net: 0,
        count: 0,
      };
    }

    monthTx.forEach((tx) => {
      const txDay = tx.date.slice(0, 10);
      if (dailyMap[txDay]) {
        const qty = Math.abs(tx.quantity);
        dailyMap[txDay].count += 1;
        if (tx.type === 'received' || tx.type === 'returned') {
          dailyMap[txDay].in += qty;
          dailyMap[txDay].net += qty;
        } else if (tx.type === 'issued' || tx.type === 'damaged') {
          dailyMap[txDay].out += qty;
          dailyMap[txDay].net -= qty;
        } else if (tx.type === 'adjusted') {
          if (tx.quantity >= 0) {
            dailyMap[txDay].in += qty;
            dailyMap[txDay].net += qty;
          } else {
            dailyMap[txDay].out += qty;
            dailyMap[txDay].net -= qty;
          }
        }
      }
    });

    return Object.values(dailyMap);
  }, [monthKey, monthTx]);

  // Category distribution for this month's transactions
  const categoryDistribution = useMemo(() => {
    const itemMap = new Map(items.map((i) => [i.id, i]));
    const catMap = new Map<string, { name: string; inUnits: number; outUnits: number; total: number }>();

    monthTx.forEach((tx) => {
      const it = itemMap.get(tx.itemId);
      const cat = it?.categoryName || 'Other';
      if (!catMap.has(cat)) {
        catMap.set(cat, { name: cat, inUnits: 0, outUnits: 0, total: 0 });
      }
      const entry = catMap.get(cat)!;
      const qty = Math.abs(tx.quantity);
      entry.total += qty;
      if (tx.type === 'received' || tx.type === 'returned') {
        entry.inUnits += qty;
      } else {
        entry.outUnits += qty;
      }
    });

    return Array.from(catMap.values()).sort((a, b) => b.total - a.total);
  }, [items, monthTx]);

  // Totals & KPIs
  const totalIn = useMemo(
    () => monthTx.filter((t) => t.type === 'received' || t.type === 'returned' || (t.type === 'adjusted' && t.quantity > 0))
      .reduce((s, t) => s + Math.abs(t.quantity), 0),
    [monthTx]
  );

  const totalOut = useMemo(
    () => monthTx.filter((t) => t.type === 'issued' || t.type === 'damaged' || (t.type === 'adjusted' && t.quantity < 0))
      .reduce((s, t) => s + Math.abs(t.quantity), 0),
    [monthTx]
  );

  const netVariance = totalIn - totalOut;

  // Busiest day
  const busiestDay = useMemo(() => {
    let peak = { day: '—', count: 0, units: 0 };
    dailyData.forEach((d) => {
      const units = d.in + d.out;
      if (units > peak.units) {
        peak = { day: d.date, count: d.count, units };
      }
    });
    return peak;
  }, [dailyData]);

  // Distinct items affected
  const distinctItemCount = useMemo(() => new Set(monthTx.map((t) => t.itemId)).size, [monthTx]);

  // Filtered table rows
  const filteredTransactions = useMemo(() => {
    return monthTx.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        tx.itemName.toLowerCase().includes(q) ||
        (tx.reference || '').toLowerCase().includes(q) ||
        (tx.recipient || '').toLowerCase().includes(q) ||
        (tx.user || '').toLowerCase().includes(q)
      );
    });
  }, [monthTx, search, typeFilter]);

  function handleExportCSV() {
    const headers = ['Date', 'Item Name', 'Type', 'Quantity', 'Reference', 'Recipient', 'Logged By'];
    const rows = filteredTransactions.map((tx) => [
      tx.date,
      tx.itemName,
      tx.type,
      tx.quantity,
      tx.reference || '',
      tx.recipient || '',
      tx.user || '',
    ]);
    exportCSV([headers, ...rows], `stock-movement-${monthKey}.csv`);
  }

  if (!currentOrg) return null;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('Back to Dashboard')}
          </button>
          <PageHeader
            title={`${monthDisplay} · ${t('Stock Movement Analytics')}`}
            description={`${t('Deep-dive activity, inflow/outflow balance, and transaction ledger for')} ${currentOrg.name}`}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1.5" />
            {t('Export Month CSV')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
              <span>{t('Total Inflow')}</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            </p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">+{totalIn.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('Stock received & returned')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
              <span>{t('Total Outflow')}</span>
              <TrendingDown className="h-3.5 w-3.5 text-blue-600" />
            </p>
            <p className="text-2xl font-bold mt-1 text-blue-600">-{totalOut.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('Stock issued & consumed')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
              <span>{t('Net Stock Delta')}</span>
              <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
            </p>
            <p className={`text-2xl font-bold mt-1 ${netVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {netVariance >= 0 ? `+${netVariance.toLocaleString()}` : netVariance.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {netVariance >= 0 ? t('Net stock expansion') : t('Net stock reduction')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
              <span>{t('Transactions')}</span>
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            </p>
            <p className="text-2xl font-bold mt-1">{monthTx.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{distinctItemCount} {t('distinct SKUs moved')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
              <span>{t('Peak Day')}</span>
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            </p>
            <p className="text-lg font-bold mt-1 truncate">{busiestDay.day}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{busiestDay.units} {t('units processed')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Day-by-Day Activity Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('Daily Stock Activity')} ({monthDisplay})</CardTitle>
            <CardDescription className="text-xs">
              {t('Day-by-day comparison of incoming stock consignments vs outgoing disbursements')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={dailyData} margin={{ top: 15, right: 15, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} units`, name]}
                  labelFormatter={(lbl) => `${monthDisplay} ${lbl}`}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />
                <Bar dataKey="in" name={t('Inflow (Received)')} fill="#10B981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="out" name={t('Outflow (Issued)')} fill="#3B82F6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Share Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('Activity by Category')}</CardTitle>
            <CardDescription className="text-xs">
              {t('Volume distribution across school departments')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {categoryDistribution.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => [`${val} units`, t('Volume')]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2 max-h-28 overflow-y-auto pr-1">
              {categoryDistribution.map((cat, idx) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="truncate">{cat.name}</span>
                  </div>
                  <span className="font-medium shrink-0 ml-2">{cat.total} units</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comprehensive Definitions & Inventory Formula Glossary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            {t('Stock Management Definitions & Period Formulas')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs leading-relaxed text-muted-foreground">
          <div className="bg-background/80 p-3 rounded-lg border border-border/60">
            <strong className="text-foreground block font-medium mb-1">{t('Stock In (Inflow)')}</strong>
            <p>{t('Physical goods added to warehouse inventory from approved purchase order deliveries, supplier shipments, or student returns.')}</p>
          </div>
          <div className="bg-background/80 p-3 rounded-lg border border-border/60">
            <strong className="text-foreground block font-medium mb-1">{t('Stock Out (Outflow)')}</strong>
            <p>{t('Inventory officially disbursed to students, faculty, or departments for academic coursework, labs, or school activities.')}</p>
          </div>
          <div className="bg-background/80 p-3 rounded-lg border border-border/60">
            <strong className="text-foreground block font-medium mb-1">{t('Net Stock Delta (Δ)')}</strong>
            <p>{t('Calculated as Inflow minus Outflow. A positive value signals inventory growth, while a negative value reflects planned consumption during school intake.')}</p>
          </div>
          <div className="bg-background/80 p-3 rounded-lg border border-border/60">
            <strong className="text-foreground block font-medium mb-1">{t('Inventory Velocity')}</strong>
            <p>{t('Measures how actively items move through school storage. Fast-moving consumables (books, notebooks) turn over faster than fixed sports/lab equipment.')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Filterable Monthly Transaction Ledger */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">
                {t('Recorded Transactions Ledger')} ({filteredTransactions.length})
              </CardTitle>
              <CardDescription className="text-xs">
                {t('Every logged inventory receipt, distribution voucher, and adjustment in')} {monthDisplay}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t('Search item, PO, recipient…')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 px-2.5 text-xs rounded-md border border-input bg-background"
              >
                <option value="all">{t('All Types')}</option>
                <option value="received">{t('Received')}</option>
                <option value="issued">{t('Issued')}</option>
                <option value="returned">{t('Returned')}</option>
                <option value="adjusted">{t('Adjusted')}</option>
                <option value="damaged">{t('Damaged')}</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('Date / Time')}</TableHead>
                  <TableHead className="text-xs">{t('Item Name')}</TableHead>
                  <TableHead className="text-xs">{t('Type')}</TableHead>
                  <TableHead className="text-xs text-right">{t('Quantity')}</TableHead>
                  <TableHead className="text-xs">{t('Reference')}</TableHead>
                  <TableHead className="text-xs">{t('Recipient / Recipient Class')}</TableHead>
                  <TableHead className="text-xs">{t('Staff / Logged By')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">
                      {t('No transactions match the selected criteria.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isPositive = tx.type === 'received' || tx.type === 'returned' || (tx.type === 'adjusted' && tx.quantity > 0);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs font-mono whitespace-nowrap">{tx.date}</TableCell>
                        <TableCell className="text-xs font-medium">{tx.itemName}</TableCell>
                        <TableCell className="text-xs">
                          <Badge
                            variant="outline"
                            className={
                              tx.type === 'received'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : tx.type === 'issued'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : tx.type === 'returned'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : tx.type === 'damaged'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }
                          >
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-xs text-right font-semibold font-mono ${isPositive ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {isPositive ? `+${Math.abs(tx.quantity)}` : `-${Math.abs(tx.quantity)}`}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{tx.reference || '—'}</TableCell>
                        <TableCell className="text-xs">
                          {tx.recipient ? (
                            <span>
                              {tx.recipient}
                              {tx.recipientClass ? ` (${tx.recipientClass})` : ''}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{tx.user || '—'}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
