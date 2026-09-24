import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Wallet, CheckCircle2, Clock, Package } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useOrgConfig } from '@/hooks/useOrgConfig';
import { useTranslation } from '@/hooks/useTranslation';
import { feeService, classService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { FeeRecord, OrgClass } from '@/types';

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  unpaid:     { label: 'Pending',     variant: 'secondary' },
  partial:     { label: 'Partial',     variant: 'outline' },
  paid:        { label: 'Paid',        variant: 'default' },
  waived:      { label: 'Waived',      variant: 'outline' },
  distributed: { label: 'Distributed', variant: 'default' },
};

export function FeesPage() {
  const { currentOrg } = useOrganization();
  const config = useOrgConfig();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [classes, setClasses] = useState<OrgClass[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // Collect fee dialog
  const [collectTarget, setCollectTarget] = useState<FeeRecord | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectNotes, setCollectNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    Promise.all([feeService.getAll(), classService.getAll()])
      .then(([f, c]) => { setFees(f); setClasses(c); })
      .finally(() => setLoading(false));
  }, [currentOrg]);

  const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);

  const filtered = useMemo(() => {
    let list = fees;
    if (statusFilter) list = list.filter(f => f.status === statusFilter);
    if (classFilter) list = list.filter(f => f.classId === classFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.recipientName?.toLowerCase().includes(q) ||
        f.className?.toLowerCase().includes(q) ||
        f.templateName?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [fees, statusFilter, classFilter, search]);

  // KPI counts
  const unpaid = fees.filter(f => f.status === 'unpaid').length;
  const partial = fees.filter(f => f.status === 'partial').length;
  const paid = fees.filter(f => f.status === 'paid').length;
  const distributed = fees.filter(f => f.status === 'distributed').length;

  async function handleCollect() {
    if (!collectTarget) return;
    const amt = parseFloat(collectAmount);
    if (isNaN(amt) || amt <= 0) return;
    setSaving(true);
    try {
      const updated = await feeService.pay(collectTarget.id, amt, collectNotes || undefined);
      setFees(prev => prev.map(f => f.id === updated.id ? updated : f));
      setCollectTarget(null);
      setCollectAmount('');
      setCollectNotes('');
      toast({ title: t('Payment recorded') });
    } catch {
      toast({ title: t('Error'), description: t('Failed to record payment'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleWaive(fee: FeeRecord) {
    if (!confirm(`${t('Waive fee for')} ${fee.recipientName}?`)) return;
    try {
      const updated = await feeService.waive(fee.id);
      setFees(prev => prev.map(f => f.id === updated.id ? updated : f));
      toast({ title: t('Fee waived') });
    } catch {
      toast({ title: t('Error'), description: t('Failed to waive fee'), variant: 'destructive' });
    }
  }

  async function handleDistribute(fee: FeeRecord) {
    try {
      const updated = await feeService.distribute(fee.id);
      setFees(prev => prev.map(f => f.id === updated.id ? updated : f));
      toast({ title: t('Items distributed') });
    } catch {
      toast({ title: t('Error'), description: t('Failed to distribute'), variant: 'destructive' });
    }
  }

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader
        title={t('Fee Collection')}
        description={`${fees.length} ${t('fee records')} · ${unpaid + partial} ${t('unpaid')}`}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'unpaid' ? '' : 'unpaid')}>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{t('Pending')}</p>
              <p className="text-2xl font-bold">{unpaid}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'partial' ? '' : 'partial')}>
          <CardContent className="p-4 flex items-center gap-3">
            <Wallet className="h-5 w-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{t('Partial')}</p>
              <p className="text-2xl font-bold">{partial}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'paid' ? '' : 'paid')}>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{t('Paid')}</p>
              <p className="text-2xl font-bold">{paid}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'distributed' ? '' : 'distributed')}>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{t('Distributed')}</p>
              <p className="text-2xl font-bold">{distributed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Search by student or class…')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter || '__all__'} onValueChange={v => setStatusFilter(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-36 h-10">
            <SelectValue placeholder={t('All Status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('All Status')}</SelectItem>
            <SelectItem value="unpaid">{t('Pending')}</SelectItem>
            <SelectItem value="partial">{t('Partial')}</SelectItem>
            <SelectItem value="paid">{t('Paid')}</SelectItem>
            <SelectItem value="waived">{t('Waived')}</SelectItem>
            <SelectItem value="distributed">{t('Distributed')}</SelectItem>
          </SelectContent>
        </Select>
        {classes.length > 0 && (
          <Select value={classFilter || '__all__'} onValueChange={v => setClassFilter(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-44 h-10">
              <SelectValue placeholder={t('All Classes')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('All Classes')}</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.academicYear ? ` (${c.academicYear})` : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {(statusFilter || classFilter || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(''); setClassFilter(''); setSearch(''); }}>
            {t('Clear filters')}
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('Loading…')}</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={t('No fee records found')}
          description={t('Fee records are created when you assign items to a class and collect fees.')}
          action={<Button onClick={() => navigate('/classes')}>{t('Go to Classes')}</Button>}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {filtered.length} {t('records')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t(config.recipientLabel)}</TableHead>
                  <TableHead>{t('Class')}</TableHead>
                  <TableHead>{t('Package')}</TableHead>
                  <TableHead className="text-right">{t('Total')}</TableHead>
                  <TableHead className="text-right">{t('Paid')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead className="text-right">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(fee => {
                  const sb = STATUS_BADGE[fee.status] ?? STATUS_BADGE.unpaid;
                  return (
                    <TableRow key={fee.id}>
                      <TableCell
                        className="font-medium cursor-pointer hover:underline"
                        onClick={() => fee.recipientId && navigate(`/recipients/${fee.recipientId}`)}
                      >
                        {fee.recipientName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fee.classId ? classMap.get(fee.classId)?.name ?? fee.className : fee.className ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fee.templateName ?? '—'}</TableCell>
                      <TableCell className="text-right font-medium">₹{fee.totalAmount}</TableCell>
                      <TableCell className="text-right">₹{fee.paidAmount}</TableCell>
                      <TableCell>
                        <Badge variant={sb.variant} className="text-xs">{t(sb.label)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(fee.status === 'unpaid' || fee.status === 'partial') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => { setCollectTarget(fee); setCollectAmount(String(fee.totalAmount - fee.paidAmount)); }}
                            >
                              {t('Collect')}
                            </Button>
                          )}
                          {(fee.status === 'unpaid' || fee.status === 'partial') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-muted-foreground"
                              onClick={() => handleWaive(fee)}
                            >
                              {t('Waive')}
                            </Button>
                          )}
                          {(fee.status === 'paid' || fee.status === 'waived') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleDistribute(fee)}
                            >
                              {t('Distribute')}
                            </Button>
                          )}
                          {fee.status === 'distributed' && (
                            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> {t('Done')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Collect Fee Dialog */}
      <Dialog open={!!collectTarget} onOpenChange={open => !open && setCollectTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('Collect Fee')} — {collectTarget?.recipientName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground space-y-1">
              {collectTarget?.className && <p>{t('Class')}: <strong>{collectTarget.className}</strong></p>}
              <p>{t('Total')}: <strong>₹{collectTarget?.totalAmount}</strong> · {t('Paid')}: <strong>₹{collectTarget?.paidAmount}</strong></p>
              <p>{t('Balance')}: <strong className="text-amber-600">₹{(collectTarget?.totalAmount ?? 0) - (collectTarget?.paidAmount ?? 0)}</strong></p>
            </div>
            <div className="space-y-1.5">
              <Label>{t('Amount Paid')} *</Label>
              <Input
                type="number"
                min={1}
                value={collectAmount}
                onChange={e => setCollectAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Notes')} ({t('optional')})</Label>
              <Input
                value={collectNotes}
                onChange={e => setCollectNotes(e.target.value)}
                placeholder={t('e.g. Cash payment')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectTarget(null)}>{t('Cancel')}</Button>
            <Button onClick={handleCollect} disabled={saving}>{saving ? t('Saving…') : t('Record Payment')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
