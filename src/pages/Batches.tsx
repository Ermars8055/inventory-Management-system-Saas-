import { useState, useEffect, useMemo } from 'react';
import { Search, Layers } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { batchService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Batch } from '@/types';

const BATCH_STATUS_CONFIG = {
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  expiring_soon: { label: 'Expiring Soon', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  expired: { label: 'Expired', className: 'bg-red-50 text-red-700 border-red-200' },
};

export function BatchesPage() {
  const { currentOrg } = useOrganization();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!currentOrg) return;
    batchService.getByOrganization(currentOrg.id).then(setBatches);
  }, [currentOrg]);

  const filtered = useMemo(() => {
    return batches.filter((b) => {
      if (
        search &&
        !b.medicineName.toLowerCase().includes(search.toLowerCase()) &&
        !b.batchNumber.toLowerCase().includes(search.toLowerCase())
      ) return false;
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      return true;
    });
  }, [batches, search, statusFilter]);

  const counts = useMemo(() => ({
    active: batches.filter((b) => b.status === 'active').length,
    expiring_soon: batches.filter((b) => b.status === 'expiring_soon').length,
    expired: batches.filter((b) => b.status === 'expired').length,
  }), [batches]);

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader title="Batch Management" description={`${batches.length} batches tracked`} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active', count: counts.active, colorClass: 'text-emerald-600', bgClass: 'bg-emerald-50', borderClass: 'border-emerald-200' },
          { label: 'Expiring Soon', count: counts.expiring_soon, colorClass: 'text-amber-600', bgClass: 'bg-amber-50', borderClass: 'border-amber-200' },
          { label: 'Expired', count: counts.expired, colorClass: 'text-red-600', bgClass: 'bg-red-50', borderClass: 'border-red-200' },
        ].map((stat) => (
          <Card key={stat.label} className={`border ${stat.borderClass}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.colorClass}`}>{stat.count}</p>
              </div>
              <div className={`h-10 w-10 rounded-full ${stat.bgClass} flex items-center justify-center`}>
                <Layers className={`h-5 w-5 ${stat.colorClass}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by medicine or batch number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={Layers} title="No batches found" description="Try adjusting your filters." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Manufacturing Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((batch) => {
                  const cfg = BATCH_STATUS_CONFIG[batch.status];
                  return (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.medicineName}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{batch.batchNumber}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{batch.manufacturingDate}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{batch.expiryDate}</TableCell>
                      <TableCell className="text-right font-medium">{batch.quantity}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
                      </TableCell>
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
