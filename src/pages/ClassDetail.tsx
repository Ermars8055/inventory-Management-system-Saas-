import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Users, Package, IndianRupee,
  CheckCircle2, Clock, XCircle, Download, UserPlus,
} from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { classService, feeService, inventoryService, classTemplateService, recipientService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import type { OrgClassDetail, OrgClassItem, ClassStudentRow, Item, Recipient, ClassTemplate } from '@/types';

// ── Status display helpers ────────────────────────────────────────────────────

const FEE_STATUS: Record<string, { label: string; color: string }> = {
  no_fee:      { label: 'No Fee',      color: 'bg-muted text-muted-foreground' },
  unpaid:      { label: 'Unpaid',      color: 'bg-red-50 text-red-700 border-red-200' },
  partial:     { label: 'Partial',     color: 'bg-amber-50 text-amber-700 border-amber-200' },
  paid:        { label: 'Paid',        color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  waived:      { label: 'Waived',      color: 'bg-blue-50 text-blue-700 border-blue-200' },
  distributed: { label: 'Distributed', color: 'bg-purple-50 text-purple-700 border-purple-200' },
};

export function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [cls, setCls] = useState<OrgClassDetail | null>(null);
  const [inventoryItems, setInventoryItems] = useState<Item[]>([]);
  const [allRecipients, setAllRecipients] = useState<Recipient[]>([]);
  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students');

  // ── Enrol student dialog ──
  const [showEnrol, setShowEnrol] = useState(false);
  const [enrolMode, setEnrolMode] = useState<'new' | 'existing'>('new');
  const [enrolSearch, setEnrolSearch] = useState('');
  const [enrolForm, setEnrolForm] = useState({ name: '', identifier: '', contact: '' });
  const [enrolRecipientId, setEnrolRecipientId] = useState('');
  const [enrolSaving, setEnrolSaving] = useState(false);

  // ── Add item dialog ──
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemMode, setItemMode] = useState<'inventory' | 'freetext'>('inventory');
  const [itemSearch, setItemSearch] = useState('');
  const [itemForm, setItemForm] = useState({ itemId: '', itemName: '', quantity: 1, unitPrice: 0, conditionIssued: 'New' });
  const [itemSaving, setItemSaving] = useState(false);

  // ── Edit item dialog ──
  const [editingItem, setEditingItem] = useState<OrgClassItem | null>(null);
  const [editForm, setEditForm] = useState({ quantity: 1, unitPrice: 0, conditionIssued: 'New' });

  // ── Import template dialog ──
  const [showImport, setShowImport] = useState(false);
  const [importTemplateId, setImportTemplateId] = useState('');
  const [importSaving, setImportSaving] = useState(false);

  // ── Collect fee dialog ──
  const [collectFor, setCollectFor] = useState<ClassStudentRow | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [paySaving, setPaySaving] = useState(false);

  const load = useCallback(async () => {
    if (!id || !currentOrg) return;
    const [detail, inv, recs, tpls] = await Promise.all([
      classService.getById(id),
      inventoryService.getByOrganization(currentOrg.id),
      recipientService.getByOrganization(currentOrg.id),
      classTemplateService.getByOrganization(currentOrg.id),
    ]);
    setCls(detail);
    setInventoryItems(inv);
    setAllRecipients(recs);
    setTemplates(tpls);
    setLoading(false);
  }, [id, currentOrg]);

  useEffect(() => { load(); }, [load]);

  if (!currentOrg) return null;
  if (loading) return <div className="p-8 text-center text-muted-foreground text-sm">{t('Loading…')}</div>;
  if (!cls) return <div className="p-8 text-center text-muted-foreground text-sm">{t('Class not found.')}</div>;

  const enrolledIds = new Set((cls.students ?? []).map(s => s.recipientId));
  const unenrolledRecipients = allRecipients.filter(r => !enrolledIds.has(r.id));
  const filteredRecipients = unenrolledRecipients.filter(r =>
    !enrolSearch || r.name.toLowerCase().includes(enrolSearch.toLowerCase()) ||
    (r.identifier ?? '').toLowerCase().includes(enrolSearch.toLowerCase())
  );
  const filteredInventory = inventoryItems.filter(i =>
    !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleEnrol() {
    if (!cls) return;
    setEnrolSaving(true);
    try {
      const updated = await classService.enrolStudent(cls.id,
        enrolMode === 'existing'
          ? { recipientId: enrolRecipientId }
          : { name: enrolForm.name, identifier: enrolForm.identifier || undefined, contact: enrolForm.contact || undefined }
      );
      setCls(updated);
      setShowEnrol(false);
      setEnrolForm({ name: '', identifier: '', contact: '' });
      setEnrolRecipientId('');
      setEnrolSearch('');
    } catch {
      toast({ title: t('Error'), description: t('Failed to enrol student'), variant: 'destructive' });
    } finally {
      setEnrolSaving(false);
    }
  }

  async function handleRemoveStudent(recipientId: string) {
    if (!cls || !confirm(t('Remove this student from the class?'))) return;
    try {
      const updated = await classService.removeStudent(cls.id, recipientId);
      setCls(updated);
    } catch {
      toast({ title: t('Error'), description: t('Failed to remove student'), variant: 'destructive' });
    }
  }

  async function handleAddItem() {
    if (!cls) return;
    const name = itemMode === 'inventory'
      ? inventoryItems.find(i => i.id === itemForm.itemId)?.name ?? ''
      : itemForm.itemName;
    if (!name.trim()) return;
    setItemSaving(true);
    try {
      const updated = await classService.addItem(cls.id, {
        itemId: itemMode === 'inventory' ? itemForm.itemId || undefined : undefined,
        itemName: name,
        quantity: itemForm.quantity,
        unitPrice: itemForm.unitPrice,
        conditionIssued: itemForm.conditionIssued,
      });
      setCls(updated);
      setShowAddItem(false);
      setItemForm({ itemId: '', itemName: '', quantity: 1, unitPrice: 0, conditionIssued: 'New' });
      setItemSearch('');
    } catch {
      toast({ title: t('Error'), description: t('Failed to add item'), variant: 'destructive' });
    } finally {
      setItemSaving(false);
    }
  }

  async function handleUpdateItem() {
    if (!cls || !editingItem) return;
    try {
      const updated = await classService.updateItem(cls.id, editingItem.id, {
        quantity: editForm.quantity,
        unitPrice: editForm.unitPrice,
        conditionIssued: editForm.conditionIssued,
      });
      setCls(updated);
      setEditingItem(null);
    } catch {
      toast({ title: t('Error'), description: t('Failed to update item'), variant: 'destructive' });
    }
  }

  async function handleRemoveItem(itemId: string) {
    if (!cls) return;
    try {
      const updated = await classService.removeItem(cls.id, itemId);
      setCls(updated);
    } catch {
      toast({ title: t('Error'), description: t('Failed to remove item'), variant: 'destructive' });
    }
  }

  async function handleImportTemplate() {
    if (!cls || !importTemplateId) return;
    setImportSaving(true);
    try {
      const updated = await classService.importTemplate(cls.id, importTemplateId);
      setCls(updated);
      setShowImport(false);
      setImportTemplateId('');
      toast({ title: t('Items imported') });
    } catch {
      toast({ title: t('Error'), description: t('Failed to import template'), variant: 'destructive' });
    } finally {
      setImportSaving(false);
    }
  }

  async function handleAssignFees(recipientId?: string) {
    if (!cls) return;
    try {
      const res = await classService.assignFees(cls.id, recipientId ? { recipientId } : undefined);
      await load();
      if (res.created > 0) {
        toast({ title: `${res.created} ${t('fee record(s) created')}` });
      }
    } catch {
      toast({ title: t('Error'), description: t('Failed to assign fees'), variant: 'destructive' });
    }
  }

  async function handleDistributeAll() {
    if (!cls) return;
    try {
      const res = await classService.distributePaid(cls.id);
      await load();
      toast({ title: `${res.distributed} ${t('student(s) distributed')}` });
    } catch (err: any) {
      toast({ title: t('Error'), description: err?.message ?? t('Failed to distribute'), variant: 'destructive' });
    }
  }

  function openCollect(student: ClassStudentRow) {
    setPayAmount(student.totalAmount - student.paidAmount);
    setCollectFor(student);
  }

  async function handleCollectFee() {
    if (!collectFor || !cls) return;
    setPaySaving(true);
    try {
      // If no fee record yet, assign first then pay
      if (!collectFor.feeRecordId) {
        await classService.assignFees(cls.id, { recipientId: collectFor.recipientId });
        await load();
        // Find the newly created fee record
        const refreshed = await classService.getById(cls.id);
        const student = refreshed.students.find(s => s.recipientId === collectFor.recipientId);
        if (student?.feeRecordId) {
          await feeService.pay(student.feeRecordId, payAmount);
        }
      } else {
        await feeService.pay(collectFor.feeRecordId, payAmount);
      }
      await load();
      setCollectFor(null);
      toast({ title: t('Payment recorded') });
    } catch {
      toast({ title: t('Error'), description: t('Failed to record payment'), variant: 'destructive' });
    } finally {
      setPaySaving(false);
    }
  }

  async function handleDistributeOne(student: ClassStudentRow) {
    if (!student.feeRecordId) return;
    try {
      await feeService.distribute(student.feeRecordId);
      await load();
      toast({ title: t('Items distributed') });
    } catch (err: any) {
      toast({ title: t('Error'), description: err?.message ?? t('Failed to distribute'), variant: 'destructive' });
    }
  }

  async function handleWaive(student: ClassStudentRow) {
    if (!student.feeRecordId) return;
    try {
      await feeService.waive(student.feeRecordId);
      await load();
      toast({ title: t('Fee waived') });
    } catch {
      toast({ title: t('Error'), description: t('Failed to waive fee'), variant: 'destructive' });
    }
  }

  // ── Derived stats ─────────────────────────────────────────────────────────

  const anyNoFee = cls.students.some(s => s.feeStatus === 'no_fee');
  const anyPaid  = cls.students.some(s => s.feeStatus === 'paid' || s.feeStatus === 'waived');

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate('/classes')} className="-ml-2 mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> {t('Back to Classes')}
      </Button>

      <PageHeader
        title={cls.name}
        description={[cls.academicYear, `${cls.studentCount} ${t('students')}`, `${cls.items.length} ${t('items')}`, cls.totalFeePerStudent ? `₹${cls.totalFeePerStudent} ${t('per student')}` : ''].filter(Boolean).join(' · ')}
        actions={
          <Badge variant="outline" className={cls.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-muted text-muted-foreground'}>
            {t(cls.status === 'active' ? 'Active' : 'Closed')}
          </Badge>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="students">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            {t('Students')} ({cls.studentCount})
          </TabsTrigger>
          <TabsTrigger value="items">
            <Package className="h-3.5 w-3.5 mr-1.5" />
            {t('Items')} ({cls.items.length})
          </TabsTrigger>
          <TabsTrigger value="fees">
            <IndianRupee className="h-3.5 w-3.5 mr-1.5" />
            {t('Fees')}
            {cls.unpaidCount > 0 && (
              <span className="ml-1.5 text-xs bg-red-500 text-white rounded-full px-1.5">{cls.unpaidCount}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Students ──────────────────────────────────────────────── */}
        <TabsContent value="students">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">{t('Enrolled Students')}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => { setEnrolMode('new'); setShowEnrol(true); }}>
                <UserPlus className="h-3.5 w-3.5 mr-1" /> {t('Enrol Student')}
              </Button>
            </CardHeader>
            <CardContent>
              {cls.students.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('No students enrolled yet. Enrol students to get started.')}
                </p>
              ) : (
                <div className="divide-y">
                  {(cls.students ?? []).map((s, idx) => {
                    const fsCfg = FEE_STATUS[s.feeStatus] ?? FEE_STATUS.no_fee;
                    return (
                      <div key={s.recipientId} className="flex items-center gap-3 py-3">
                        <span className="text-sm text-muted-foreground w-6 text-right shrink-0">{idx + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.name}</p>
                          {s.identifier && <p className="text-xs text-muted-foreground">{s.identifier}</p>}
                        </div>
                        <Badge variant="outline" className={`text-xs shrink-0 ${fsCfg.color}`}>
                          {t(fsCfg.label)}
                        </Badge>
                        <button
                          onClick={() => handleRemoveStudent(s.recipientId)}
                          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Items ─────────────────────────────────────────────────── */}
        <TabsContent value="items">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">{t('Items per Student')}</CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> {t('Import Template')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setItemMode('inventory'); setShowAddItem(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> {t('Add Item')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {cls.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('No items assigned. Add items each student in this class will receive.')}
                </p>
              ) : (
                <>
                  <div className="divide-y">
                    {(cls.items ?? []).map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-3 py-3">
                        <span className="text-sm text-muted-foreground w-6 text-right shrink-0">{idx + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.itemName}</p>
                          <p className="text-xs text-muted-foreground">{item.conditionIssued}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold">{item.quantity} {t('units')}</p>
                          {item.unitPrice > 0 && (
                            <p className="text-xs text-muted-foreground">₹{item.unitPrice} × {item.quantity} = ₹{item.unitPrice * item.quantity}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => { setEditingItem(item); setEditForm({ quantity: item.quantity, unitPrice: item.unitPrice, conditionIssued: item.conditionIssued }); }}
                            className="h-7 px-2 text-xs rounded border hover:bg-muted transition-colors"
                          >
                            {t('Edit')}
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t flex justify-between text-sm font-semibold">
                    <span>{t('Total fee per student')}</span>
                    <span>₹{cls.totalFeePerStudent}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Fees ──────────────────────────────────────────────────── */}
        <TabsContent value="fees">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: t('Total'), value: cls.studentCount, icon: Users, color: 'text-foreground' },
              { label: t('Distributed'), value: cls.distributedCount, icon: CheckCircle2, color: 'text-purple-600' },
              { label: t('Paid'), value: cls.paidCount, icon: CheckCircle2, color: 'text-emerald-600' },
              { label: t('Pending'), value: cls.unpaidCount, icon: Clock, color: 'text-amber-600' },
            ].map(kpi => (
              <Card key={kpi.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <kpi.icon className={`h-5 w-5 ${kpi.color} shrink-0`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {cls.items.length > 0 && anyNoFee && (
              <Button size="sm" variant="outline" onClick={() => handleAssignFees()}>
                {t('Assign Fees for All Students')}
              </Button>
            )}
            {anyPaid && (
              <Button size="sm" onClick={handleDistributeAll}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                {t('Distribute All Paid')}
              </Button>
            )}
          </div>

          {/* Student fee table */}
          {cls.students.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                {t('No students enrolled. Go to the Students tab to enrol students first.')}
              </CardContent>
            </Card>
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
                        <th className="text-right px-4 py-2.5 text-xs font-semibold">{t('Paid')}</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold">{t('Total')}</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold">{t('Actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(cls.students ?? []).map((s, idx) => {
                        const fsCfg = FEE_STATUS[s.feeStatus] ?? FEE_STATUS.no_fee;
                        return (
                          <tr key={s.recipientId} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium">{s.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{s.identifier ?? '—'}</td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="outline" className={`text-xs ${fsCfg.color}`}>
                                {t(fsCfg.label)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {s.totalAmount > 0 ? `₹${s.paidAmount}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {s.totalAmount > 0 ? `₹${s.totalAmount}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {s.feeStatus === 'distributed' && (
                                  <span className="text-xs text-purple-600 font-medium flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> {t('Done')}
                                  </span>
                                )}
                                {s.feeStatus === 'no_fee' && cls.items.length > 0 && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs"
                                    onClick={() => handleAssignFees(s.recipientId)}>
                                    {t('Assign Fee')}
                                  </Button>
                                )}
                                {(s.feeStatus === 'unpaid' || s.feeStatus === 'partial') && (
                                  <>
                                    <Button size="sm" className="h-7 text-xs"
                                      onClick={() => openCollect(s)}>
                                      {t('Collect Fee')}
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                                      onClick={() => handleWaive(s)}>
                                      {t('Waive')}
                                    </Button>
                                  </>
                                )}
                                {(s.feeStatus === 'paid' || s.feeStatus === 'waived') && (
                                  <Button size="sm" className="h-7 text-xs"
                                    onClick={() => handleDistributeOne(s)}>
                                    <Package className="h-3 w-3 mr-1" /> {t('Distribute')}
                                  </Button>
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
        </TabsContent>
      </Tabs>

      {/* ── Enrol Student Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showEnrol} onOpenChange={setShowEnrol}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t('Enrol Student')}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="flex gap-2">
              <Button size="sm" variant={enrolMode === 'new' ? 'default' : 'outline'} className="text-xs h-7"
                onClick={() => setEnrolMode('new')}>{t('Create New')}</Button>
              <Button size="sm" variant={enrolMode === 'existing' ? 'default' : 'outline'} className="text-xs h-7"
                onClick={() => setEnrolMode('existing')}>{t('Pick Existing')}</Button>
            </div>

            {enrolMode === 'new' ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('Name')} *</Label>
                  <Input value={enrolForm.name} onChange={e => setEnrolForm({ ...enrolForm, name: e.target.value })} className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('Roll Number / ID')}</Label>
                  <Input value={enrolForm.identifier} onChange={e => setEnrolForm({ ...enrolForm, identifier: e.target.value })} className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('Contact')}</Label>
                  <Input value={enrolForm.contact} onChange={e => setEnrolForm({ ...enrolForm, contact: e.target.value })} className="text-sm" />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Search')}</Label>
                <Input
                  placeholder={t('Name or ID…')}
                  value={enrolSearch}
                  onChange={e => setEnrolSearch(e.target.value)}
                  className="text-sm"
                />
                <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                  {filteredRecipients.slice(0, 10).map(r => (
                    <label key={r.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50">
                      <input
                        type="radio"
                        name="enrol-pick"
                        value={r.id}
                        checked={enrolRecipientId === r.id}
                        onChange={() => setEnrolRecipientId(r.id)}
                        className="h-4 w-4"
                      />
                      <div>
                        <p className="text-sm font-medium">{r.name}</p>
                        {r.identifier && <p className="text-xs text-muted-foreground">{r.identifier}</p>}
                      </div>
                    </label>
                  ))}
                  {filteredRecipients.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">{t('No unassigned students found')}</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowEnrol(false)}>{t('Cancel')}</Button>
            <Button size="sm" onClick={handleEnrol} disabled={enrolSaving ||
              (enrolMode === 'new' && !enrolForm.name.trim()) ||
              (enrolMode === 'existing' && !enrolRecipientId)}>
              {enrolSaving ? t('Enrolling…') : t('Enrol')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Item Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t('Add Item')}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="flex gap-2">
              <Button size="sm" variant={itemMode === 'inventory' ? 'default' : 'outline'} className="text-xs h-7"
                onClick={() => setItemMode('inventory')}>{t('From Inventory')}</Button>
              <Button size="sm" variant={itemMode === 'freetext' ? 'default' : 'outline'} className="text-xs h-7"
                onClick={() => setItemMode('freetext')}>{t('Free Text')}</Button>
            </div>

            {itemMode === 'inventory' ? (
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Search Item')}</Label>
                <Input
                  placeholder={t('Type to search…')}
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  className="text-sm"
                />
                {itemSearch && (
                  <div className="max-h-36 overflow-y-auto border rounded-lg divide-y">
                    {filteredInventory.slice(0, 8).map(item => (
                      <button
                        key={item.id}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${itemForm.itemId === item.id ? 'bg-primary/10' : ''}`}
                        onClick={() => setItemForm({ ...itemForm, itemId: item.id, itemName: item.name })}
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground ml-2">{item.sku}</span>
                      </button>
                    ))}
                  </div>
                )}
                {itemForm.itemId && (
                  <p className="text-xs text-emerald-600">
                    ✓ {inventoryItems.find(i => i.id === itemForm.itemId)?.name}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Item Name')} *</Label>
                <Input
                  value={itemForm.itemName}
                  onChange={e => setItemForm({ ...itemForm, itemName: e.target.value })}
                  placeholder={t('e.g. A4 Notebook')}
                  className="text-sm"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Qty per student')}</Label>
                <Input type="number" min={1} value={itemForm.quantity}
                  onChange={e => setItemForm({ ...itemForm, quantity: Number(e.target.value) })} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Unit Price (₹)')}</Label>
                <Input type="number" min={0} value={itemForm.unitPrice}
                  onChange={e => setItemForm({ ...itemForm, unitPrice: Number(e.target.value) })} className="text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('Condition')}</Label>
              <Select value={itemForm.conditionIssued} onValueChange={v => setItemForm({ ...itemForm, conditionIssued: v })}>
                <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['New', 'Good', 'Fair', 'Poor'].map(c => <SelectItem key={c} value={c}>{t(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddItem(false)}>{t('Cancel')}</Button>
            <Button size="sm" onClick={handleAddItem} disabled={itemSaving}>
              {itemSaving ? t('Adding…') : t('Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Item Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={!!editingItem} onOpenChange={v => { if (!v) setEditingItem(null); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>{t('Edit Item')} — {editingItem?.itemName}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Qty per student')}</Label>
                <Input type="number" min={1} value={editForm.quantity}
                  onChange={e => setEditForm({ ...editForm, quantity: Number(e.target.value) })} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Unit Price (₹)')}</Label>
                <Input type="number" min={0} value={editForm.unitPrice}
                  onChange={e => setEditForm({ ...editForm, unitPrice: Number(e.target.value) })} className="text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('Condition')}</Label>
              <Select value={editForm.conditionIssued} onValueChange={v => setEditForm({ ...editForm, conditionIssued: v })}>
                <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['New', 'Good', 'Fair', 'Poor'].map(c => <SelectItem key={c} value={c}>{t(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingItem(null)}>{t('Cancel')}</Button>
            <Button size="sm" onClick={handleUpdateItem}>{t('Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import Template Dialog ────────────────────────────────────────────── */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>{t('Import from Template')}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-xs text-muted-foreground">
              {t('Copy all items from an existing class template. Existing items will not be removed.')}
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('Select Template')}</Label>
              <Select value={importTemplateId} onValueChange={setImportTemplateId}>
                <SelectTrigger className="text-sm"><SelectValue placeholder={t('Choose a template…')} /></SelectTrigger>
                <SelectContent>
                  {templates.map(tpl => (
                    <SelectItem key={tpl.id} value={tpl.id}>{tpl.name} — {tpl.group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowImport(false)}>{t('Cancel')}</Button>
            <Button size="sm" onClick={handleImportTemplate} disabled={importSaving || !importTemplateId}>
              {importSaving ? t('Importing…') : t('Import')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Collect Fee Dialog ────────────────────────────────────────────────── */}
      <Dialog open={!!collectFor} onOpenChange={v => { if (!v) setCollectFor(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('Collect Fee')} — {collectFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {/* Items list */}
            <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground mb-2">{t('Items to be distributed')}</p>
              {(cls.items ?? []).map(item => (
                <div key={item.id} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{item.itemName} × {item.quantity}</span>
                  {item.unitPrice > 0 && <span className="font-medium">₹{item.unitPrice * item.quantity}</span>}
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                <span>{t('Total')}</span>
                <span>₹{collectFor?.totalAmount ?? cls.totalFeePerStudent}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('Amount Received (₹)')}</Label>
              <Input
                type="number"
                min={0}
                max={collectFor?.totalAmount ?? cls.totalFeePerStudent}
                value={payAmount}
                onChange={e => setPayAmount(Number(e.target.value))}
                className="text-lg font-semibold"
              />
              <p className="text-xs text-muted-foreground">
                {t('Outstanding')}: ₹{(collectFor?.totalAmount ?? cls.totalFeePerStudent) - (collectFor?.paidAmount ?? 0)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCollectFor(null)}>{t('Cancel')}</Button>
            <Button size="sm" onClick={handleCollectFee} disabled={paySaving || payAmount <= 0}>
              {paySaving ? t('Recording…') : t('Record Payment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
