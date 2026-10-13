import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Wallet, CheckCircle2, Clock, Package, School, Zap } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { useOrgConfig } from '@/hooks/useOrgConfig';
import { useTranslation } from '@/hooks/useTranslation';
import { feeService, classService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { PrintReceipt } from '@/components/shared/PrintReceipt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { OrgClass, OrgClassDetail, ClassStudentRow, FeeRecord } from '@/types';

// ── Status display config (no waive) ─────────────────────────────────────────
const FEE_STATUS: Record<string, { label: string; color: string }> = {
  no_fee:      { label: 'No Items',    color: 'text-gray-500 border-gray-200' },
  unpaid:      { label: 'Pending',     color: 'text-amber-600 border-amber-200 bg-amber-50' },
  partial:     { label: 'Partial',     color: 'text-blue-600 border-blue-200 bg-blue-50' },
  paid:        { label: 'Paid',        color: 'text-emerald-600 border-emerald-200 bg-emerald-50' },
  distributed: { label: 'Distributed', color: 'text-purple-600 border-purple-200 bg-purple-50' },
};

interface ReceiptPayload {
  fee: FeeRecord;
  studentName: string;
  studentIdentifier?: string;
  className: string;
  academicYear?: string;
  items: { name: string; qty: number; unitPrice: number; amount: number }[];
  totalFee: number;
  amountPaid: number;
}

export function FeesPage() {
  const { currentOrg } = useOrganization();
  const { can } = useAuth();
  const canDistribute = can('assignments:create');
  const canCollect = can('assignments:update');
  const config = useOrgConfig();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [classes, setClasses] = useState<OrgClass[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [academicYear, setAcademicYear] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedClass, setSelectedClass] = useState<OrgClassDetail | null>(null);
  const [classLoading, setClassLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // ── Student action dialog ─────────────────────────────────────────────────
  const [activeStudent, setActiveStudent] = useState<ClassStudentRow | null>(null);
  const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(new Set());
  const [collectAmount, setCollectAmount] = useState('');
  const [collectNotes, setCollectNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Bulk distribute ───────────────────────────────────────────────────────
  const [bulkDistConfirm, setBulkDistConfirm] = useState(false);
  const [bulkDistributing, setBulkDistributing] = useState(false);

  // ── Receipt ───────────────────────────────────────────────────────────────
  const [receiptPayload, setReceiptPayload] = useState<ReceiptPayload | null>(null);

  // ── Load all classes ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentOrg) return;
    classService.getAll()
      .then(setClasses)
      .catch(() => toast({ title: t('Error'), description: t('Failed to load classes'), variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [currentOrg]);

  // ── Load selected class detail ────────────────────────────────────────────
  useEffect(() => {
    if (!selectedClassId) {
      setSelectedClass(null);
      setStudentSearch('');
      return;
    }
    setClassLoading(true);
    setStudentSearch('');
    classService.getById(selectedClassId)
      .then(async (cls) => {
        // Auto-assign fee records for students who don't have one yet
        const hasItems = cls.items.length > 0;
        const hasNoFee = (cls.students ?? []).some(s => s.feeStatus === 'no_fee');
        if (hasItems && hasNoFee) {
          try {
            await classService.assignFees(cls.id);
            cls = await classService.getById(selectedClassId);
          } catch {
            toast({
              title: t('Warning'),
              description: t('Some students could not be assigned fees automatically. Try again or check class items.'),
              variant: 'destructive',
            });
          }
        }
        setSelectedClass(cls);
      })
      .catch(() => toast({ title: t('Error'), description: t('Failed to load class'), variant: 'destructive' }))
      .finally(() => setClassLoading(false));
  }, [selectedClassId]);

  // ── Sync collect amount when checklist changes ────────────────────────────
  useEffect(() => {
    if (!activeStudent || !selectedClass) return;
    const total = selectedClass.items
      .filter(ci => checkedItemIds.has(ci.id))
      .reduce((s, ci) => s + (ci.unitPrice || 0) * ci.quantity, 0);
    setCollectAmount(String(total));
  }, [checkedItemIds]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const academicYears = useMemo(() => {
    const years = [...new Set(classes.map(c => c.academicYear).filter(Boolean) as string[])];
    return years.sort().reverse();
  }, [classes]);

  const filteredClasses = useMemo(() =>
    academicYear ? classes.filter(c => c.academicYear === academicYear) : classes,
    [classes, academicYear]
  );

  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    const students = selectedClass.students ?? [];
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(q) || (s.identifier ?? '').toLowerCase().includes(q)
    );
  }, [selectedClass, studentSearch]);

  const classItems = selectedClass?.items ?? [];
  const checkedItems = classItems.filter(ci => checkedItemIds.has(ci.id));
  const checkedTotal = checkedItems.reduce((s, ci) => s + (ci.unitPrice || 0) * ci.quantity, 0);

  // ── Open student dialog ───────────────────────────────────────────────────
  function openStudent(student: ClassStudentRow) {
    setActiveStudent(student);
    // Pre-check all items
    setCheckedItemIds(new Set(classItems.map(ci => ci.id)));
    // Pre-fill amount
    const total = classItems.reduce((s, ci) => s + (ci.unitPrice || 0) * ci.quantity, 0);
    setCollectAmount(String(total));
    setCollectNotes('');
  }

  function toggleItem(id: string) {
    setCheckedItemIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function refreshSelectedClass() {
    if (!selectedClass) return;
    const cls = await classService.getById(selectedClass.id);
    setSelectedClass(cls);
  }

  // ── Bulk distribute all paid students ─────────────────────────────────────
  async function handleBulkDistribute() {
    if (!selectedClass) return;
    setBulkDistributing(true);
    try {
      const result = await classService.distributePaid(selectedClass.id);
      await refreshSelectedClass();
      setBulkDistConfirm(false);
      toast({ title: t('Done'), description: `${result.distributed} ${t('student(s) distributed successfully')}` });
    } catch {
      toast({ title: t('Error'), description: t('Bulk distribute failed'), variant: 'destructive' });
    } finally {
      setBulkDistributing(false);
    }
  }

  // ── Main action: collect (if needed) + distribute ─────────────────────────
  async function handleAction() {
    if (!activeStudent || !selectedClass) return;
    if (!activeStudent.feeRecordId) {
      toast({ title: t('Error'), description: t('No fee record found. Please add items to the class first.'), variant: 'destructive' });
      return;
    }
    if (checkedItems.length === 0) {
      toast({ title: t('Error'), description: t('Select at least one item to distribute.'), variant: 'destructive' });
      return;
    }

    const status = activeStudent.feeStatus;
    const needsPayment = checkedTotal > 0 && (status === 'unpaid' || status === 'partial' || status === 'no_fee');

    if (needsPayment) {
      const amt = parseFloat(collectAmount);
      if (isNaN(amt) || amt < 0) {
        toast({ title: t('Error'), description: t('Enter a valid payment amount.'), variant: 'destructive' });
        return;
      }
    }

    setSaving(true);
    try {
      // Step 1: Record payment if needed
      if (needsPayment) {
        const amt = parseFloat(collectAmount);
        await feeService.pay(activeStudent.feeRecordId, amt, collectNotes || undefined);
      } else if (checkedTotal === 0 && (status === 'unpaid' || status === 'no_fee')) {
        // Zero-price items — mark as paid with ₹0
        await feeService.pay(activeStudent.feeRecordId, 0);
      }

      // Step 2: Distribute (with optional item subset)
      const allItemIds = classItems.map(ci => ci.itemId).filter(Boolean) as string[];
      const filteredIds = classItems
        .filter(ci => checkedItemIds.has(ci.id) && ci.itemId)
        .map(ci => ci.itemId!);
      const isSubset = filteredIds.length < allItemIds.length;

      const distributedFee = await feeService.distribute(
        activeStudent.feeRecordId,
        isSubset ? filteredIds : undefined,
      );

      // Step 3: Build receipt data
      const amtPaid = needsPayment
        ? parseFloat(collectAmount)
        : activeStudent.paidAmount;

      setReceiptPayload({
        fee: distributedFee,
        studentName: activeStudent.name,
        studentIdentifier: activeStudent.identifier,
        className: selectedClass.name,
        academicYear: selectedClass.academicYear,
        items: checkedItems.map(ci => ({
          name: ci.itemName,
          qty: ci.quantity,
          unitPrice: ci.unitPrice || 0,
          amount: (ci.unitPrice || 0) * ci.quantity,
        })),
        totalFee: checkedTotal,
        amountPaid: amtPaid,
      });

      setActiveStudent(null);
      await refreshSelectedClass();
      toast({ title: t('Success'), description: t('Items distributed successfully') });
    } catch (err: unknown) {
      const msg = (err as { detail?: string })?.detail || t('Failed to process. Please try again.');
      toast({ title: t('Error'), description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  // ── KPI counts for selected class ─────────────────────────────────────────
  const students = selectedClass?.students ?? [];
  const kpiPending = students.filter(s => s.feeStatus === 'unpaid' || s.feeStatus === 'partial').length;
  const kpiPaid = students.filter(s => s.feeStatus === 'paid').length;
  const kpiDist = students.filter(s => s.feeStatus === 'distributed').length;

  // ── Determine dialog button state ─────────────────────────────────────────
  const status = activeStudent?.feeStatus ?? '';
  const isDistributed = status === 'distributed';
  const noItems = classItems.length === 0;
  const noChecked = checkedItems.length === 0;
  const showAmountInput = checkedTotal > 0 && (status === 'unpaid' || status === 'partial');

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader
        title={t('Fee Collection')}
        description={t('Search for a student by academic year and class, then collect fees and distribute items.')}
      />

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Academic year */}
        <Select value={academicYear || 'all'} onValueChange={v => { setAcademicYear(v === 'all' ? '' : v); setSelectedClassId(''); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t('All Academic Years')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Academic Years')}</SelectItem>
            {academicYears.map(y => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Class */}
        <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={filteredClasses.length === 0}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder={t('Select a class')} />
          </SelectTrigger>
          <SelectContent>
            {filteredClasses.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}{c.academicYear ? ` · ${c.academicYear}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Student search */}
        {selectedClass && (
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('Search by name or roll no…')}
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
      </div>

      {/* ── Loading / empty states ───────────────────────────────────────────── */}
      {loading && <p className="text-sm text-muted-foreground">{t('Loading…')}</p>}

      {!loading && classes.length === 0 && (
        <EmptyState
          icon={School}
          title={t('No classes found')}
          description={t('Create a class, add items with prices, and enrol students to start collecting fees.')}
          action={<Button onClick={() => navigate('/classes')}>{t('Go to Classes')}</Button>}
        />
      )}

      {!loading && classes.length > 0 && !selectedClassId && (
        <div className="text-sm text-muted-foreground py-8 text-center">
          {t('Select an academic year and class above to view students.')}
        </div>
      )}

      {classLoading && (
        <p className="text-sm text-muted-foreground py-4">{t('Loading class…')}</p>
      )}

      {/* ── Class selected: KPIs + student list ─────────────────────────────── */}
      {selectedClass && !classLoading && (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <Card><CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-500 shrink-0" />
              <div><p className="text-xs text-muted-foreground">{t('Pending')}</p><p className="text-2xl font-bold">{kpiPending}</p></div>
            </CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3">
              <Wallet className="h-5 w-5 text-emerald-500 shrink-0" />
              <div><p className="text-xs text-muted-foreground">{t('Paid')}</p><p className="text-2xl font-bold">{kpiPaid}</p></div>
            </CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3">
              <Package className="h-5 w-5 text-purple-500 shrink-0" />
              <div><p className="text-xs text-muted-foreground">{t('Distributed')}</p><p className="text-2xl font-bold">{kpiDist}</p></div>
            </CardContent></Card>
          </div>

          {/* Bulk distribute button — shown when any students are in paid state */}
          {canDistribute && kpiPaid > 0 && (
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-xs text-muted-foreground">
                <strong>{kpiPaid}</strong> {t('student(s) paid and ready to distribute')}
              </span>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setBulkDistConfirm(true)}>
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                {t('Distribute All Paid')} ({kpiPaid})
              </Button>
            </div>
          )}

          {/* Flow guide */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 px-1">
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">1. Find student</span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">2. Tick items &amp; collect fee</span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">3. Distribute &amp; print receipt</span>
          </div>

          {/* Student table */}
          {filteredStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {studentSearch ? t('No students match the search.') : t('No students enrolled in this class.')}
            </p>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold">#</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold">{t('Student')}</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold">{t('Roll No')}</th>
                        <th className="text-center px-4 py-2.5 text-xs font-semibold">{t('Status')}</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold">{t('Total')}</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold">{t('Paid')}</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold">{t('Action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredStudents.map((s, idx) => {
                        const fsCfg = FEE_STATUS[s.feeStatus] ?? FEE_STATUS.no_fee;
                        return (
                          <tr key={s.recipientId} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium">{s.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{s.identifier ?? '—'}</td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="outline" className={`text-xs ${fsCfg.color}`}>{t(fsCfg.label)}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {s.totalAmount > 0 ? `${config.currencySymbol}${s.totalAmount}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {s.paidAmount > 0 ? `${config.currencySymbol}${s.paidAmount}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {s.feeStatus === 'distributed' ? (
                                <span className="text-xs text-purple-600 font-medium flex items-center justify-end gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> {t('Done')}
                                </span>
                              ) : s.feeStatus === 'no_fee' ? (
                                <span className="text-xs text-muted-foreground">{t('No items')}</span>
                              ) : (canCollect || canDistribute) ? (
                                <Button size="sm" className="h-7 text-xs" onClick={() => openStudent(s)}>
                                  {s.feeStatus === 'paid' ? t('Distribute') : t('Process')}
                                </Button>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ── Student action dialog ────────────────────────────────────────────── */}
      <Dialog open={!!activeStudent} onOpenChange={open => !open && setActiveStudent(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-base">{activeStudent?.name}</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeStudent?.identifier ? `Roll: ${activeStudent.identifier} · ` : ''}
                  {selectedClass?.name}
                  {selectedClass?.academicYear ? ` (${selectedClass.academicYear})` : ''}
                </p>
              </div>
              {activeStudent && (
                <Badge variant="outline" className={`text-xs ${(FEE_STATUS[activeStudent.feeStatus] ?? FEE_STATUS.no_fee).color} shrink-0 ml-2`}>
                  {t((FEE_STATUS[activeStudent.feeStatus] ?? FEE_STATUS.no_fee).label)}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">

            {/* Items checklist */}
            {noItems ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {t('No items are assigned to this class. Please add items from the Classes page first.')}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                {/* Table header */}
                <div className="grid gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 border-b"
                  style={{ gridTemplateColumns: '28px 1fr 48px 72px 72px' }}>
                  <span />
                  <span>{t('Item')}</span>
                  <span className="text-center">{t('Qty')}</span>
                  <span className="text-right">{t('Price')}</span>
                  <span className="text-right">{t('Total')}</span>
                </div>

                {/* Item rows */}
                {classItems.map(ci => {
                  const lineTotal = (ci.unitPrice || 0) * ci.quantity;
                  const checked = checkedItemIds.has(ci.id);
                  return (
                    <div
                      key={ci.id}
                      className={`grid gap-2 px-3 py-2.5 items-center border-b last:border-0 cursor-pointer transition-colors ${
                        isDistributed ? 'opacity-60' : checked ? 'bg-white hover:bg-muted/20' : 'bg-muted/30 opacity-70'
                      }`}
                      style={{ gridTemplateColumns: '28px 1fr 48px 72px 72px' }}
                      onClick={() => !isDistributed && toggleItem(ci.id)}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={isDistributed}
                        onCheckedChange={() => !isDistributed && toggleItem(ci.id)}
                        onClick={e => e.stopPropagation()}
                      />
                      <span className="text-sm font-medium truncate">{ci.itemName}</span>
                      <span className="text-sm text-center text-muted-foreground">{ci.quantity}</span>
                      <span className="text-sm text-right text-muted-foreground">
                        {ci.unitPrice > 0 ? `${config.currencySymbol}${ci.unitPrice}` : '—'}
                      </span>
                      <span className={`text-sm text-right font-medium ${checked ? '' : 'line-through text-muted-foreground'}`}>
                        {lineTotal > 0 ? `${config.currencySymbol}${lineTotal}` : '—'}
                      </span>
                    </div>
                  );
                })}

                {/* Summary row */}
                <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-t text-sm">
                  <span className="font-semibold text-muted-foreground">
                    {checkedItems.length} {t('item(s) selected')}
                  </span>
                  <span className="font-bold text-base">
                    {config.currencySymbol}{checkedTotal}
                  </span>
                </div>
              </div>
            )}

            {/* Already distributed */}
            {isDistributed && (
              <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {t('Items have already been distributed to this student.')}
              </div>
            )}

            {/* Partial paid info */}
            {activeStudent?.feeStatus === 'partial' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
                {t('Partial payment received')}: <strong>{config.currencySymbol}{activeStudent.paidAmount}</strong> {t('of')} <strong>{config.currencySymbol}{activeStudent.totalAmount}</strong>.
                {' '}{t('Enter the remaining balance or full amount below.')}
              </div>
            )}

            {/* Payment input — shown when fee > 0 and not yet fully paid */}
            {!isDistributed && !noItems && !noChecked && showAmountInput && (
              <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('Collect Payment')}</p>
                <div className="space-y-1.5">
                  <Label className="text-sm">{t('Amount Received')} *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{config.currencySymbol}</span>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={collectAmount}
                      onChange={e => setCollectAmount(e.target.value)}
                      className="pl-7"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{t('Notes')} ({t('optional')})</Label>
                  <Input
                    value={collectNotes}
                    onChange={e => setCollectNotes(e.target.value)}
                    placeholder={t('e.g. Cash, Cheque no. 1234')}
                  />
                </div>
              </div>
            )}

          </div>

          <DialogFooter className="shrink-0 pt-2 border-t mt-2">
            <Button variant="outline" onClick={() => setActiveStudent(null)}>{t('Cancel')}</Button>

            {isDistributed ? (
              <Button disabled variant="secondary">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> {t('Already Distributed')}
              </Button>
            ) : noItems || noChecked ? (
              <Button disabled>
                {noItems ? t('No items in class') : t('Select at least one item')}
              </Button>
            ) : (
              <Button onClick={handleAction} disabled={saving} className="min-w-36">
                <Package className="h-3.5 w-3.5 mr-1.5" />
                {saving
                  ? t('Processing…')
                  : showAmountInput
                    ? t('Collect & Distribute')
                    : t('Distribute & Print Receipt')
                }
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk distribute confirmation ─────────────────────────────────────── */}
      <Dialog open={bulkDistConfirm} onOpenChange={open => !open && setBulkDistConfirm(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('Distribute All Paid Students')}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('This will distribute items to all')} <strong>{kpiPaid}</strong> {t('paid student(s) in')} <strong>{selectedClass?.name}</strong>.
            </p>
            {selectedClass && selectedClass.items.length > 0 && (
              <div className="border rounded-lg divide-y text-sm">
                {selectedClass.items.map(ci => (
                  <div key={ci.id} className="flex justify-between items-center px-3 py-2">
                    <span className="font-medium">{ci.itemName}</span>
                    <span className="text-muted-foreground">{ci.quantity} {t('unit(s)')}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t('Stock will be reduced and all paid students will be marked as Distributed. This cannot be undone.')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDistConfirm(false)}>{t('Cancel')}</Button>
            <Button onClick={handleBulkDistribute} disabled={bulkDistributing}>
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              {bulkDistributing ? t('Distributing…') : t('Confirm Distribute All')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Receipt dialog ───────────────────────────────────────────────────── */}
      {receiptPayload && (
        <PrintReceipt
          open={!!receiptPayload}
          onOpenChange={open => !open && setReceiptPayload(null)}
          orgName={currentOrg.name}
          orgAddress={currentOrg.address}
          orgLogoUrl={currentOrg.logoUrl}
          title={t('Fee Collection Receipt')}
          receiptNo={receiptPayload.fee.id.replace(/\D/g, '').slice(-8).padStart(8, '0')}
          date={receiptPayload.fee.distributedDate ?? receiptPayload.fee.paymentDate ?? new Date().toISOString().slice(0, 10)}
          fields={[
            { label: t('Student'), value: receiptPayload.studentName },
            { label: t('Roll No'), value: receiptPayload.studentIdentifier ?? '—' },
            { label: t('Class'), value: receiptPayload.className },
            ...(receiptPayload.academicYear ? [{ label: t('Academic Year'), value: receiptPayload.academicYear }] : []),
          ]}
          items={receiptPayload.items.map(i => ({
            name: i.name,
            qty: i.qty,
            unitPrice: i.unitPrice,
            amount: i.amount,
          }))}
          totalAmount={receiptPayload.totalFee}
          paidAmount={receiptPayload.amountPaid}
          currencySymbol={config.currencySymbol}
          statusLabel={receiptPayload.amountPaid >= receiptPayload.totalFee ? t('PAID') : t('PARTIAL')}
          statusColor={receiptPayload.amountPaid >= receiptPayload.totalFee ? 'green' : 'amber'}
          showSignature
          footer={`${t('Thank you for your payment')} · ${currentOrg.name}`}
        />
      )}
    </div>
  );
}
