import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, RotateCcw, AlertTriangle, CheckCircle2, Clock,
  XCircle, DollarSign, Package, Pencil, CreditCard, Truck, Printer,
} from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { useOrgConfig } from '@/hooks/useOrgConfig';
import { recipientService, assignmentService, inventoryService, transactionService, feeService, classTemplateService, classService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { PrintReceipt } from '@/components/shared/PrintReceipt';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import type { Recipient, Assignment, Item, FeeRecord, ClassEnrollmentHistory } from '@/types';

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  issued:           { label: 'Active',          class: 'bg-blue-50 text-blue-700 border-blue-200' },
  distributed:      { label: 'Distributed',     class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  returned:         { label: 'Returned',         class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  returned_damaged: { label: 'Returned – Dmgd',  class: 'bg-orange-50 text-orange-700 border-orange-200' },
  lost:             { label: 'Lost',             class: 'bg-red-50 text-red-700 border-red-200' },
  fine_pending:     { label: 'Fine Pending',     class: 'bg-amber-50 text-amber-700 border-amber-200' },
  fine_paid:        { label: 'Fine Paid',        class: 'bg-purple-50 text-purple-700 border-purple-200' },
  closed:           { label: 'Closed',           class: 'bg-slate-50 text-slate-500 border-slate-200' },
};

const ACTIVE_STATUSES = ['issued', 'distributed', 'fine_pending'];

function isOverdue(a: Assignment): boolean {
  return a.mode === 'lending' && a.status === 'issued' && !!a.expectedReturn && a.expectedReturn < new Date().toISOString().slice(0, 10);
}

export function RecipientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();
  const { can } = useAuth();
  const canUpdateRecipient = can('recipients:update');
  const canIssue = can('assignments:create');
  const canUpdateAssignment = can('assignments:update');
  const config = useOrgConfig();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // Edit dialog
  const [showEditRecipient, setShowEditRecipient] = useState(false);
  const [editRecipientForm, setEditRecipientForm] = useState({ name: '', identifier: '', group: '', contact: '' });
  const [editRecipientSaving, setEditRecipientSaving] = useState(false);

  // Issue dialog
  const [showIssue, setShowIssue] = useState(false);
  const [issueForm, setIssueForm] = useState({ itemId: '', quantity: '1', conditionIssued: 'Good', expectedReturn: '' });

  // Return dialog
  const [returning, setReturning] = useState<Assignment | null>(null);
  const [returnForm, setReturnForm] = useState({ returnReason: '', conditionReturned: 'Good', damageNotes: '', fineAmount: '0', receivedBy: '', notes: '' });

  // Lost dialog
  const [markingLost, setMarkingLost] = useState<Assignment | null>(null);
  const [lostForm, setLostForm] = useState({ fineAmount: '0', notes: '' });

  // Class enrollment history
  const [classHistory, setClassHistory] = useState<ClassEnrollmentHistory[]>([]);

  // Fee-first distribution
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string; items: unknown[] }[]>([]);
  const [showAssignPackage, setShowAssignPackage] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showPayDialog, setShowPayDialog] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [printFee, setPrintFee] = useState<{ fee: typeof fees[0]; items: { name: string; qty: number; details?: string; unitPrice?: number }[] } | null>(null);

  function refreshRecipient() {
    if (!id || !currentOrg) return;
    recipientService.getById(id).then((r) => setRecipient(r || null));
    recipientService.getAssignments(currentOrg.id, id).then(setAssignments);
    inventoryService.getByOrganization(currentOrg.id).then(setItems);
    feeService.getByRecipient(id).then(setFees);
    classTemplateService.getByOrganization(currentOrg.id).then(setTemplates);
    classService.getEnrollmentHistory(id).then(setClassHistory).catch(() => {});
  }

  useEffect(() => {
    refreshRecipient();
  }, [id, currentOrg]);

  const isDistribution = config.assignmentMode === 'distribution';

  async function openReceipt(fee: typeof fees[0]) {
    let receiptItems: { name: string; qty: number; details?: string }[] = [];

    // Try 1: Load items from the class template
    if (fee.templateId) {
      try {
        const tmpl = await classTemplateService.getById(fee.templateId);
        if (tmpl.items && tmpl.items.length > 0) {
          receiptItems = tmpl.items.map(ti => ({
            name: ti.itemName,
            qty: ti.quantity,
            details: `${config.currencySymbol}${ti.unitPrice} x ${ti.quantity} = ${config.currencySymbol}${ti.unitPrice * ti.quantity}`,
          }));
        }
      } catch {
        // Template may have been deleted
      }
    }

    // Try 2: Load items from the OrgClass (class-based fee flow)
    if (receiptItems.length === 0 && fee.classId) {
      try {
        const cls = await classService.getById(fee.classId);
        if (cls.items && cls.items.length > 0) {
          receiptItems = cls.items.map(ci => ({
            name: ci.itemName,
            qty: ci.quantity,
            details: ci.unitPrice > 0
              ? `${config.currencySymbol}${ci.unitPrice} × ${ci.quantity} = ${config.currencySymbol}${ci.unitPrice * ci.quantity}`
              : undefined,
          }));
        }
      } catch { /* ignore */ }
    }

    // Try 3: Fall back to this recipient's distributed assignments
    if (receiptItems.length === 0) {
      const distributed = assignments.filter(a =>
        a.status === 'distributed' || a.status === 'issued'
      );
      receiptItems = distributed.map(a => ({
        name: a.itemName,
        qty: a.quantity,
        details: a.unitPrice
          ? `${config.currencySymbol}${a.unitPrice} x ${a.quantity} = ${config.currencySymbol}${a.unitPrice * a.quantity}`
          : undefined,
      }));
    }

    setPrintFee({ fee, items: receiptItems });
  }

  function openEditRecipient() {
    if (!recipient) return;
    setEditRecipientForm({
      name: recipient.name,
      identifier: recipient.identifier || '',
      group: recipient.group || '',
      contact: recipient.contact || '',
    });
    setShowEditRecipient(true);
  }

  async function handleEditRecipient(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setEditRecipientSaving(true);
    try {
      await recipientService.update(id, {
        name: editRecipientForm.name,
        identifier: editRecipientForm.identifier,
        group: editRecipientForm.group,
        contact: editRecipientForm.contact || undefined,
      });
      toast({ title: t('Recipient updated successfully') });
      setShowEditRecipient(false);
      refreshRecipient();
    } catch {
      toast({ title: t('Failed to update recipient'), variant: 'destructive' });
    } finally {
      setEditRecipientSaving(false);
    }
  }

  const active = assignments.filter((a) => ACTIVE_STATUSES.includes(a.status) || isOverdue(a));
  const history = assignments.filter((a) => !ACTIVE_STATUSES.includes(a.status) && !isOverdue(a));
  const totalFines = assignments.reduce((sum, a) => sum + (a.fineAmount || 0), 0);
  const unpaidFines = assignments.filter((a) => a.fineAmount > 0 && !a.finePaid).reduce((sum, a) => sum + a.fineAmount, 0);

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !recipient) return;
    const item = items.find((i) => i.id === issueForm.itemId);
    if (!item) return;
    const qty = parseInt(issueForm.quantity) || 1;
    const created = await assignmentService.create({
      organizationId: currentOrg.id,
      recipientId: recipient.id,
      recipientName: recipient.name,
      recipientIdentifier: recipient.identifier,
      recipientGroup: recipient.group,
      itemId: item.id,
      itemName: item.name,
      itemDetails: item.uniform ? `Size ${item.uniform.size}` : item.book ? item.book.classGrade : undefined,
      quantity: qty,
      conditionIssued: issueForm.conditionIssued,
      issueDate: new Date().toISOString().slice(0, 10),
      expectedReturn: issueForm.expectedReturn || undefined,
      issuedBy: 'Store Manager',
    });
    // Backend handles inventory update + stock transaction creation
    setAssignments((prev) => [created, ...prev]);
    setShowIssue(false);
    setIssueForm({ itemId: '', quantity: '1', conditionIssued: 'Good', expectedReturn: '' });
    toast({ title: `${item.name} issued to ${recipient.name}` });
  }

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!returning || !currentOrg) return;
    const updated = await assignmentService.returnItem(returning.id, {
      conditionReturned: returnForm.conditionReturned,
      damageNotes: [returnForm.returnReason, returnForm.damageNotes].filter(Boolean).join(' — ') || undefined,
      fineAmount: parseInt(returnForm.fineAmount) || 0,
      receivedBy: returnForm.receivedBy || undefined,
      notes: returnForm.notes || undefined,
    });
    await inventoryService.adjustStock(returning.itemId, returning.quantity);
    setAssignments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setReturning(null);
    setReturnForm({ returnReason: '', conditionReturned: 'Good', damageNotes: '', fineAmount: '0', receivedBy: '', notes: '' });
    toast({ title: `${returning.itemName} returned`, description: updated.status === 'fine_pending' ? `${config.fineLabel} of ${config.currencySymbol}${updated.fineAmount} raised` : 'Returned in good condition' });
  }

  async function handleLost(e: React.FormEvent) {
    e.preventDefault();
    if (!markingLost) return;
    const updated = await assignmentService.markLost(markingLost.id, {
      fineAmount: parseInt(lostForm.fineAmount) || 0,
      notes: lostForm.notes || undefined,
    });
    setAssignments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setMarkingLost(null);
    setLostForm({ fineAmount: '0', notes: '' });
    toast({ title: `${markingLost.itemName} marked as lost` });
  }

  async function handleFinePaid(assignmentId: string) {
    const updated = await assignmentService.markFinePaid(assignmentId);
    setAssignments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    toast({ title: `${config.fineLabel} marked as paid` });
  }

  if (!recipient) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate('/recipients')} className="mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to {config.recipientPluralLabel}
      </Button>

      <PageHeader
        title={recipient.name}
        description={`${config.identifierLabel}: ${recipient.identifier || '—'} · ${config.groupLabel}: ${recipient.group || '—'}`}
        actions={
          <div className="flex gap-2">
            {canUpdateRecipient && (
              <Button variant="outline" size="sm" onClick={openEditRecipient}>
                <Pencil className="h-4 w-4 mr-1" /> {t('Edit')}
              </Button>
            )}
            {canIssue && isDistribution && templates.length > 0 && (
              <Button variant="outline" onClick={() => setShowAssignPackage(true)}>
                <CreditCard className="h-4 w-4 mr-1" />
                {t('Assign Package')}
              </Button>
            )}
            {canIssue && !isDistribution && (
              <Button onClick={() => setShowIssue(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t(config.assignmentLabel)} {t('Item')}
              </Button>
            )}
          </div>
        }
      />

      {/* Custom Fields */}
      {recipient.extraData && Object.keys(recipient.extraData).length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
              {Object.entries(recipient.extraData).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center py-1 border-b last:border-0">
                  <span className="text-sm text-muted-foreground">{t(key)}</span>
                  <span className="text-sm font-medium">{typeof val === 'boolean' ? (val ? t('Yes') : t('No')) : String(val)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active', value: active.length, icon: Package, color: 'text-blue-600' },
          { label: 'Returned', value: history.filter((a) => a.status === 'returned').length, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Overdue', value: assignments.filter(isOverdue).length, icon: Clock, color: 'text-red-600' },
          { label: `Unpaid ${config.fineLabel}s`, value: `${config.currencySymbol}${unpaidFines}`, icon: DollarSign, color: 'text-amber-600' },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Class enrollment history */}
      {classHistory.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('Class History')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {classHistory.map((h, i) => (
                <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${!h.leftAt ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{h.className}</p>
                    {h.academicYear && <p className="text-xs text-muted-foreground">{h.academicYear}</p>}
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    <p>{h.joinedAt}</p>
                    {h.leftAt ? <p>→ {h.leftAt}</p> : <p className="text-emerald-600 font-medium">{t('Current')}</p>}
                  </div>
                  {i === 0 && !h.leftAt && (
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">{t('Active')}</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active assignments */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Active {config.assignmentLabel}s</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {active.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No active items with this {config.recipientLabel.toLowerCase()}
            </div>
          ) : (
            <div className="divide-y">
              {active.map((a) => {
                const overdue = isOverdue(a);
                return (
                  <div key={a.id} className={`p-4 flex items-center justify-between gap-4 ${overdue ? 'bg-red-50/50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{a.itemName}</p>
                        {a.itemDetails && <span className="text-xs text-muted-foreground">{a.itemDetails}</span>}
                        {overdue && <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">Overdue</Badge>}
                        {a.status === 'fine_pending' && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">{config.fineLabel} Pending</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Issued: {a.issueDate} · Condition: {a.conditionIssued}
                        {a.expectedReturn && ` · Expected return: ${a.expectedReturn}`}
                        {a.quantity > 1 && ` · Qty: ${a.quantity}`}
                      </p>
                      {a.status === 'fine_pending' && (
                        <p className="text-xs font-medium text-amber-700 mt-0.5">
                          {config.fineLabel}: {config.currencySymbol}{a.fineAmount}
                          {a.damageNotes && ` — ${a.damageNotes}`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {isDistribution ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{t('Distributed')}</Badge>
                      ) : a.status === 'fine_pending' ? (
                        canUpdateAssignment && (
                          <Button size="sm" variant="outline" className="text-amber-700 border-amber-300" onClick={() => handleFinePaid(a.id)}>
                            <DollarSign className="h-3.5 w-3.5 mr-1" /> {t('Mark Paid')}
                          </Button>
                        )
                      ) : canUpdateAssignment ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => { setReturning(a); setReturnForm({ returnReason: '', conditionReturned: 'Good', damageNotes: '', fineAmount: '0', receivedBy: '', notes: '' }); }}>
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> {t('Return')}
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setMarkingLost(a); }}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> {t('Lost')}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {history.map((a) => {
                const badge = STATUS_BADGE[a.status] ?? STATUS_BADGE.closed;
                return (
                  <div key={a.id} className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{a.itemName}</p>
                        {a.itemDetails && <span className="text-xs text-muted-foreground">{a.itemDetails}</span>}
                        <Badge variant="outline" className={`text-[10px] ${badge.class}`}>{badge.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Issued: {a.issueDate}
                        {a.returnDate && ` · Returned: ${a.returnDate}`}
                        {a.conditionReturned && ` · Condition: ${a.conditionReturned}`}
                      </p>
                      {a.damageNotes && (
                        <p className="text-xs text-orange-700 mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {a.damageNotes}
                        </p>
                      )}
                      {a.fineAmount > 0 && (
                        <p className={`text-xs mt-0.5 font-medium ${a.finePaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {config.fineLabel}: {config.currencySymbol}{a.fineAmount} — {a.finePaid ? 'Paid' : 'Unpaid'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Issue Dialog ── */}
      <Dialog open={showIssue} onOpenChange={setShowIssue}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{config.assignmentLabel} Item to {recipient.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleIssue} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Select Item</Label>
              <Select value={issueForm.itemId} onValueChange={(v) => setIssueForm({ ...issueForm, itemId: v })}>
                <SelectTrigger><SelectValue placeholder="Choose an item…" /></SelectTrigger>
                <SelectContent>
                  {items.filter((i) => i.available > 0).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} <span className="text-muted-foreground ml-1 text-xs">({item.available} available)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input type="number" min={1} value={issueForm.quantity} onChange={(e) => setIssueForm({ ...issueForm, quantity: e.target.value })} />
              </div>
              {config.enableConditionTracking && (
                <div className="space-y-1.5">
                  <Label>Condition When Issued</Label>
                  <Select value={issueForm.conditionIssued} onValueChange={(v) => setIssueForm({ ...issueForm, conditionIssued: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['New', 'Good', 'Fair', 'Poor'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Expected Return Date</Label>
              <Input type="date" value={issueForm.expectedReturn} onChange={(e) => setIssueForm({ ...issueForm, expectedReturn: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowIssue(false)}>Cancel</Button>
              <Button type="submit" disabled={!issueForm.itemId}>{config.assignmentLabel} Item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Return Dialog ── */}
      <Dialog open={!!returning} onOpenChange={(o) => !o && setReturning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return: {returning?.itemName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReturn} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Reason for Return</Label>
              <Input
                value={returnForm.returnReason}
                onChange={(e) => setReturnForm({ ...returnForm, returnReason: e.target.value })}
                placeholder="e.g. Wrong size, damaged, not needed…"
              />
            </div>
            {config.enableConditionTracking && (
              <div className="space-y-1.5">
                <Label>Condition When Returned</Label>
                <Select value={returnForm.conditionReturned} onValueChange={(v) => setReturnForm({ ...returnForm, conditionReturned: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Good', 'Damaged', 'Heavily Damaged'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {returnForm.conditionReturned !== 'Good' && (
              <div className="space-y-1.5">
                <Label>Damage Description</Label>
                <Textarea value={returnForm.damageNotes} onChange={(e) => setReturnForm({ ...returnForm, damageNotes: e.target.value })} placeholder="Describe the damage…" rows={3} />
              </div>
            )}
            {config.enableFines && returnForm.conditionReturned !== 'Good' && (
              <div className="space-y-1.5">
                <Label>{config.fineLabel} Amount ({config.currencySymbol})</Label>
                <Input type="number" min={0} value={returnForm.fineAmount} onChange={(e) => setReturnForm({ ...returnForm, fineAmount: e.target.value })} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Received By</Label>
              <Input value={returnForm.receivedBy} onChange={(e) => setReturnForm({ ...returnForm, receivedBy: e.target.value })} placeholder="Staff name" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReturning(null)}>Cancel</Button>
              <Button type="submit">Confirm Return</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Lost Dialog ── */}
      <Dialog open={!!markingLost} onOpenChange={(o) => !o && setMarkingLost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Lost: {markingLost?.itemName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLost} className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Mark this item as lost. A {config.fineLabel.toLowerCase()} may be raised.
            </p>
            {config.enableFines && (
              <div className="space-y-1.5">
                <Label>{config.fineLabel} Amount ({config.currencySymbol})</Label>
                <Input type="number" min={0} value={lostForm.fineAmount} onChange={(e) => setLostForm({ ...lostForm, fineAmount: e.target.value })} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={lostForm.notes} onChange={(e) => setLostForm({ ...lostForm, notes: e.target.value })} placeholder="Any additional notes…" rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMarkingLost(null)}>Cancel</Button>
              <Button type="submit" variant="destructive">Mark as Lost</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Recipient Dialog ── */}
      <Dialog open={showEditRecipient} onOpenChange={setShowEditRecipient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Edit')} {config.recipientLabel}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditRecipient} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('Name')}</Label>
              <Input value={editRecipientForm.name} onChange={(e) => setEditRecipientForm({ ...editRecipientForm, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>{config.identifierLabel}</Label>
              <Input value={editRecipientForm.identifier} onChange={(e) => setEditRecipientForm({ ...editRecipientForm, identifier: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{config.groupLabel}</Label>
              <Input value={editRecipientForm.group} onChange={(e) => setEditRecipientForm({ ...editRecipientForm, group: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Contact')}</Label>
              <Input
                value={editRecipientForm.contact}
                placeholder={t('Phone or email')}
                onChange={(e) => {
                  const v = e.target.value;
                  const clean = v.includes('@') ? v.slice(0, 100) : v.replace(/[^\d+\-\s()]/g, '').slice(0, 15);
                  setEditRecipientForm({ ...editRecipientForm, contact: clean });
                }}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditRecipient(false)}>{t('Cancel')}</Button>
              <Button type="submit" disabled={editRecipientSaving}>{editRecipientSaving ? t('Saving...') : t('Save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Fee Records Section ── */}
      {isDistribution && fees.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> {t('Fee Packages')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {fees.map(fee => (
                <div key={fee.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{fee.templateName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('Total')}: ₹{fee.totalAmount} · {t('Paid')}: ₹{fee.paidAmount}
                      {fee.distributedDate && ` · ${t('Distributed')}: ${fee.distributedDate}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {fee.status === 'unpaid' && (
                      <>
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{t('Unpaid')}</Badge>
                        {canUpdateAssignment && (
                          <>
                            <Button size="sm" onClick={() => { setShowPayDialog(fee.id); setPayAmount(String(fee.totalAmount - fee.paidAmount)); }}>
                              <DollarSign className="h-3.5 w-3.5 mr-1" /> {t('Pay')}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={async () => {
                              await feeService.waive(fee.id);
                              refreshRecipient();
                              toast({ title: t('Fee waived') });
                            }}>{t('Waive')}</Button>
                          </>
                        )}
                      </>
                    )}
                    {fee.status === 'partial' && (
                      <>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{t('Partial')} (₹{fee.paidAmount})</Badge>
                        {canUpdateAssignment && (
                          <Button size="sm" onClick={() => { setShowPayDialog(fee.id); setPayAmount(String(fee.totalAmount - fee.paidAmount)); }}>
                            <DollarSign className="h-3.5 w-3.5 mr-1" /> {t('Pay Remaining')}
                          </Button>
                        )}
                      </>
                    )}
                    {fee.status === 'paid' && (
                      <>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{t('Paid')}</Badge>
                        <span className="text-xs text-muted-foreground">{t('Distribute via Fee Collection')}</span>
                      </>
                    )}
                    {fee.status === 'waived' && !fee.distributedDate && (
                      <Badge variant="outline" className="bg-gray-100 text-gray-600">{t('Waived')}</Badge>
                    )}
                    {fee.status === 'distributed' && (
                      <>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{t('Distributed')}</Badge>
                        <Button size="sm" variant="outline" onClick={() => openReceipt(fee)}>
                          <Printer className="h-3.5 w-3.5 mr-1" /> {t('Receipt')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Package Dialog */}
      <Dialog open={showAssignPackage} onOpenChange={setShowAssignPackage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Assign Fee Package')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('Select Package')}</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger><SelectValue placeholder={t('Choose a package...')} /></SelectTrigger>
                <SelectContent>
                  {templates.filter(tmpl => tmpl.items && tmpl.items.length > 0).map(tmpl => (
                    <SelectItem key={tmpl.id} value={tmpl.id}>{tmpl.name} ({tmpl.items.length} items)</SelectItem>
                  ))}
                  {templates.every(tmpl => !tmpl.items || tmpl.items.length === 0) && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">{t('No packages with items. Add items to templates first.')}</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignPackage(false)}>{t('Cancel')}</Button>
            <Button disabled={!selectedTemplate} onClick={async () => {
              if (!id) return;
              try {
                await feeService.assignPackage(id, selectedTemplate);
                setShowAssignPackage(false);
                setSelectedTemplate('');
                refreshRecipient();
                toast({ title: t('Package assigned — fee record created') });
              } catch (err: unknown) {
                toast({ title: t('Error'), description: err instanceof Error ? err.message : t('Failed to assign package'), variant: 'destructive' });
              }
            }}>{t('Assign')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribution Receipt */}
      {printFee && (
        <PrintReceipt
          open={!!printFee}
          onOpenChange={(open) => !open && setPrintFee(null)}
          orgName={currentOrg?.name || ''}
          orgAddress={currentOrg?.address}
          orgLogoUrl={currentOrg?.logoUrl}
          title={t('Distribution Receipt')}
          date={printFee.fee.distributedDate || printFee.fee.createdAt}
          fields={[
            { label: t(config.recipientLabel), value: recipient.name },
            { label: t(config.identifierLabel), value: recipient.identifier || '—' },
            { label: t(config.groupLabel), value: recipient.group || '—' },
            { label: t('Package'), value: printFee.fee.templateName ?? printFee.fee.className ?? '—' },
            { label: t('Total Amount'), value: `${config.currencySymbol}${printFee.fee.totalAmount}` },
            { label: t('Amount Paid'), value: `${config.currencySymbol}${printFee.fee.paidAmount}` },
            { label: t('Payment Status'), value: printFee.fee.status === 'waived' ? t('Waived') : t('Paid') },
            ...(printFee.fee.paymentDate ? [{ label: t('Payment Date'), value: printFee.fee.paymentDate }] : []),
            ...(printFee.fee.distributedDate ? [{ label: t('Distribution Date'), value: printFee.fee.distributedDate }] : []),
          ]}
          items={printFee.items}
          notes={printFee.fee.notes || undefined}
          showSignature
          footer={`${t('Total')}: ${config.currencySymbol}${printFee.fee.totalAmount} | ${t('Receipt generated by')} ${currentOrg?.name}`}
        />
      )}

      {/* Pay Fee Dialog */}
      <Dialog open={!!showPayDialog} onOpenChange={(open) => !open && setShowPayDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Record Payment')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('Amount')}</Label>
              <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(null)}>{t('Cancel')}</Button>
            <Button onClick={async () => {
              if (!showPayDialog) return;
              await feeService.pay(showPayDialog, Number(payAmount));
              setShowPayDialog(null);
              refreshRecipient();
              toast({ title: t('Payment recorded') });
            }}>{t('Record Payment')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
