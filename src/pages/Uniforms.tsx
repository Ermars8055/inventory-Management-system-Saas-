import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Shirt, Eye, Plus } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { inventoryService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import type { Item } from '@/types';

export function UniformsPage() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  useEffect(() => {
    if (!currentOrg) return;
    inventoryService.getByOrganization(currentOrg.id).then((all) =>
      setItems(all.filter((i) => i.module === 'uniforms'))
    );
  }, [currentOrg]);

  const classes = useMemo(() => [...new Set(items.map((i) => i.uniform?.classGrade).filter(Boolean) as string[])], [items]);
  const types = useMemo(() => [...new Set(items.map((i) => i.uniform?.uniformType).filter(Boolean) as string[])], [items]);
  const years = useMemo(() => [...new Set(items.map((i) => i.uniform?.academicYear).filter(Boolean) as string[])], [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (classFilter !== 'all' && item.uniform?.classGrade !== classFilter) return false;
      if (genderFilter !== 'all' && item.uniform?.gender !== genderFilter) return false;
      if (typeFilter !== 'all' && item.uniform?.uniformType !== typeFilter) return false;
      if (yearFilter !== 'all' && item.uniform?.academicYear !== yearFilter) return false;
      if (stockFilter !== 'all' && item.status !== stockFilter) return false;
      return true;
    });
  }, [items, search, classFilter, genderFilter, typeFilter, yearFilter, stockFilter]);

  if (!currentOrg) return null;

  const totalAvailable = items.reduce((a, i) => a + i.available, 0);
  const totalIssued = items.reduce((a, i) => a + (i.quantity - i.available), 0);

  return (
    <div>
      <PageHeader
        title={t("Uniform Management")}
        description={`${items.length} ${t('uniform types')} · ${totalAvailable} ${t('available')} · ${totalIssued} ${t('issued')}`}
        actions={
          <Button onClick={() => navigate('/inventory?module=uniforms')}>
            <Plus className="h-4 w-4 mr-1" /> {t('Add Uniform')}
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("Search uniforms...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t("Class")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Classes')}</SelectItem>
                {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={t("Gender")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All')}</SelectItem>
                <SelectItem value="Boys">{t('Boys')}</SelectItem>
                <SelectItem value="Girls">{t('Girls')}</SelectItem>
                <SelectItem value="Unisex">{t('Unisex')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t("Type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Types')}</SelectItem>
                {types.map((tp) => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder={t("Year")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Years')}</SelectItem>
                {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder={t("Stock")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Stock')}</SelectItem>
                <SelectItem value="in_stock">{t('In Stock')}</SelectItem>
                <SelectItem value="low_stock">{t('Low Stock')}</SelectItem>
                <SelectItem value="out_of_stock">{t('Out of Stock')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={Shirt} title={t("No uniforms found")} description={t("Try adjusting your filters.")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Item')}</TableHead>
                  <TableHead>{t('Type')}</TableHead>
                  <TableHead>{t('Class')}</TableHead>
                  <TableHead>{t('Gender')}</TableHead>
                  <TableHead>{t('Size')}</TableHead>
                  <TableHead>{t('Acad. Year')}</TableHead>
                  <TableHead className="text-right">{t('Available')}</TableHead>
                  <TableHead className="text-right">{t('Issued')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const issued = item.quantity - item.available;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.uniform?.uniformType ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.uniform?.classGrade ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.uniform?.gender ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.uniform?.size ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.uniform?.academicYear ?? '—'}</TableCell>
                      <TableCell className="text-right font-medium">{item.available}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{issued}</TableCell>
                      <TableCell><StatusBadge status={item.status} /></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/inventory/${item.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
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
