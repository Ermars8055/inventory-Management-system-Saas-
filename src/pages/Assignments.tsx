import { useState, useEffect, useMemo } from 'react';
import { Search, UserCheck, Plus, AlertTriangle, CheckCircle2, XCircle, DollarSign, Printer } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useOrgConfig } from '@/hooks/useOrgConfig';
import { recipientService, assignmentService, inventoryService, transactionService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { PrintReceipt } from '@/components/shared/PrintReceipt';
import type { Recipient, Assignment, Item } from '@/types';

const TODAY = new Date().toISOString().slice(0, 10);

function isOverdue(a: Assignment) {
  return a.mode === 'lending' && a.status === 'issued' && !!a.expectedReturn && a.expectedReturn < TODAY;
}

function StatusBadge({ assignment }: { assignment: Assignment }) {
  const { t } = useTranslation();
  if (isOverdue(assignment)) {
    return <Badge variant="destructive" className="text-xs">{t('Overdue')}</Badge>;
  }
  switch (assignment.status) {
    case 'distributed':
      return <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">{t('Distributed')}</Badge>;
    case 'issued':
      return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">{t('Active')}</Badge>;
    case 'returned':
      return <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">{t('Returned')}</Badge>;
    case 'returned_damaged':
      return <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">{t('Damaged')}</Badge>;
    case 'fine_pending':
      return <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">{t('Fine Pending')}</Badge>;
    case 'fine_paid':
      return <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">{t('Fine Paid')}</Badge>;
    case 'lost':
      return <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 border-gray-300">{t('Lost')}</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{assignment.status}</Badge>;
  }
}

function FeeBadge({ assignment }: { assignment: Assignment }) {
  const { t } = useTranslation();
  if (assignment.mode !== 'distribution' || assignment.feeAmount === 0) return null;
  switch (assignment.feeStatus) {
    case 'paid':
      return <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">{t('Paid')}</Badge>;
    case 'partial':
      return <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">{t('Partial')}</Badge>;
    case 'waived':
      return <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">{t('Waived')}</Badge>;
    default:
      return <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">₹{assignment.feeAmount} {t('Unpaid')}</Badge>;
  }
}

export function AssignmentsPage() {
  const { currentOrg } = useOrganization();
  const config = useOrgConfig();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selected, setSelected] = useState<Recipient | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [inventoryItems, setInventoryItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');

  // Issue dialog
  const [issueDialog, setIssueDialog] = useState(false);
  const [issueForm, setIssueForm] = useState({
    itemId: '', quantity: '1', conditionIssued: 'Good', expectedReturn: '', notes: '',
  });
  const [issueSaving, setIssueSaving] = useState(false);

  // Return dialog
  const [returnDialog, setReturnDialog] = useState<Assignment | null>(null);
  const [returnForm, setReturnForm] = useState({
    returnReason: '', conditionReturned: 'Good', damageNotes: '', fineAmount: '', receivedBy: '',
  });
  const [returnSaving, setReturnSaving] = useState(false);

  // Lost dialog
  const [lostDialog, setLostDialog] = useState<Assignment | null>(null);
  const [lostForm, setLostForm] = useState({ fineAmount: '', notes: '' });
  const [lostSaving, setLostSaving] = useState(false);
  const [printAssignment, setPrintAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    if (!currentOrg) return;
    recipientService.getByOrganization(currentOrg.id).then(setRecipients);
    inventoryService.getByOrganization(currentOrg.id).then(setInventoryItems);
  }, [currentOrg]);

  const filteredRecipients = useMemo(() => {
    if (!search) return recipients;
    const q = search.toLowerCase();
    return recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.identifier?.toLowerCase().includes(q) ||
        r.group?.toLowerCase().includes(q),
    );
  }, [recipients, search]);

  const loadAssignments = async (r: Recipient) => {
    if (!currentOrg) return;
    setSelected(r);
    const data = await recipientService.getAssignments(currentOrg.id, r.id);
    setAssignments(data);
  };

  const ACTIVE_STATUSES = ['issued', 'distributed', 'fine_pending'];
  const active = assignments.filter((a) => ACTIVE_STATUSES.includes(a.status) || isOverdue(a));
  const history = assignments.filter((a) => !ACTIVE_STATUSES.includes(a.status) && !isOverdue(a));

  // ── Issue ─────────────────────────────────────────────────────────────────
  const handleIssue = async () => {
    if (!currentOrg || !selected || !issueForm.itemId) return;
    const item = inventoryItems.find((i) => i.id === issueForm.itemId);
    if (!item) return;
    const qty = parseInt(issueForm.quantity) || 1;
    setIssueSaving(true);
    try {
      await assignmentService.create({
        organizationId: currentOrg.id,
        recipientId: selected.id,
        recipientName: selected.name,
        recipientIdentifier: selected.identifier,
        recipientGroup: selected.group,
        itemId: item.id,
        itemName: item.name,
        quantity: qty,
        conditionIssued: issueForm.conditionIssued,
        issueDate: TODAY,
        expectedReturn: issueForm.expectedReturn || undefined,
        notes: issueForm.notes || undefined,
      });
      // Backend handles inventory update + stock transaction creation
      await loadAssignments(selected);
      setIssueDialog(false);
      setIssueForm({ itemId: '', quantity: '1', conditionIssued: 'Good', expectedReturn: '', notes: '' });
      toast({ title: `${item.name} ${t(config.assignmentLabel).toLowerCase()}d ${t('to')} ${selected.name}` });
    } finally {
      setIssueSaving(false);
    }
  };

  // ── Return ────────────────────────────────────────────────────────────────
  const openReturn = (a: Assignment) => {
    setReturnDialog(a);
    setReturnForm({ returnReason: '', conditionReturned: 'Good', damageNotes: '', fineAmount: '', receivedBy: '' });
  };

  const handleReturn = async () => {
    if (!returnDialog || !selected) return;
    setReturnSaving(true);
    try {
      await assignmentService.returnItem(returnDialog.id, {
        conditionReturned: returnForm.conditionReturned,
        damageNotes: [returnForm.returnReason, returnForm.damageNotes].filter(Boolean).join(' — ') || undefined,
        fineAmount: returnForm.fineAmount ? parseFloat(returnForm.fineAmount) : undefined,
        receivedBy: returnForm.receivedBy || undefined,
      });
      await inventoryService.adjustStock(returnDialog.itemId, returnDialog.quantity);
      await loadAssignments(selected);
      setReturnDialog(null);
      toast({ title: t('Item returned'), description: returnForm.damageNotes ? t('Damage noted on record.') : undefined });
    } finally {
      setReturnSaving(false);
    }
  };

  // ── Lost ──────────────────────────────────────────────────────────────────
  const openLost = (a: Assignment) => {
    setLostDialog(a);
    setLostForm({ fineAmount: '', notes: '' });
  };

  const handleLost = async () => {
    if (!lostDialog || !selected) return;
    setLostSaving(true);
    try {
      await assignmentService.markLost(lostDialog.id, {
        fineAmount: lostForm.fineAmount ? parseFloat(lostForm.fineAmount) : undefined,
        notes: lostForm.notes || undefined,
      });
      await loadAssignments(selected);
      setLostDialog(null);
      toast({ title: t('Marked as lost'), description: lostForm.fineAmount ? `${t(config.fineLabel)} ${t('of')} ${config.currencySymbol}${lostForm.fineAmount} ${t('raised.')}` : undefined });
    } finally {
      setLostSaving(false);
    }
  };

  // ── Fine paid ─────────────────────────────────────────────────────────────
  const handleFinePaid = async (a: Assignment) => {
    if (!selected) return;
    await assignmentService.markFinePaid(a.id);
    await loadAssignments(selected);
    toast({ title: `${t(config.fineLabel)} ${t('marked as paid')}` });
  };

  if (!currentOrg) return null;

  const isDamaged = ['Fair', 'Poor'].includes(returnForm.conditionReturned);

  return (
    <div>
      <PageHeader
        title={`${t(config.assignmentLabel)}s`}
        description={`${t('Search a')} ${t(config.recipientLabel).toLowerCase()} ${t('to manage their')} ${t(config.assignmentLabel).toLowerCase()}s`}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recipient search panel */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('Search')} {t(config.recipientLabel)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`${t('Name or')} ${t(config.identifierLabel)}…`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="space-y-1">
                {filteredRecipients.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => loadAssignments(r)}
                    className={`w-full text-left p-3 rounded-md border transition-colors hover:bg-accent ${
                      selected?.id === r.id ? 'bg-accent border-primary' : 'border-transparent'
                    }`}
                  >
                    <p className="font-medium text-sm">{r.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.group && `${r.group} · `}{r.identifier || '—'}
                    </p>
                  </button>
                ))}
                {filteredRecipients.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {t('No')} {t(config.recipientPluralLabel).toLowerCase()} {t('found')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <EmptyState
              icon={UserCheck}
              title={`${t('No')} ${t(config.recipientLabel).toLowerCase()} ${t('selected')}`}
              description={`${t('Search and select a')} ${t(config.recipientLabel).toLowerCase()} ${t('to view their')} ${t(config.assignmentLabel).toLowerCase()}s.`}
            />
          ) : (
            <>
              {/* Header */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                        {selected.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{selected.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selected.group && `${t(config.groupLabel)}: ${selected.group} · `}
                          {t(config.identifierLabel)}: {selected.identifier || '—'}
                        </p>
                        {selected.contact && (
                          <p className="text-xs text-muted-foreground">{selected.contact}</p>
                        )}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setIssueDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t(config.assignmentLabel)} {t('Item')}
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm border-t pt-3">
                    <span>
                      <span className="font-semibold text-primary">{active.length}</span>
                      <span className="text-muted-foreground ml-1">{t('active')}</span>
                    </span>
                    <span>
                      <span className="font-semibold text-emerald-600">
                        {assignments.filter((a) => a.status === 'returned').length}
                      </span>
                      <span className="text-muted-foreground ml-1">{t('returned')}</span>
                    </span>
                    <span>
                      <span className="font-semibold text-destructive">
                        {assignments.filter(isOverdue).length}
                      </span>
                      <span className="text-muted-foreground ml-1">{t('overdue')}</span>
                    </span>
                    {config.enableFines && (
                      <span>
                        <span className="font-semibold text-orange-600">
                          {assignments.filter((a) => a.status === 'fine_pending').length}
                        </span>
                        <span className="text-muted-foreground ml-1">{t('unpaid')} {t(config.fineLabel).toLowerCase()}s</span>
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Active assignments */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('Active')} {t(config.assignmentLabel)}s</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {active.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      {t('No active')} {t(config.assignmentLabel).toLowerCase()}s
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('Item')}</TableHead>
                          <TableHead>{t('Qty')}</TableHead>
                          {config.enableConditionTracking && <TableHead>{t('Condition')}</TableHead>}
                          <TableHead>{t('Date')}</TableHead>
                          {config.assignmentMode === 'lending' && <TableHead>{t('Due')}</TableHead>}
                          <TableHead>{t('Status')}</TableHead>
                          <TableHead>{t('Fee')}</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {active.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{a.itemName}</TableCell>
                            <TableCell>{a.quantity}</TableCell>
                            {config.enableConditionTracking && (
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{a.conditionIssued}</Badge>
                              </TableCell>
                            )}
                            <TableCell className="text-muted-foreground text-sm">{a.issueDate}</TableCell>
                            {config.assignmentMode === 'lending' && (
                              <TableCell className={`text-sm ${isOverdue(a) ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                {a.expectedReturn ?? '—'}
                              </TableCell>
                            )}
                            <TableCell><StatusBadge assignment={a} /></TableCell>
                            <TableCell>
                              <FeeBadge assignment={a} />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1.5">
                                {a.mode === 'lending' && (
                                  <>
                                    <Button variant="outline" size="sm" onClick={() => openReturn(a)}>
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                      {t('Return')}
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => openLost(a)}>
                                      <XCircle className="h-3.5 w-3.5 mr-1" />
                                      {t('Lost')}
                                    </Button>
                                  </>
                                )}
                                {a.mode === 'distribution' && a.feeStatus === 'unpaid' && a.feeAmount > 0 && (
                                  <Button variant="outline" size="sm" onClick={async () => {
                                    await assignmentService.markFeePaid(a.id);
                                    setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, feeStatus: 'paid' as const } : x));
                                    toast({ title: t('Fee marked as paid') });
                                  }}>
                                    <DollarSign className="h-3.5 w-3.5 mr-1" />
                                    {t('Mark Paid')}
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => setPrintAssignment(a)} title={t('Print Receipt')}>
                                  <Printer className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* History */}
              {history.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-muted-foreground">{t('History')}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('Item')}</TableHead>
                          <TableHead>{t(config.assignmentLabel)} {t('Date')}</TableHead>
                          <TableHead>{t('Returned')}</TableHead>
                          <TableHead>{t('Status')}</TableHead>
                          {config.enableFines && <TableHead>{t(config.fineLabel)}</TableHead>}
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">
                              <div>
                                <p>{a.itemName}</p>
                                {a.damageNotes && (
                                  <p className="text-xs text-orange-600 flex items-center gap-1 mt-0.5">
                                    <AlertTriangle className="h-3 w-3" />
                                    {a.damageNotes}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{a.issueDate}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{a.returnDate ?? '—'}</TableCell>
                            <TableCell><StatusBadge assignment={a} /></TableCell>
                            {config.enableFines && (
                              <TableCell>
                                {a.fineAmount ? (
                                  <span className={a.finePaid ? 'text-emerald-600 text-sm' : 'text-red-600 text-sm font-medium'}>
                                    {config.currencySymbol}{a.fineAmount}
                                    {a.finePaid ? ` (${t('paid')})` : ''}
                                  </span>
                                ) : '—'}
                              </TableCell>
                            )}
                            <TableCell>
                              {a.status === 'fine_pending' && (
                                <Button variant="outline" size="sm" onClick={() => handleFinePaid(a)}>
                                  <DollarSign className="h-3.5 w-3.5 mr-1" />
                                  {t('Mark Paid')}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Issue dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={issueDialog} onOpenChange={setIssueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t(config.assignmentLabel)} {t('Item to')} {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('Select Item')}</Label>
              <Select
                value={issueForm.itemId}
                onValueChange={(v) => setIssueForm({ ...issueForm, itemId: v })}
              >
                <SelectTrigger><SelectValue placeholder={t('Choose an item…')} /></SelectTrigger>
                <SelectContent>
                  {inventoryItems.filter((i) => i.available > 0).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                      <span className="text-muted-foreground ml-2 text-xs">({item.available} {t('available')})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Quantity')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={issueForm.quantity}
                  onChange={(e) => setIssueForm({ ...issueForm, quantity: e.target.value })}
                />
              </div>
              {config.enableConditionTracking && (
                <div className="space-y-2">
                  <Label>{t('Condition at')} {t(config.assignmentLabel)}</Label>
                  <Select
                    value={issueForm.conditionIssued}
                    onValueChange={(v) => setIssueForm({ ...issueForm, conditionIssued: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">{t('New')}</SelectItem>
                      <SelectItem value="Good">{t('Good')}</SelectItem>
                      <SelectItem value="Fair">{t('Fair')}</SelectItem>
                      <SelectItem value="Poor">{t('Poor')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('Expected Return Date')}</Label>
              <Input
                type="date"
                value={issueForm.expectedReturn}
                onChange={(e) => setIssueForm({ ...issueForm, expectedReturn: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Notes')} ({t('optional')})</Label>
              <Textarea
                value={issueForm.notes}
                onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                placeholder={t('Any notes…')}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueDialog(false)}>{t('Cancel')}</Button>
            <Button onClick={handleIssue} disabled={!issueForm.itemId || issueSaving}>
              {issueSaving ? t('Saving…') : `${t(config.assignmentLabel)} ${t('Item')}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Return dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={!!returnDialog} onOpenChange={(open) => !open && setReturnDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Return')}: {returnDialog?.itemName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('Reason for Return')}</Label>
              <Input
                value={returnForm.returnReason}
                onChange={(e) => setReturnForm({ ...returnForm, returnReason: e.target.value })}
                placeholder={t('e.g. Wrong size, damaged, not needed…')}
              />
            </div>
            {config.enableConditionTracking && (
              <div className="space-y-2">
                <Label>{t('Condition on Return')}</Label>
                <Select
                  value={returnForm.conditionReturned}
                  onValueChange={(v) => setReturnForm({ ...returnForm, conditionReturned: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">{t('New')}</SelectItem>
                    <SelectItem value="Good">{t('Good')}</SelectItem>
                    <SelectItem value="Fair">{t('Fair')}</SelectItem>
                    <SelectItem value="Poor">{t('Poor')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {(config.enableConditionTracking ? isDamaged : true) && (
              <div className="space-y-2">
                <Label>{t('Damage Notes')}</Label>
                <Textarea
                  value={returnForm.damageNotes}
                  onChange={(e) => setReturnForm({ ...returnForm, damageNotes: e.target.value })}
                  placeholder={t('Describe any damage…')}
                  rows={2}
                />
              </div>
            )}
            {config.enableFines && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>{t(config.fineLabel)} {t('Amount')} <span className="text-muted-foreground font-normal text-xs">({t('leave blank if none')})</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{config.currencySymbol}</span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={returnForm.fineAmount}
                      onChange={(e) => setReturnForm({ ...returnForm, fineAmount: e.target.value })}
                      className="pl-7"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>{t('Received By')}</Label>
              <Input
                value={returnForm.receivedBy}
                onChange={(e) => setReturnForm({ ...returnForm, receivedBy: e.target.value })}
                placeholder={t('Staff name…')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialog(null)}>{t('Cancel')}</Button>
            <Button onClick={handleReturn} disabled={returnSaving}>
              {returnSaving ? t('Saving…') : t('Confirm Return')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Lost dialog ───────────────────────────────────────────────────────── */}
      <Dialog open={!!lostDialog} onOpenChange={(open) => !open && setLostDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Report Lost')}: {lostDialog?.itemName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {t('This item will be marked as lost and removed from')} {selected?.name}{t("'s active")} {t(config.assignmentLabel).toLowerCase()}s.
            </p>
            {config.enableFines && (
              <div className="space-y-2">
                <Label>{t(config.fineLabel)} {t('Amount')} <span className="text-muted-foreground font-normal text-xs">({t('leave blank if none')})</span></Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{config.currencySymbol}</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={lostForm.fineAmount}
                    onChange={(e) => setLostForm({ ...lostForm, fineAmount: e.target.value })}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t('Notes')}</Label>
              <Textarea
                value={lostForm.notes}
                onChange={(e) => setLostForm({ ...lostForm, notes: e.target.value })}
                placeholder={t('Any context about how it was lost…')}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostDialog(null)}>{t('Cancel')}</Button>
            <Button variant="destructive" onClick={handleLost} disabled={lostSaving}>
              {lostSaving ? t('Saving…') : t('Mark as Lost')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Receipt */}
      {printAssignment && (
        <PrintReceipt
          open={!!printAssignment}
          onOpenChange={(open) => !open && setPrintAssignment(null)}
          orgName={currentOrg?.name || ''}
          orgAddress={currentOrg?.address}
          orgLogoUrl={currentOrg?.logoUrl}
          title={`${config.assignmentLabel} Receipt`}
          date={printAssignment.issueDate}
          fields={[
            { label: config.recipientLabel, value: printAssignment.recipientName },
            { label: config.identifierLabel, value: printAssignment.recipientIdentifier || '—' },
            { label: config.groupLabel, value: printAssignment.recipientGroup || '—' },
            { label: 'Status', value: printAssignment.status },
            ...(printAssignment.conditionIssued ? [{ label: 'Condition', value: printAssignment.conditionIssued }] : []),
            ...(printAssignment.expectedReturn ? [{ label: 'Expected Return', value: printAssignment.expectedReturn }] : []),
          ]}
          items={[{ name: printAssignment.itemName, qty: printAssignment.quantity, details: printAssignment.itemDetails }]}
          notes={printAssignment.notes}
          showSignature
          footer={`${config.assignmentLabel} issued by ${printAssignment.issuedBy || 'Store Manager'}`}
        />
      )}
    </div>
  );
}
