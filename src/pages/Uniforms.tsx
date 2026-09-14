import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Shirt, Eye } from 'lucide-react';
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
import type { Item } from '@/types';

export function UniformsPage() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
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
        title="Uniform Management"
        description={`${items.length} uniform types · ${totalAvailable} available · ${totalIssued} issued`}
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search uniforms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Boys">Boys</SelectItem>
                <SelectItem value="Girls">Girls</SelectItem>
                <SelectItem value="Unisex">Unisex</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
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
            <EmptyState icon={Shirt} title="No uniforms found" description="Try adjusting your filters." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Acad. Year</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Issued</TableHead>
                  <TableHead>Status</TableHead>
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
