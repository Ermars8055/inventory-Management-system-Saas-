import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useOrganization } from '@/context/OrganizationContext';
import { inventoryService, transactionService, supplierService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Item, StockTransaction } from '@/types';

const TX_LABELS: Record<string, string> = {
  received: 'Received',
  issued: 'Issued',
  returned: 'Returned',
  adjusted: 'Adjusted',
  damaged: 'Damaged',
  transferred: 'Transferred',
};

const STATUS_COLORS = ['#16a34a', '#f59e0b', '#dc2626'];
const BAR_COLOR = '#2563eb';
const TX_COLOR = '#0891b2';

export function ReportsPage() {
  const { currentOrg } = useOrganization();
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [supplierCount, setSupplierCount] = useState(0);

  useEffect(() => {
    if (!currentOrg) return;
    inventoryService.getByOrganization(currentOrg.id).then(setItems);
    transactionService.getByOrganization(currentOrg.id).then(setTransactions);
    supplierService.getByOrganization(currentOrg.id).then((s) => setSupplierCount(s.length));
  }, [currentOrg]);

  const categoryData = useMemo(() =>
    Object.values(
      items.reduce((acc, item) => {
        const key = item.categoryName;
        if (!acc[key]) acc[key] = { name: key, units: 0, types: 0 };
        acc[key].units += item.quantity;
        acc[key].types += 1;
        return acc;
      }, {} as Record<string, { name: string; units: number; types: number }>)
    ), [items]);

  const statusData = useMemo(() => [
    { name: 'In Stock', value: items.filter((i) => i.status === 'in_stock').length },
    { name: 'Low Stock', value: items.filter((i) => i.status === 'low_stock').length },
    { name: 'Out of Stock', value: items.filter((i) => i.status === 'out_of_stock').length },
  ].filter((d) => d.value > 0), [items]);

  const txTypeData = useMemo(() =>
    Object.entries(
      transactions.reduce((acc, tx) => {
        acc[tx.type] = (acc[tx.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([type, count]) => ({ name: TX_LABELS[type] ?? type, count })),
  [transactions]);

  const totalUnits = items.reduce((a, i) => a + i.quantity, 0);
  const lowStock = items.filter((i) => i.status === 'low_stock').length;
  const outOfStock = items.filter((i) => i.status === 'out_of_stock').length;

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description={`Inventory overview for ${currentOrg.name}`}
      />

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Units', value: totalUnits.toLocaleString('en-IN') },
          { label: 'Item Types', value: items.length },
          { label: 'Low Stock Items', value: lowStock, className: 'text-amber-600' },
          { label: 'Out of Stock', value: outOfStock, className: 'text-red-600' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.className ?? ''}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Stock by category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Units by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={categoryData} margin={{ top: 4, right: 12, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="units" fill={BAR_COLOR} radius={[4, 4, 0, 0]} name="Units" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stock status pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="48%"
                  outerRadius={88}
                  dataKey="value"
                  label={({ name, percent }) =>
                    percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                  }
                  labelLine={false}
                  fontSize={11}
                >
                  {statusData.map((_, idx) => (
                    <Cell key={idx} fill={STATUS_COLORS[idx]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Transaction summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction Summary ({transactions.length} total)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={txTypeData}
              margin={{ top: 4, right: 12, left: -20, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill={TX_COLOR} radius={[4, 4, 0, 0]} name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
