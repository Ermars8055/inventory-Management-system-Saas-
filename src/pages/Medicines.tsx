import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Pill, Eye } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { inventoryService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Item } from '@/types';

export function MedicinesPage() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [rxFilter, setRxFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  useEffect(() => {
    if (!currentOrg) return;
    inventoryService.getByOrganization(currentOrg.id).then((all) =>
      setItems(all.filter((i) => i.module === 'pharmacy'))
    );
  }, [currentOrg]);

  const categories = useMemo(() => [...new Set(items.map((i) => i.categoryName).filter(Boolean))], [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (
        search &&
        !item.name.toLowerCase().includes(search.toLowerCase()) &&
        !item.medicine?.genericName?.toLowerCase().includes(search.toLowerCase()) &&
        !item.medicine?.manufacturer?.toLowerCase().includes(search.toLowerCase())
      ) return false;
      if (categoryFilter !== 'all' && item.categoryName !== categoryFilter) return false;
      if (rxFilter === 'rx' && !item.medicine?.prescriptionRequired) return false;
      if (rxFilter === 'otc' && item.medicine?.prescriptionRequired) return false;
      if (stockFilter !== 'all' && item.status !== stockFilter) return false;
      return true;
    });
  }, [items, search, categoryFilter, rxFilter, stockFilter]);

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader
        title="Medicine Inventory"
        description={`${items.length} medicines · ${items.filter((i) => i.medicine?.prescriptionRequired).length} Rx required`}
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Name, generic name or manufacturer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={rxFilter} onValueChange={setRxFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Rx / OTC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="rx">Rx Required</SelectItem>
                <SelectItem value="otc">OTC</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={Pill} title="No medicines found" description="Try adjusting your filters." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Generic Name</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">MRP</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Rx</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.medicine?.genericName ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.medicine?.manufacturer ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.medicine?.batchNumber ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.medicine?.expiryDate ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {item.medicine?.mrp !== undefined ? `₹${item.medicine.mrp}` : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                    <TableCell>
                      {item.medicine?.prescriptionRequired ? (
                        <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">Rx</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300 bg-emerald-50">OTC</Badge>
                      )}
                    </TableCell>
                    <TableCell><StatusBadge status={item.status} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/inventory/${item.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
