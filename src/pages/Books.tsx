import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, Eye, ArrowDownCircle, ArrowUpCircle, RotateCcw, AlertCircle, Plus } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { inventoryService, transactionService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { KPICard } from '@/components/shared/KPICard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import type { Item, StockTransaction } from '@/types';

export function BooksPage() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');

  useEffect(() => {
    if (!currentOrg) return;
    inventoryService.getByOrganization(currentOrg.id).then((all) =>
      setItems(all.filter((i) => i.module === 'books'))
    );
    transactionService.getByOrganization(currentOrg.id).then(setTransactions);
  }, [currentOrg]);

  const classes = useMemo(() => [...new Set(items.map((i) => i.book?.classGrade).filter(Boolean) as string[])], [items]);
  const subjects = useMemo(() => [...new Set(items.map((i) => i.book?.subject).filter(Boolean) as string[])], [items]);

  const bookItemIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const bookTx = useMemo(() => transactions.filter((t) => bookItemIds.has(t.itemId)), [transactions, bookItemIds]);

  const received = bookTx.filter((t) => t.type === 'received').reduce((a, t) => a + Math.abs(t.quantity), 0);
  const issued = bookTx.filter((t) => t.type === 'issued').reduce((a, t) => a + Math.abs(t.quantity), 0);
  const returned = bookTx.filter((t) => t.type === 'returned').reduce((a, t) => a + Math.abs(t.quantity), 0);
  const damaged = bookTx.filter((t) => t.type === 'damaged').reduce((a, t) => a + Math.abs(t.quantity), 0);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (
        search &&
        !item.name.toLowerCase().includes(search.toLowerCase()) &&
        !(item.book?.isbn?.toLowerCase().includes(search.toLowerCase()))
      ) return false;
      if (classFilter !== 'all' && item.book?.classGrade !== classFilter) return false;
      if (subjectFilter !== 'all' && item.book?.subject !== subjectFilter) return false;
      return true;
    });
  }, [items, search, classFilter, subjectFilter]);

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader
        title={t("Book Management")}
        description={`${items.length} ${t('book titles in inventory')}`}
        actions={
          <Button onClick={() => navigate('/inventory?module=books')}>
            <Plus className="h-4 w-4 mr-1" /> {t('Add Book')}
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label={t("Books Received")} value={received} icon={ArrowDownCircle} variant="success" />
        <KPICard label={t("Books Issued")} value={issued} icon={ArrowUpCircle} variant="default" />
        <KPICard label={t("Books Returned")} value={returned} icon={RotateCcw} variant="default" />
        <KPICard label={t("Books Damaged")} value={damaged} icon={AlertCircle} variant="danger" />
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("Search by name or ISBN...")}
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
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t("Subject")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Subjects')}</SelectItem>
                {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={BookOpen} title={t("No books found")} description={t("Try adjusting your filters.")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Book Name')}</TableHead>
                  <TableHead>{t('ISBN')}</TableHead>
                  <TableHead>{t('Subject')}</TableHead>
                  <TableHead>{t('Class')}</TableHead>
                  <TableHead>{t('Edition')}</TableHead>
                  <TableHead>{t('Publisher')}</TableHead>
                  <TableHead>{t('Acad. Year')}</TableHead>
                  <TableHead className="text-right">{t('Qty')}</TableHead>
                  <TableHead className="text-right">{t('Available')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.book?.isbn ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.book?.subject ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.book?.classGrade ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.book?.edition ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[140px] truncate">{item.book?.publisher ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.book?.academicYear ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                    <TableCell className="text-right font-medium">{item.available}</TableCell>
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
