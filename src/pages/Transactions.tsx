import { useState, useEffect, useMemo } from 'react';
import { ArrowDownCircle, ArrowUpCircle, AlertCircle, RotateCcw, Wrench, ArrowLeftRight, Search } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { transactionService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { StockTransaction, TransactionType } from '@/types';

const TX_CONFIG: Record<TransactionType, { label: string; icon: typeof ArrowDownCircle; color: string; bg: string }> = {
  received: { label: 'Stock Received', icon: ArrowDownCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  issued: { label: 'Stock Issued', icon: ArrowUpCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
  returned: { label: 'Stock Returned', icon: RotateCcw, color: 'text-teal-600', bg: 'bg-teal-50' },
  adjusted: { label: 'Stock Adjusted', icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50' },
  damaged: { label: 'Damaged', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  transferred: { label: 'Transferred', icon: ArrowLeftRight, color: 'text-purple-600', bg: 'bg-purple-50' },
};

export function TransactionsPage() {
  const { currentOrg } = useOrganization();
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    if (!currentOrg) return;
    transactionService.getByOrganization(currentOrg.id).then(setTransactions);
  }, [currentOrg]);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (search && !tx.itemName.toLowerCase().includes(search.toLowerCase()) && !tx.reference.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      return true;
    });
  }, [transactions, search, typeFilter]);

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader title="Stock Transactions" description={`${transactions.length} transactions recorded`} />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by item or reference..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TX_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={ArrowLeftRight} title="No transactions found" description="Try adjusting your filters." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tx) => {
                  const cfg = TX_CONFIG[tx.type];
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{tx.date}</TableCell>
                      <TableCell className="font-medium">{tx.itemName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-md ${cfg.bg}`}>
                            <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                          </div>
                          <span className="text-sm">{cfg.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${tx.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{tx.user}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{tx.reference}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
