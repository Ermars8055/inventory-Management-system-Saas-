import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Download, Printer } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useTranslation } from '@/hooks/useTranslation';
import { inventoryService, transactionService, vendorService, feeService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { Item, StockTransaction, FeeRecord, FeeReceipt } from '@/types';

function exportCSV(rows: (string | number)[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

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

const FEE_STATUS_COLOR: Record<string, string> = {
  unpaid: 'bg-red-50 text-red-700 border-red-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  distributed: 'bg-purple-50 text-purple-700 border-purple-200',
  waived: 'bg-blue-50 text-blue-700 border-blue-200',
};

export function ReportsPage() {
  const { currentOrg } = useOrganization();
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [vendorCount, setVendorCount] = useState(0);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [viewReceipt, setViewReceipt] = useState<FeeReceipt | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    inventoryService.getByOrganization(currentOrg.id).then(setItems);
    transactionService.getByOrganization(currentOrg.id).then(setTransactions);
    vendorService.getByOrganization(currentOrg.id).then((s) => setVendorCount(s.length));
    feeService.getAll().then(setFeeRecords).catch(() => {});
  }, [currentOrg]);

  async function openReceipt(fee: FeeRecord) {
    if (!fee.receiptNumber) return;
    setReceiptLoading(true);
    try {
      const rec = await feeService.getReceipt(fee.id);
      setViewReceipt(rec);
    } finally {
      setReceiptLoading(false);
    }
  }

  function exportReceipts() {
    const headers = [t('Receipt No.'), t('Student'), t('Class'), t('Total'), t('Paid'), t('Status'), t('Date')];
    const rows = feeRecords.filter(f => f.receiptNumber).map(f => [
      f.receiptNumber ?? '', f.recipientName ?? '', f.className || f.templateName || '',
      f.totalAmount, f.paidAmount, f.status, f.paymentDate ?? '',
    ]);
    exportCSV([headers, ...rows], `receipts-${new Date().toISOString().slice(0, 10)}.csv`);
  }

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
    { name: t('In Stock'), value: items.filter((i) => i.status === 'in_stock').length },
    { name: t('Low Stock'), value: items.filter((i) => i.status === 'low_stock').length },
    { name: t('Out of Stock'), value: items.filter((i) => i.status === 'out_of_stock').length },
  ].filter((d) => d.value > 0), [items, t]);

  const txTypeData = useMemo(() =>
    Object.entries(
      transactions.reduce((acc, tx) => {
        acc[tx.type] = (acc[tx.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([type, count]) => ({ name: t(TX_LABELS[type] ?? type), count })),
  [transactions, t]);

  const totalUnits = items.reduce((a, i) => a + i.quantity, 0);
  const lowStock = items.filter((i) => i.status === 'low_stock').length;
  const outOfStock = items.filter((i) => i.status === 'out_of_stock').length;

  function exportInventory() {
    const headers = [t('Name'), t('SKU'), t('Category'), t('Qty'), t('Available'), t('Reserved'), t('Min Qty'), t('Reorder Qty'), t('Location'), t('Status')];
    const rows = items.map(i => [i.name, i.sku, i.categoryName, i.quantity, i.available, i.reserved, i.minQuantity ?? 10, i.reorderQty ?? 50, i.location, i.status]);
    exportCSV([headers, ...rows], `inventory-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  function exportTransactions() {
    const headers = [t('Date'), t('Item'), t('Type'), t('Quantity'), t('Reference'), t('Recipient'), t('Notes')];
    const rows = transactions.map(tx => [tx.date, tx.itemName, tx.type, tx.quantity, tx.reference || '', tx.recipient || '', tx.notes || '']);
    exportCSV([headers, ...rows], `transactions-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader
        title={t("Reports & Analytics")}
        description={`${t("Inventory overview for")} ${currentOrg.name}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportInventory}>
              <Download className="h-4 w-4 mr-1" /> {t("Inventory CSV")}
            </Button>
            <Button variant="outline" size="sm" onClick={exportTransactions}>
              <Download className="h-4 w-4 mr-1" /> {t("Transactions CSV")}
            </Button>
          </div>
        }
      />

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: t('Total Units'), value: totalUnits.toLocaleString('en-IN') },
          { label: t('Item Types'), value: items.length },
          { label: t('Low Stock Items'), value: lowStock, className: 'text-amber-600' },
          { label: t('Out of Stock'), value: outOfStock, className: 'text-red-600' },
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
            <CardTitle className="text-base">{t("Stock Units by Category")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={categoryData} margin={{ top: 4, right: 12, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="units" fill={BAR_COLOR} radius={[4, 4, 0, 0]} name={t("Units")} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stock status pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Stock Status Distribution")}</CardTitle>
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
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{t("Transaction Summary")} ({transactions.length} {t("total")})</CardTitle>
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
              <Bar dataKey="count" fill={TX_COLOR} radius={[4, 4, 0, 0]} name={t("Count")} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Fee summary */}
      {feeRecords.length > 0 && (() => {
        const totalCollected = feeRecords.reduce((s, f) => s + f.paidAmount, 0);
        const totalDue = feeRecords.reduce((s, f) => s + f.totalAmount, 0);
        const paid = feeRecords.filter(f => f.status === 'paid' || f.status === 'distributed').length;
        const unpaid = feeRecords.filter(f => f.status === 'unpaid' || f.status === 'partial').length;
        return (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('Fee Collection Summary')}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: t('Total Due'), value: `₹${totalDue.toLocaleString('en-IN')}` },
                { label: t('Total Collected'), value: `₹${totalCollected.toLocaleString('en-IN')}`, cls: 'text-emerald-600' },
                { label: t('Paid Students'), value: paid, cls: 'text-emerald-600' },
                { label: t('Pending Students'), value: unpaid, cls: unpaid > 0 ? 'text-red-600' : '' },
              ].map(stat => (
                <Card key={stat.label}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${stat.cls ?? ''}`}>{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Receipts history */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">{t('Fee Receipts')} ({feeRecords.filter(f => f.receiptNumber).length})</CardTitle>
          <Button variant="outline" size="sm" onClick={exportReceipts}>
            <Download className="h-3.5 w-3.5 mr-1" /> {t('CSV')}
          </Button>
        </CardHeader>
        <CardContent>
          {feeRecords.filter(f => f.receiptNumber).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('No receipts yet. Receipts are generated after fee payment.')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 pr-4">{t('Receipt No.')}</th>
                    <th className="text-left py-2 pr-4">{t('Student')}</th>
                    <th className="text-left py-2 pr-4">{t('Class')}</th>
                    <th className="text-right py-2 pr-4">{t('Amount')}</th>
                    <th className="text-left py-2 pr-4">{t('Status')}</th>
                    <th className="text-left py-2 pr-4">{t('Date')}</th>
                    <th className="text-right py-2">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {feeRecords.filter(f => f.receiptNumber).map(fee => (
                    <tr key={fee.id} className="hover:bg-muted/30">
                      <td className="py-2 pr-4 font-mono text-xs font-semibold">{fee.receiptNumber}</td>
                      <td className="py-2 pr-4">{fee.recipientName}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{fee.className || fee.templateName || '—'}</td>
                      <td className="py-2 pr-4 text-right font-semibold">₹{fee.paidAmount}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className={`text-xs ${FEE_STATUS_COLOR[fee.status] ?? ''}`}>{t(fee.status)}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground text-xs">{fee.paymentDate || '—'}</td>
                      <td className="py-2 text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={receiptLoading} onClick={() => openReceipt(fee)}>
                          <Printer className="h-3 w-3 mr-1" /> {t('View')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt print modal */}
      <Dialog open={!!viewReceipt} onOpenChange={v => { if (!v) setViewReceipt(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t('Payment Receipt')}</DialogTitle></DialogHeader>
          {viewReceipt && (
            <>
              <div className="space-y-4 py-1">
                <div className="text-center border-b pb-3">
                  <p className="font-bold text-base">{viewReceipt.orgName}</p>
                  <p className="text-xs text-muted-foreground">{t('Fee Payment Receipt')}</p>
                  {viewReceipt.receiptNumber && <p className="text-xs font-mono mt-1 font-semibold">{viewReceipt.receiptNumber}</p>}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">{t('Student')}</span>
                  <span className="font-medium">{viewReceipt.recipientName}</span>
                  <span className="text-muted-foreground">{t('Class')}</span>
                  <span className="font-medium">{viewReceipt.className || viewReceipt.templateName || '—'}</span>
                  <span className="text-muted-foreground">{t('Date')}</span>
                  <span className="font-medium">{viewReceipt.paymentDate || '—'}</span>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{t('Items')}</p>
                  {viewReceipt.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span>{item.itemName} × {item.quantity}</span>
                      {item.unitPrice > 0 && <span className="font-medium">₹{item.total}</span>}
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-1 flex justify-between text-sm font-bold">
                    <span>{t('Amount Paid')}</span>
                    <span>₹{viewReceipt.paidAmount}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setViewReceipt(null)}>{t('Close')}</Button>
                <Button size="sm" onClick={() => window.print()}>
                  <Printer className="h-3.5 w-3.5 mr-1" /> {t('Print')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
