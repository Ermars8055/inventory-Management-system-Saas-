import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Package, AlertTriangle, XCircle, UserCheck, Truck, CalendarClock, Pill, ShoppingCart, Wallet, BarChart3,
  type LucideIcon,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useOrganization } from '@/context/OrganizationContext';
import { inventoryService, transactionService, vendorService, batchService, feeService } from '@/services';
import { KPICard } from '@/components/shared/KPICard';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { INDUSTRY_LABELS } from '@/data/modules';
import type { Item, StockTransaction, Vendor, Batch, FeeRecord } from '@/types';

const TRANSACTION_LABEL_KEYS: Record<string, string> = {
  received: 'Stock Received',
  issued: 'Issued',
  returned: 'Returned',
  adjusted: 'Adjusted',
  damaged: 'Damaged',
  transferred: 'Transferred',
};

export function DashboardPage() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [chartView, setChartView] = useState<'timeline' | 'net' | 'category'>('timeline');

  useEffect(() => {
    if (!currentOrg) return;
    inventoryService.getByOrganization(currentOrg.id).then(setItems);
    transactionService.getByOrganization(currentOrg.id).then(setTransactions);
    vendorService.getByOrganization(currentOrg.id).then(setVendors);
    feeService.getAll().then(setFees).catch(() => {});
    if (currentOrg.industry === 'pharmacy') {
      batchService.getByOrganization(currentOrg.id).then(setBatches);
    }
  }, [currentOrg]);

  if (!currentOrg) return null;

  const lowStockItems = items.filter((i) => i.status === 'low_stock');
  const outOfStockItems = items.filter((i) => i.status === 'out_of_stock');
  const issuedCount = transactions.filter((t) => t.type === 'issued').reduce((sum, t) => sum + Math.abs(t.quantity), 0);
  const expiringSoon = batches.filter((b) => b.status === 'expiring_soon');
  const expired = batches.filter((b) => b.status === 'expired');
  const pendingFees = fees.filter((f) => f.status === 'unpaid' || f.status === 'partial').length;

  // KPIs based on industry
  const isPharmacy = currentOrg.industry === 'pharmacy';

  const kpis: { label: string; value: number; icon: LucideIcon; variant: 'default' | 'warning' | 'danger' | 'success' }[] = isPharmacy
    ? [
        { label: t('Total Medicines'), value: items.length, icon: Pill, variant: 'default' },
        { label: t('Low Stock'), value: lowStockItems.length, icon: AlertTriangle, variant: 'warning' },
        { label: t('Expiring Soon'), value: expiringSoon.length, icon: CalendarClock, variant: 'warning' },
        { label: t('Expired'), value: expired.length, icon: XCircle, variant: 'danger' },
        { label: t('Vendors'), value: vendors.length, icon: Truck, variant: 'success' },
      ]
    : [
        { label: t('Total Items'), value: items.length, icon: Package, variant: 'default' },
        { label: t('Low Stock'), value: lowStockItems.length, icon: AlertTriangle, variant: 'warning' },
        { label: t('Out of Stock'), value: outOfStockItems.length, icon: XCircle, variant: 'danger' },
        { label: t('Items Issued'), value: issuedCount, icon: UserCheck, variant: 'success' },
        { label: t('Fees Pending'), value: pendingFees, icon: Wallet, variant: pendingFees > 0 ? 'warning' : 'default' },
      ];

  // Category chart data
  const categoryMap = new Map<string, number>();
  items.forEach((item) => {
    const rawCat = (item.categoryName || '').trim();
    const cat = rawCat || 'Uncategorized';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + item.quantity);
  });
  const chartData = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Monthly stock movement & time difference calculation
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyTimelineMap = new Map<string, { monthKey: string; monthLabel: string; received: number; issued: number; net: number; count: number }>();

  const sortedTx = [...transactions].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  sortedTx.forEach((tx) => {
    const ym = tx.date ? tx.date.slice(0, 7) : '';
    if (!ym || ym.length < 7 || !ym.includes('-')) return;

    if (!monthlyTimelineMap.has(ym)) {
      const [year, month] = ym.split('-');
      const monthIdx = parseInt(month, 10) - 1;
      const monthLabel = `${MONTH_NAMES[monthIdx] ?? month} '${year.slice(2)}`;
      monthlyTimelineMap.set(ym, {
        monthKey: ym,
        monthLabel,
        received: 0,
        issued: 0,
        net: 0,
        count: 0,
      });
    }

    const entry = monthlyTimelineMap.get(ym)!;
    const qty = Math.abs(tx.quantity);
    entry.count += 1;

    if (tx.type === 'received' || tx.type === 'returned') {
      entry.received += qty;
      entry.net += qty;
    } else if (tx.type === 'issued' || tx.type === 'damaged') {
      entry.issued += qty;
      entry.net -= qty;
    } else if (tx.type === 'adjusted') {
      if (tx.quantity >= 0) {
        entry.received += qty;
        entry.net += qty;
      } else {
        entry.issued += qty;
        entry.net -= qty;
      }
    }
  });

  const timelineData = Array.from(monthlyTimelineMap.values());
  const totalInflow = timelineData.reduce((acc, d) => acc + d.received, 0);
  const totalOutflow = timelineData.reduce((acc, d) => acc + d.issued, 0);
  const totalNet = totalInflow - totalOutflow;

  // Pie chart colors
  const PIE_COLORS = ['#2563eb', '#0891b2', '#16a34a', '#ea580c', '#9333ea', '#6b7280'];

  const recentTransactions = transactions.slice(0, 6);
  const reorderItems = items.filter(i => i.available <= (i.minQuantity ?? 10) && i.status !== 'out_of_stock')
    .concat(outOfStockItems)
    .slice(0, 8);

  return (
    <div>
      <PageHeader
        title={`${currentOrg.name}`}
        description={`${INDUSTRY_LABELS[currentOrg.industry]} · ${t('Inventory Management')}`}
      />

      {/* KPI Cards */}
      <div data-tutorial="kpi-cards" className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div data-tutorial="charts" className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Stock Movement / Time Difference Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {chartView === 'timeline'
                  ? t('Stock Movement Over Time')
                  : chartView === 'net'
                  ? t('Net Stock Difference Over Time')
                  : t('Stock by Category')}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {chartView === 'timeline'
                  ? t('Monthly stock inflow (received) vs outflow (issued)')
                  : chartView === 'net'
                  ? t('Net stock volume change per month (Inflow - Outflow)')
                  : t('Current inventory units across categories')}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setChartView('timeline')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  chartView === 'timeline'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('In vs Out')}
              </button>
              <button
                type="button"
                onClick={() => setChartView('net')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  chartView === 'net'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('Net Diff (±)')}
              </button>
              <button
                type="button"
                onClick={() => setChartView('category')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  chartView === 'category'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('Category')}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {chartView === 'timeline' && (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={timelineData} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" vertical={false} />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(214 20% 89%)',
                      fontSize: '13px',
                      backgroundColor: '#ffffff',
                    }}
                    formatter={(value: any, name: any) => [`${Number(value).toLocaleString()} units (click to inspect)`, name]}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '8px', fontSize: '12px' }} />
                  <Bar
                    dataKey="received"
                    name={t('Stock In (Received)')}
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    barSize={26}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(data: any) => {
                      if (data?.monthKey) navigate(`/analytics/month/${data.monthKey}`);
                    }}
                  />
                  <Bar
                    dataKey="issued"
                    name={t('Stock Out (Issued)')}
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                    barSize={26}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(data: any) => {
                      if (data?.monthKey) navigate(`/analytics/month/${data.monthKey}`);
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

            {chartView === 'net' && (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={timelineData} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" vertical={false} />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(214 20% 89%)',
                      fontSize: '13px',
                      backgroundColor: '#ffffff',
                    }}
                    formatter={(value: any) => [
                      `${Number(value) >= 0 ? '+' : ''}${Number(value).toLocaleString()} units (click to inspect)`,
                      t('Net Stock Difference'),
                    ]}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '8px', fontSize: '12px' }} />
                  <Bar
                    dataKey="net"
                    name={t('Net Stock Difference')}
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(data: any) => {
                      if (data?.monthKey) navigate(`/analytics/month/${data.monthKey}`);
                    }}
                  >
                    {timelineData.map((entry, index) => (
                      <Cell key={`net-cell-${index}`} fill={entry.net >= 0 ? '#10B981' : '#EF4444'} className="cursor-pointer hover:opacity-80 transition-opacity" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {chartView === 'category' && (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 65 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" vertical={false} />
                  <XAxis
                    dataKey="category"
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={65}
                    tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(214 20% 89%)',
                      fontSize: '13px',
                      backgroundColor: '#ffffff',
                    }}
                    formatter={(value: any) => [`${Number(value).toLocaleString()} units (click to view items)`, t('Total Quantity')]}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(221 83% 53%)"
                    radius={[4, 4, 0, 0]}
                    barSize={34}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(data: any) => {
                      if (data?.category) navigate(`/analytics/category/${encodeURIComponent(data.category)}`);
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Time difference metrics banner */}
            <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>{t('Total Inflow')}: <strong className="text-foreground">+{totalInflow.toLocaleString()}</strong></span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                  <span>{t('Total Outflow')}: <strong className="text-foreground">-{totalOutflow.toLocaleString()}</strong></span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${totalNet >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span>{t('Net Stock Diff')}: <strong className={totalNet >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>{totalNet >= 0 ? `+${totalNet.toLocaleString()}` : totalNet.toLocaleString()}</strong></span>
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground/80">
                {timelineData.length > 0 ? `${timelineData[0].monthLabel} – ${timelineData[timelineData.length - 1].monthLabel}` : ''} ({transactions.length} {t('transactions')})
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution Pie */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t('Stock Distribution')}</CardTitle>
              <span className="text-[11px] text-muted-foreground font-normal">{t('Click slice to drilldown')}</span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                  className="cursor-pointer"
                  onClick={(entry: any) => {
                    if (entry?.category) {
                      navigate(`/analytics/category/${encodeURIComponent(entry.category)}`);
                    }
                  }}
                >
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} className="cursor-pointer hover:opacity-80 transition-opacity" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(214 20% 89%)', fontSize: '13px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Reorder Suggestions */}
      {reorderItems.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-amber-600" />
                {t('Reorder Suggestions')} ({reorderItems.length})
              </CardTitle>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const ids = reorderItems.map(i => i.id).join(',');
                    navigate(`/quotations?reorder=1&items=${ids}`);
                  }}
                  className="text-xs font-medium text-amber-700 hover:text-amber-900 underline"
                >
                  {t('Get Quotes')} →
                </button>
                <button
                  onClick={() => navigate('/procurement')}
                  className="text-xs font-medium text-amber-700 hover:text-amber-900 underline"
                >
                  {t('Create PO')} →
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {reorderItems.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg border border-amber-100 bg-white cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => navigate(`/inventory/${item.id}`)}
                >
                  <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                  <div className="mt-1.5 flex items-center gap-1">
                    <span className={`text-sm font-bold ${item.status === 'out_of_stock' ? 'text-red-600' : 'text-amber-600'}`}>
                      {item.available}
                    </span>
                    <span className="text-xs text-muted-foreground">/ {t('min')} {item.minQuantity ?? 10}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Reorder')}: {item.reorderQty ?? 50}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('Recent Transactions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Item')}</TableHead>
                  <TableHead>{t('Transaction')}</TableHead>
                  <TableHead>{t('Recipient')}</TableHead>
                  <TableHead className="text-right">{t('Qty')}</TableHead>
                  <TableHead className="text-right">{t('Date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.itemName}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${tx.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t(TRANSACTION_LABEL_KEYS[tx.type] || tx.type)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{tx.recipient || tx.reference}</TableCell>
                    <TableCell className={`text-right font-medium ${tx.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm whitespace-nowrap">{tx.date.split(' ')[0]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {t('Low Stock Alert')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 && outOfStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t('All items are well stocked.')}</p>
            ) : (
              <div className="space-y-3">
                {[...lowStockItems, ...outOfStockItems].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/inventory/${item.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.sku}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{item.quantity} {t('remaining')}</span>
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
