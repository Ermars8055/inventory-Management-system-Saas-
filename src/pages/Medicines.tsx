import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Pill, Eye, Plus } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { inventoryService, customFieldService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import type { Item, CustomField } from '@/types';

export function MedicinesPage() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');

  useEffect(() => {
    if (!currentOrg) return;
    inventoryService.getByOrganization(currentOrg.id).then((all) =>
      setItems(all.filter((i) => i.module === 'pharmacy'))
    );
    customFieldService.getByOrganization(currentOrg.id).then((all) =>
      setFields(all.filter((f) => f.entity === 'item' && f.module === 'pharmacy').sort((a, b) => a.sortOrder - b.sortOrder))
    );
  }, [currentOrg]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (stockFilter !== 'all' && item.status !== stockFilter) return false;
      return true;
    });
  }, [items, search, stockFilter]);

  function getAttr(item: Item, fieldName: string): string {
    const val = item.attributes?.[fieldName];
    if (val !== undefined && val !== null && val !== '') return String(val);
    const legacy: Record<string, string> = {
      'Generic Name': item.medicine?.genericName || '',
      'Manufacturer': item.medicine?.manufacturer || '',
      'Batch Number': item.medicine?.batchNumber || '',
      'Expiry Date': item.medicine?.expiryDate || '',
      'Manufacturing Date': item.medicine?.manufacturingDate || '',
      'MRP': item.medicine?.mrp ? String(item.medicine.mrp) : '',
      'Prescription Required': item.medicine?.prescriptionRequired ? 'Yes' : '',
    };
    return legacy[fieldName] || '—';
  }

  if (!currentOrg) return null;
  const totalAvailable = items.reduce((a, i) => a + i.available, 0);

  return (
    <div>
      <PageHeader title={t("Medicine Management")}
        description={`${items.length} ${t('medicines')} · ${totalAvailable} ${t('available')}`}
        actions={<Button onClick={() => navigate('/inventory?module=pharmacy')}><Plus className="h-4 w-4 mr-1" /> {t('Add Medicine')}</Button>}
      />
      <Card className="mb-4"><CardContent className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("Search medicines...")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All Stock')}</SelectItem>
              <SelectItem value="in_stock">{t('In Stock')}</SelectItem>
              <SelectItem value="low_stock">{t('Low Stock')}</SelectItem>
              <SelectItem value="out_of_stock">{t('Out of Stock')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-0">
        {filtered.length === 0 ? (
          <EmptyState icon={Pill} title={t("No medicines found")} description={t("Add medicines from Inventory with module set to Medicines.")} />
        ) : (
          <Table><TableHeader><TableRow>
            <TableHead>{t('Item')}</TableHead>
            {fields.map(f => <TableHead key={f.id}>{t(f.name)}</TableHead>)}
            <TableHead className="text-right">{t('Available')}</TableHead>
            <TableHead>{t('Status')}</TableHead>
            <TableHead></TableHead>
          </TableRow></TableHeader><TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                {fields.map(f => <TableCell key={f.id} className="text-muted-foreground text-sm">{getAttr(item, f.name)}</TableCell>)}
                <TableCell className="text-right font-medium">{item.available}</TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell><Button variant="ghost" size="sm" onClick={() => navigate(`/inventory/${item.id}`)}><Eye className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        )}
      </CardContent></Card>
    </div>
  );
}
