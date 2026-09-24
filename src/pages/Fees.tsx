import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Wallet, CheckCircle2, Clock, Package, ArrowLeft, School, Users } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { OrgClass, OrgClassDetail, ClassStudentRow } from '@/types';

const FEE_STATUS: Record<string, { label: string; color: string }> = {
  no_fee:      { label: 'No Fee',     color: 'text-gray-500 border-gray-200' },
  unpaid:      { label: 'Pending',    color: 'text-amber-600 border-amber-200 bg-amber-50' },
  partial:     { label: 'Partial',    color: 'text-blue-600 border-blue-200 bg-blue-50' },
  paid:        { label: 'Paid',       color: 'text-emerald-600 border-emerald-200 bg-emerald-50' },
  waived:      { label: 'Waived',     color: 'text-gray-500 border-gray-200' },
  distributed: { label: 'Distributed', color: 'text-purple-600 border-purple-200 bg-purple-50' },
};

export function FeesPage() {
  const { currentOrg } = useOrganization();
  const config = useOrgConfig();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [classes, setClasses] = useState<OrgClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<OrgClassDetail | null>(null);
  const [classLoading, setClassLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // Collect fee dialog
  const [collectTarget, setCollectTarget] = useState<ClassStudentRow | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectNotes, setCollectNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    classService.getAll()
      .then(setClasses)
      .catch(() => toast({ title: t('Error'), description: t('Failed to load classes'), variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [currentOrg]);

  async function selectClass(classId: string) {
    setClassLoading(true);
    setStudentSearch('');
    try {
      const cls = await classService.getById(classId);
      setSelectedClass(cls);
    } catch {
      toast({ title: t('Error'), description: t('Failed to load class'), variant: 'destructive' });
    } finally {
      setClassLoading(false);
    }
  }

  async function refreshSelectedClass() {
    if (!selectedClass) return;
    const cls = await classService.getById(selectedClass.id);
    setSelectedClass(cls);
  }

  async function handleCollect() {
    if (!collectTarget?.feeRecordId) return;
    const amt = parseFloat(collectAmount);
    if (isNaN(amt) || amt <= 0) return;
    setSaving(true);
    try {
      await feeService.pay(collectTarget.feeRecordId, amt, collectNotes || undefined);
      await refreshSelectedClass();
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

  async function handleWaive(student: ClassStudentRow) {
    if (!student.feeRecordId) return;
    if (!confirm(`${t('Waive fee for')} ${student.name}?`)) return;
    try {
      await feeService.waive(student.feeRecordId);
      await refreshSelectedClass();
      toast({ title: t('Fee waived') });
    } catch {
      toast({ title: t('Error'), description: t('Failed to waive fee'), variant: 'destructive' });
    }
  }

  async function handleDistribute(student: ClassStudentRow) {
    if (!student.feeRecordId) return;
    try {
      await feeService.distribute(student.feeRecordId);
      await refreshSelectedClass();
      toast({ title: t('Items distributed') });
    } catch {
      toast({ title: t('Error'), description: t('Failed to distribute'), variant: 'destructive' });
    }
  }

  async function handleAssignFee(student: ClassStudentRow) {
    if (!selectedClass) return;
    try {
      const res = await classService.assignFees(selectedClass.id, { recipientId: student.recipientId });
      await refreshSelectedClass();
      if (res.created > 0) toast({ title: t('Fee assigned') });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      toast({ title: t('Error'), description: msg || t('Failed to assign fee'), variant: 'destructive' });
    }
  }

  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    const students = selectedClass.students ?? [];
    if (!studentSearch) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(q) || s.identifier?.toLowerCase().includes(q)
    );
  }, [selectedClass, studentSearch]);

  if (!currentOrg) return null;

  // ── Student view (class selected) ─────────────────────────────────────────
  if (selectedClass) {
    const students = selectedClass.students ?? [];
    const unpaid = students.filter(s => s.feeStatus === 'unpaid' || s.feeStatus === 'partial').length;
    const paid = students.filter(s => s.feeStatus === 'paid' || s.feeStatus === 'waived').length;
    const dist = students.filter(s => s.feeStatus === 'distributed').length;

    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => setSelectedClass(null)} className="-ml-2 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('All Classes')}
        </Button>

        <PageHeader
          title={selectedClass.name}
          description={`${selectedClass.academicYear ?? ''} · ${students.length} ${t('students')} · ${unpaid} ${t('pending')}`}
        />

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500 shrink-0" />
            <div><p className="text-xs text-muted-foreground">{t('Pending')}</p><p className="text-2xl font-bold">{unpaid}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <div><p className="text-xs text-muted-foreground">{t('Paid')}</p><p className="text-2xl font-bold">{paid}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <Package className="h-5 w-5 text-purple-500 shrink-0" />
            <div><p className="text-xs text-muted-foreground">{t('Distributed')}</p><p className="text-2xl font-bold">{dist}</p></div>
          </CardContent></Card>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Search by student name or roll no…')}
            value={studentSearch}
            onChange={e => setStudentSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {filteredStudents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {studentSearch ? t('No students match the search.') : t('No students enrolled.')}
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
                      <th className="text-right px-4 py-2.5 text-xs font-semibold">{t('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredStudents.map((s, idx) => {
                      const fsCfg = FEE_STATUS[s.feeStatus] ?? FEE_STATUS.no_fee;
                      return (
                        <tr key={s.recipientId} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium cursor-pointer hover:underline" onClick={() => navigate(`/recipients/${s.recipientId}`)}>
                            {s.name}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{s.identifier ?? '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className={`text-xs ${fsCfg.color}`}>{t(fsCfg.label)}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {s.totalAmount > 0 ? `${config.currencySymbol}${s.totalAmount}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {s.totalAmount > 0 ? `${config.currencySymbol}${s.paidAmount}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {s.feeStatus === 'no_fee' && selectedClass.items.length > 0 && (
                                <Button size="sm" variant="outline" className="h-7 text-xs"
                                  onClick={() => handleAssignFee(s)}>
                                  {t('Assign Fee')}
                                </Button>
                              )}
                              {(s.feeStatus === 'unpaid' || s.feeStatus === 'partial') && (
                                <>
                                  <Button size="sm" className="h-7 text-xs"
                                    onClick={() => {
                                      setCollectTarget(s);
                                      setCollectAmount(String(s.totalAmount - s.paidAmount));
                                    }}>
                                    {t('Collect')}
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                                    onClick={() => handleWaive(s)}>
                                    {t('Waive')}
                                  </Button>
                                </>
                              )}
                              {(s.feeStatus === 'paid' || s.feeStatus === 'waived') && (
                                <Button size="sm" variant="outline" className="h-7 text-xs"
                                  onClick={() => handleDistribute(s)}>
                                  <Package className="h-3 w-3 mr-1" /> {t('Distribute')}
                                </Button>
                              )}
                              {s.feeStatus === 'distributed' && (
                                <span className="text-xs text-purple-600 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> {t('Done')}
                                </span>
                              )}
                            </div>
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

        {/* Collect Fee Dialog */}
        <Dialog open={!!collectTarget} onOpenChange={open => !open && setCollectTarget(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('Collect Fee')} — {collectTarget?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{t('Total')}: <strong>{config.currencySymbol}{collectTarget?.totalAmount}</strong> · {t('Paid')}: <strong>{config.currencySymbol}{collectTarget?.paidAmount}</strong></p>
                <p>{t('Balance')}: <strong className="text-amber-600">{config.currencySymbol}{(collectTarget?.totalAmount ?? 0) - (collectTarget?.paidAmount ?? 0)}</strong></p>
              </div>
              <div className="space-y-1.5">
                <Label>{t('Amount Paid')} *</Label>
                <Input
                  type="number" min={1}
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

  // ── Class list view ────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title={t('Fee Collection')}
        description={t('Select a class to view and collect student fees')}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('Loading…')}</p>
      ) : classes.length === 0 ? (
        <EmptyState
          icon={School}
          title={t('No classes found')}
          description={t('Create a class first, then enrol students and add items to start collecting fees.')}
          action={<Button onClick={() => navigate('/classes')}>{t('Go to Classes')}</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(cls => {
            const totalStudents = cls.studentCount;
            const pending = cls.unpaidCount;
            const paid = cls.paidCount;
            const dist = cls.distributedCount;
            return (
              <Card
                key={cls.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => selectClass(cls.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-base">{cls.name}</p>
                      {cls.academicYear && (
                        <p className="text-xs text-muted-foreground mt-0.5">{cls.academicYear}</p>
                      )}
                    </div>
                    <Badge variant={cls.status === 'active' ? 'default' : 'secondary'} className="text-xs shrink-0">
                      {t(cls.status === 'active' ? 'Active' : 'Closed')}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                    <Users className="h-3.5 w-3.5" />
                    <span>{totalStudents} {t('students')}</span>
                    {cls.totalFeePerStudent > 0 && (
                      <span className="ml-2 font-medium text-foreground">{config.currencySymbol}{cls.totalFeePerStudent} {t('per student')}</span>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {pending > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        {pending} {t('pending')}
                      </span>
                    )}
                    {paid > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {paid} {t('paid')}
                      </span>
                    )}
                    {dist > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        {dist} {t('distributed')}
                      </span>
                    )}
                    {pending === 0 && paid === 0 && dist === 0 && (
                      <span className="text-xs text-muted-foreground">{t('No fees assigned yet')}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {classLoading && (
        <div className="fixed inset-0 bg-background/60 flex items-center justify-center z-50">
          <p className="text-sm text-muted-foreground">{t('Loading…')}</p>
        </div>
      )}
    </div>
  );
}
