import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, AlertTriangle, XCircle, UserCheck, Truck, CalendarClock, Pill, ShoppingCart,
  type LucideIcon,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useOrganization } from '@/context/OrganizationContext';
import { inventoryService, transactionService, supplierService, batchService } from '@/services';
import { KPICard } from '@/components/shared/KPICard';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { INDUSTRY_LABELS } from '@/data/modules';
import type { Item, StockTransaction, Supplier, Batch } from '@/types';

const TRANSACTION_LABELS: Record<string, string> = {
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
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    if (!currentOrg) return;
    inventoryService.getByOrganization(currentOrg.id).then(setItems);
    transactionService.getByOrganization(currentOrg.id).then(setTransactions);
    supplierService.getByOrganization(currentOrg.id).then(setSuppliers);
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

  // KPIs based on industry
  const isPharmacy = currentOrg.industry === 'pharmacy';

  const kpis: { label: string; value: number; icon: LucideIcon; variant: 'default' | 'warning' | 'danger' | 'success' }[] = isPharmacy
    ? [
        { label: 'Total Medicines', value: items.length, icon: Pill, variant: 'default' },
        { label: 'Low Stock', value: lowStockItems.length, icon: AlertTriangle, variant: 'warning' },
        { label: 'Expiring Soon', value: expiringSoon.length, icon: CalendarClock, variant: 'warning' },
        { label: 'Expired', value: expired.length, icon: XCircle, variant: 'danger' },
        { label: 'Suppliers', value: suppliers.length, icon: Truck, variant: 'success' },
      ]
    : [
        { label: 'Total Items', value: items.length, icon: Package, variant: 'default' },
        { label: 'Low Stock', value: lowStockItems.length, icon: AlertTriangle, variant: 'warning' },
        { label: 'Out of Stock', value: outOfStockItems.length, icon: XCircle, variant: 'danger' },
        { label: 'Items Issued', value: issuedCount, icon: UserCheck, variant: 'success' },
        { label: 'Suppliers', value: suppliers.length, icon: Truck, variant: 'default' },
      ];

  // Category chart data
  const categoryMap = new Map<string, number>();
  items.forEach((item) => {
    const cat = item.categoryName;
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + item.quantity);
  });
  const chartData = Array.from(categoryMap.entries()).map(([category, count]) => ({ category, count }));

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
        description={`${INDUSTRY_LABELS[currentOrg.industry]} · Inventory Management`}
      />

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Inventory Overview Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Inventory Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(214 20% 89%)',
                    fontSize: '13px',
                  }}
                />
                <Bar dataKey="count" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={chartData} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
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
                Reorder Suggestions ({reorderItems.length})
              </CardTitle>
              <button
                onClick={() => navigate('/procurement')}
                className="text-xs font-medium text-amber-700 hover:text-amber-900 underline"
              >
                Create PO →
              </button>
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
                    <span className="text-xs text-muted-foreground">/ min {item.minQuantity ?? 10}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Reorder: {item.reorderQty ?? 50}</p>
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
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.itemName}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${tx.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {TRANSACTION_LABELS[tx.type] || tx.type}
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
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 && outOfStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">All items are well stocked.</p>
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
                      <span className="text-sm font-semibold">{item.quantity} remaining</span>
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
