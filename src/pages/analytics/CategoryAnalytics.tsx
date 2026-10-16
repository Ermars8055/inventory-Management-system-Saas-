import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Download, Search, Package, AlertTriangle, XCircle, CheckCircle2,
  Bookmark, MapPin, Layers, HelpCircle, BarChart3, TrendingUp, ShoppingCart,
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
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { Item, StockTransaction } from '@/types';

const PIE_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

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

export function CategoryAnalyticsPage() {
  const { categoryName } = useParams<{ categoryName: string }>();
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();
  const { t } = useTranslation();

  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const decodedCategory = useMemo(() => {
    return categoryName ? decodeURIComponent(categoryName) : '';
  }, [categoryName]);

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

  // Filter items in this category
  const categoryItems = useMemo(() => {
    if (!decodedCategory) return [];
    return items.filter(
      (item) => (item.categoryName || '').trim().toLowerCase() === decodedCategory.trim().toLowerCase()
    );
  }, [items, decodedCategory]);

  const itemIds = useMemo(() => new Set(categoryItems.map((i) => i.id)), [categoryItems]);

  // Filter transactions for items in this category
  const categoryTransactions = useMemo(() => {
    return transactions.filter((t) => itemIds.has(t.itemId));
  }, [transactions, itemIds]);

  // KPIs
  const totalQuantity = useMemo(() => categoryItems.reduce((s, i) => s + i.quantity, 0), [categoryItems]);
  const totalAvailable = useMemo(() => categoryItems.reduce((s, i) => s + i.available, 0), [categoryItems]);
  const totalReserved = useMemo(() => categoryItems.reduce((s, i) => s + i.reserved, 0), [categoryItems]);
  const lowStockCount = useMemo(() => categoryItems.filter((i) => i.status === 'low_stock').length, [categoryItems]);
  const outOfStockCount = useMemo(() => categoryItems.filter((i) => i.status === 'out_of_stock').length, [categoryItems]);

  // 6-Month Consumption Trend for this Category
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyTrendData = useMemo(() => {
    const monthlyMap = new Map<string, { monthKey: string; monthLabel: string; received: number; issued: number }>();
    const sorted = [...categoryTransactions].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    sorted.forEach((tx) => {
      const ym = tx.date ? tx.date.slice(0, 7) : '';
      if (!ym || ym.length < 7 || !ym.includes('-')) return;

      if (!monthlyMap.has(ym)) {
        const [year, month] = ym.split('-');
        const monthIdx = parseInt(month, 10) - 1;
        const monthLabel = `${MONTH_NAMES[monthIdx] ?? month} '${year.slice(2)}`;
        monthlyMap.set(ym, { monthKey: ym, monthLabel, received: 0, issued: 0 });
      }

      const entry = monthlyMap.get(ym)!;
      const qty = Math.abs(tx.quantity);
      if (tx.type === 'received' || tx.type === 'returned') {
        entry.received += qty;
      } else {
        entry.issued += qty;
      }
    });

    return Array.from(monthlyMap.values());
  }, [categoryTransactions]);

  // Stock Status distribution for pie chart
  const statusPieData = useMemo(() => {
    const inStock = categoryItems.filter((i) => i.status === 'in_stock').length;
    return [
      { name: t('In Stock'), value: inStock, color: '#10B981' },
      { name: t('Low Stock'), value: lowStockCount, color: '#F59E0B' },
      { name: t('Out of Stock'), value: outOfStockCount, color: '#EF4444' },
    ].filter((d) => d.value > 0);
  }, [categoryItems, lowStockCount, outOfStockCount, t]);

  // Top items comparison for Bar Chart (Available vs Safety Minimum)
  const topItemsStockData = useMemo(() => {
    const sorted = [...categoryItems].sort((a, b) => b.available - a.available);
    return sorted.slice(0, 8).map((it) => {
      let displayName = it.name;
      if (displayName.length > 20) {
        if (displayName.includes('(')) {
          const [base, extra] = displayName.split('(');
          const cleanExtra = extra.replace(')', '').trim();
          displayName = `${base.trim().slice(0, 13)}… (${cleanExtra})`;
        } else {
          displayName = `${displayName.slice(0, 18)}…`;
        }
      }
      return {
        displayName,
        fullName: it.name,
        sku: it.sku,
        available: it.available,
        min: it.minQuantity ?? 15,
        reorder: it.reorderQty ?? 30,
      };
    });
  }, [categoryItems]);

  // Storage Location breakdown
  const locationBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    categoryItems.forEach((it) => {
      const loc = it.location || 'Unassigned';
      map.set(loc, (map.get(loc) || 0) + it.quantity);
    });
    return Array.from(map.entries())
      .map(([loc, count]) => ({ loc, count }))
      .sort((a, b) => b.count - a.count);
  }, [categoryItems]);

  // Filtered items table
  const filteredItems = useMemo(() => {
    return categoryItems.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        (i.location || '').toLowerCase().includes(q)
      );
    });
  }, [categoryItems, search, statusFilter]);

  function handleExportCSV() {
    const headers = ['Item Name', 'SKU', 'Location', 'Available', 'Reserved', 'Overall Capacity', 'Min Quantity', 'Reorder Qty', 'Status'];
    const rows = filteredItems.map((i) => [
      i.name,
      i.sku,
      i.location || '',
      i.available,
      i.reserved,
      i.quantity,
      i.minQuantity ?? 10,
      i.reorderQty ?? 30,
      i.status,
    ]);
    exportCSV([headers, ...rows], `category-${decodedCategory}.csv`);
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
            title={`${decodedCategory} · ${t('Category Deep-Dive Analytics')}`}
            description={`${t('Capacity balance, stock health thresholds, and consumption trajectory for')} ${decodedCategory}`}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1.5" />
            {t('Export Category CSV')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
              <span>{t('Overall Stock Capacity')}</span>
              <Package className="h-3.5 w-3.5 text-primary" />
            </p>
            <p className="text-2xl font-bold mt-1">{totalQuantity.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{categoryItems.length} {t('distinct SKUs')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
              <span>{t('Available Units')}</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{totalAvailable.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('Immediate ready-to-issue')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
              <span>{t('Reserved Units')}</span>
              <Bookmark className="h-3.5 w-3.5 text-purple-600" />
            </p>
            <p className="text-2xl font-bold mt-1 text-purple-600">{totalReserved.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('Allocated to student kits')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
              <span>{t('Low Stock Alerts')}</span>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            </p>
            <p className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {lowStockCount}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('Under safety minimum')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
              <span>{t('Out of Stock')}</span>
              <XCircle className="h-3.5 w-3.5 text-red-500" />
            </p>
            <p className={`text-2xl font-bold mt-1 ${outOfStockCount > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
              {outOfStockCount}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('Requires urgent reorder')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Available vs Safety Buffer BarChart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              {t('Item Stock Levels vs Safety Buffer')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('Comparing available units against minimum threshold and reorder point')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={topItemsStockData} margin={{ top: 15, right: 15, left: -10, bottom: 85 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" vertical={false} />
                <XAxis
                  dataKey="displayName"
                  tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }}
                  angle={-32}
                  textAnchor="end"
                  interval={0}
                  height={80}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-xs space-y-1.5 z-50">
                          <p className="font-semibold text-foreground text-sm leading-snug">{data.fullName}</p>
                          <p className="text-muted-foreground text-[11px]">SKU: {data.sku}</p>
                          <div className="pt-1 space-y-1">
                            <div className="flex justify-between gap-4">
                              <span className="text-emerald-600 font-medium">{t('Available Stock')}:</span>
                              <span className="font-bold">{data.available} units</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-amber-600 font-medium">{t('Safety Buffer')}:</span>
                              <span className="font-bold">{data.min} units</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-blue-600 font-medium">{t('Reorder Point')}:</span>
                              <span className="font-bold">{data.reorder} units</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }} />
                <Bar dataKey="available" name={t('Available Stock')} fill="#10B981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="min" name={t('Safety Min Buffer')} fill="#F59E0B" radius={[3, 3, 0, 0]} />
                <Bar dataKey="reorder" name={t('Reorder Point')} fill="#3B82F6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution Pie & Locations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('Stock Health Distribution')}</CardTitle>
            <CardDescription className="text-xs">
              {t('Inventory proportion across stock statuses')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {statusPieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>

            {/* Storage Locations */}
            <div className="mt-4 pt-3 border-t border-border/60">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {t('Storage Locations')}
              </p>
              <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                {locationBreakdown.map((loc) => (
                  <div key={loc.loc} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate">{loc.loc}</span>
                    <span className="font-semibold">{loc.count} units</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 6-Month Category Trajectory Chart */}
      {monthlyTrendData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {t('6-Month Movement Trajectory for')} {decodedCategory}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('Historical received consignments vs distribution disbursements over time')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyTrendData} margin={{ top: 15, right: 15, left: -10, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" vertical={false} />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />
                <Bar dataKey="received" name={t('Received (In)')} fill="#10B981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="issued" name={t('Issued (Out)')} fill="#3B82F6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Comprehensive Definitions & Inventory Formula Glossary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            {t('Inventory Capacity & Allocation Definitions')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs leading-relaxed text-muted-foreground">
          <div className="bg-background/80 p-3 rounded-lg border border-border/60">
            <strong className="text-foreground block font-medium mb-1">{t('Overall Stock Capacity')}</strong>
            <p>{t('The grand total physical count present across all storage racks, shelves, and bins for this category.')}</p>
          </div>
          <div className="bg-background/80 p-3 rounded-lg border border-border/60">
            <strong className="text-foreground block font-medium mb-1">{t('Available Units')}</strong>
            <p>{t('Free stock ready for immediate issuance. Calculated as Overall Capacity minus Reserved Units.')}</p>
          </div>
          <div className="bg-background/80 p-3 rounded-lg border border-border/60">
            <strong className="text-foreground block font-medium mb-1">{t('Reserved Units')}</strong>
            <p>{t('Stock held for confirmed batch disbursements, student kit allotments, or scheduled department packages.')}</p>
          </div>
          <div className="bg-background/80 p-3 rounded-lg border border-border/60">
            <strong className="text-foreground block font-medium mb-1">{t('Minimum Safety Buffer')}</strong>
            <p>{t('The minimum emergency threshold. Falling below this mark triggers a restock recommendation to prevent stockouts.')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Itemized Category Catalog */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">
                {t('Category Items Catalog')} ({filteredItems.length})
              </CardTitle>
              <CardDescription className="text-xs">
                {t('All inventory items and SKU variations belonging to')} {decodedCategory}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t('Search item, SKU, location…')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
              <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    statusFilter === 'all'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('All')}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('in_stock')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    statusFilter === 'in_stock'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('In Stock')}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('low_stock')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    statusFilter === 'low_stock'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('Low Stock')}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('out_of_stock')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    statusFilter === 'out_of_stock'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('Out of Stock')}
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('Item Name')}</TableHead>
                  <TableHead className="text-xs">{t('SKU')}</TableHead>
                  <TableHead className="text-xs">{t('Location')}</TableHead>
                  <TableHead className="text-xs text-right">{t('Available')}</TableHead>
                  <TableHead className="text-xs text-right">{t('Reserved')}</TableHead>
                  <TableHead className="text-xs text-right">{t('Capacity (Total)')}</TableHead>
                  <TableHead className="text-xs text-right">{t('Min Buffer')}</TableHead>
                  <TableHead className="text-xs text-right">{t('Reorder Qty')}</TableHead>
                  <TableHead className="text-xs">{t('Status')}</TableHead>
                  <TableHead className="text-xs text-right">{t('Action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8 text-sm">
                      {t('No items found matching the selected criteria.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs font-medium">
                        <Link to={`/inventory/${item.id}`} className="hover:underline text-primary">
                          {item.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{item.sku}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.location || '—'}</TableCell>
                      <TableCell className="text-xs text-right font-semibold font-mono text-emerald-600">
                        {item.available}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-purple-600">
                        {item.reserved}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold font-mono">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-muted-foreground">
                        {item.minQuantity ?? 10}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-muted-foreground">
                        {item.reorderQty ?? 30}
                      </TableCell>
                      <TableCell className="text-xs">
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => navigate(`/inventory/${item.id}`)}
                        >
                          {t('View')} →
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
