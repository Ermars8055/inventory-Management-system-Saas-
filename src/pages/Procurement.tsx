import { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Clock, CheckCircle, Package, Plus, Trash2, Search, PackageCheck, X } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { procurementService, vendorService, inventoryService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { KPICard } from '@/components/shared/KPICard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { PurchaseOrder, POStatus, Vendor, Item } from '@/types';

const STATUS_CONFIG: Record<POStatus, { label: string; className: string }> = {
  draft:               { label: 'Draft',              className: 'bg-muted text-muted-foreground' },
  pending:             { label: 'Pending Approval',   className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved:            { label: 'Approved',           className: 'bg-blue-50 text-blue-700 border-blue-200' },
  ordered:             { label: 'Ordered',            className: 'bg-purple-50 text-purple-700 border-purple-200' },
  partially_received:  { label: 'Part. Received',     className: 'bg-orange-50 text-orange-700 border-orange-200' },
  received:            { label: 'Received',           className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:           { label: 'Cancelled',          className: 'bg-red-50 text-red-700 border-red-200' },
};

interface LineItemDraft {
  itemId: string;
  itemName: string;
  quantityOrdered: number;
  unitPrice: number;
  _search?: string;
}

const EMPTY_FORM = {
  vendorId: '', vendorName: '',
  orderedDate: '', expectedDate: '',
  status: 'draft' as POStatus, notes: '',
};

export function ProcurementPage() {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([]);
  const [saving, setSaving] = useState(false);

  // Receive dialog
  const [receiveTarget, setReceiveTarget] = useState<PurchaseOrder | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
  const [receiving, setReceiving] = useState(false);

  const load = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const [data, vens, invItems] = await Promise.all([
        procurementService.getByOrganization(currentOrg.id),
        vendorService.getByOrganization(currentOrg.id),
        inventoryService.getByOrganization(currentOrg.id),
      ]);
      setOrders(data);
      setVendors(vens);
      setItems(invItems);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [currentOrg]);

  if (!currentOrg) return null;

  const filtered = orders.filter((po) => {
    const matchSearch = !search ||
      po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      po.vendorName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pending = orders.filter((p) => p.status === 'pending').length;
  const active = orders.filter((p) => p.status === 'approved' || p.status === 'ordered' || p.status === 'partially_received').length;
  const received = orders.filter((p) => p.status === 'received').length;

  // ── Line item helpers ──────────────────────────────────────────────────────
  function addLine() {
    setLineItems((prev) => [...prev, { itemId: '', itemName: '', quantityOrdered: 1, unitPrice: 0, _search: '' }]);
  }

  function removeLine(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, patch: Partial<LineItemDraft>) {
    setLineItems((prev) => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  }

  function selectItem(idx: number, item: Item) {
    updateLine(idx, { itemId: item.id, itemName: item.name, _search: item.name });
  }

  const totalAmount = useMemo(
    () => lineItems.reduce((s, l) => s + l.quantityOrdered * l.unitPrice, 0),
    [lineItems],
  );

  // ── Create PO ─────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vendorId && !form.vendorName) {
      toast({ title: t('Select a vendor'), variant: 'destructive' });
      return;
    }
    const selectedVendor = vendors.find((s) => s.id === form.vendorId);
    setSaving(true);
    try {
      await procurementService.create({
        organizationId: currentOrg!.id,
        poNumber: '',
        vendorName: selectedVendor?.name || form.vendorName,
        vendorId: form.vendorId || undefined,
        orderedDate: form.orderedDate,
        expectedDate: form.expectedDate,
        status: form.status,
        notes: form.notes,
        raisedBy: user?.name || 'Staff',
        amount: totalAmount,
        itemCount: lineItems.length,
        lineItems: lineItems.map((l) => ({
          itemId: l.itemId || undefined,
          itemName: l.itemName,
          quantityOrdered: l.quantityOrdered,
          unitPrice: l.unitPrice,
        })),
      });
      await load();
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setLineItems([]);
      toast({ title: t('Purchase order created') });
    } catch {
      toast({ title: t('Error'), description: t('Failed to create purchase order'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  // ── Status change ─────────────────────────────────────────────────────────
  async function handleStatusChange(id: string, status: POStatus) {
    try {
      const updated = await procurementService.update(id, { status });
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    } catch {
      toast({ title: t('Error'), description: t('Failed to update status'), variant: 'destructive' });
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    try {
      await procurementService.delete(id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
      toast({ title: t('Purchase order deleted') });
    } catch {
      toast({ title: t('Error'), description: t('Failed to delete'), variant: 'destructive' });
    }
  }

  // ── Receive PO ────────────────────────────────────────────────────────────
  function openReceive(po: PurchaseOrder) {
    setReceiveTarget(po);
    const init: Record<string, number> = {};
    (po.lineItems || []).forEach((l) => {
      init[l.id] = l.quantityOrdered - l.quantityReceived;
    });
    setReceiveQtys(init);
  }

  async function handleReceive(e: React.FormEvent) {
    e.preventDefault();
    if (!receiveTarget) return;
    const lines = Object.entries(receiveQtys)
      .filter(([, qty]) => qty > 0)
      .map(([lineItemId, quantityReceived]) => ({ lineItemId, quantityReceived }));
    if (lines.length === 0) {
      toast({ title: t('Enter quantity to receive for at least one item'), variant: 'destructive' });
      return;
    }
    setReceiving(true);
    try {
      const updated = await procurementService.receivePO(receiveTarget.id, lines);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setReceiveTarget(null);
      toast({ title: t('Stock received and inventory updated') });
      await load();
    } catch {
      toast({ title: t('Error'), description: t('Failed to receive stock'), variant: 'destructive' });
    } finally {
      setReceiving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("Procurement")}
        description={t("Manage purchase orders and vendor stock")}
        actions={
          <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setLineItems([]); setShowCreate(true); }}>
            <Plus className="h-4 w-4 mr-2" /> {t("New PO")}
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label={t("Total Orders")}    value={orders.length} icon={ShoppingCart}  variant="default" />
        <KPICard label={t("Pending")}         value={pending}       icon={Clock}         variant="warning" />
        <KPICard label={t("Active / Ordered")} value={active}       icon={CheckCircle}   variant="success" />
        <KPICard label={t("Received")}        value={received}      icon={Package}       variant="default" />
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("Search PO number or vendor...")} value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder={t("All Statuses")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("All Statuses")}</SelectItem>
            {(Object.keys(STATUS_CONFIG) as POStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{t(STATUS_CONFIG[s].label)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("PO Number")}</TableHead>
                <TableHead>{t("Vendor")}</TableHead>
                <TableHead>{t("Line Items")}</TableHead>
                <TableHead>{t("Order Date")}</TableHead>
                <TableHead>{t("Expected")}</TableHead>
                <TableHead className="text-right">{t("Amount (₹)")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">{t("Loading…")}</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">{t("No purchase orders found")}</TableCell></TableRow>
              ) : filtered.map((po) => {
                const cfg = STATUS_CONFIG[po.status] ?? STATUS_CONFIG.draft;
                const canReceive = po.status === 'ordered' || po.status === 'partially_received' || po.status === 'approved';
                return (
                  <TableRow key={po.id}>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{po.poNumber}</code>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{po.vendorName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {po.lineItems && po.lineItems.length > 0 ? (
                        <span className="text-xs">
                          {po.lineItems.length} {po.lineItems.length !== 1 ? t('items') : t('item')}
                          {po.lineItems.some((l) => l.quantityReceived > 0) && (
                            <span className="ml-1 text-emerald-600">
                              · {po.lineItems.reduce((s, l) => s + l.quantityReceived, 0)} {t("received")}
                            </span>
                          )}
                        </span>
                      ) : (po.itemsDesc || '—')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{po.orderedDate || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{po.expectedDate || '—'}</TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      {po.amount.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <Select value={po.status} onValueChange={(v) => handleStatusChange(po.id, v as POStatus)}>
                        <SelectTrigger className="h-7 w-[148px] text-xs">
                          <Badge variant="outline" className={`text-xs ${cfg.className} border-0 p-0`}>{t(cfg.label)}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_CONFIG) as POStatus[]).map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">{t(STATUS_CONFIG[s].label)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canReceive && (po.lineItems?.length ?? 0) > 0 && (
                          <button
                            onClick={() => openReceive(po)}
                            className="h-7 px-2 flex items-center gap-1 rounded text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                          >
                            <PackageCheck className="h-3.5 w-3.5" /> {t("Receive")}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(po.id)}
                          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Create PO Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("New Purchase Order")}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">

            {/* Vendor */}
            <div className="space-y-1.5">
              <Label>{t("Vendor")} *</Label>
              {vendors.length > 0 ? (
                <Select value={form.vendorId} onValueChange={(v) => setForm({ ...form, vendorId: v, vendorName: vendors.find((s) => s.id === v)?.name || '' })}>
                  <SelectTrigger><SelectValue placeholder={t("Select vendor…")} /></SelectTrigger>
                  <SelectContent>
                    {vendors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input required placeholder={t("Vendor name")} value={form.vendorName}
                  onChange={(e) => setForm({ ...form, vendorName: e.target.value })} />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("Order Date")}</Label>
                <Input type="date" value={form.orderedDate}
                  onChange={(e) => setForm({ ...form, orderedDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Expected By")}</Label>
                <Input type="date" value={form.expectedDate}
                  onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("Status")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as POStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_CONFIG) as POStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{t(STATUS_CONFIG[s].label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("Line Items")}</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> {t("Add Item")}
                </Button>
              </div>

              {lineItems.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">
                  {t('No items added. Click "Add Item" to specify what you\'re ordering.')}
                </p>
              )}

              <div className="space-y-2">
                {lineItems.map((line, idx) => (
                  <LineItemRow
                    key={idx}
                    line={line}
                    allItems={items}
                    onUpdate={(patch) => updateLine(idx, patch)}
                    onSelectItem={(item) => selectItem(idx, item)}
                    onRemove={() => removeLine(idx)}
                  />
                ))}
              </div>

              {lineItems.length > 0 && (
                <div className="flex justify-end pt-1">
                  <span className="text-sm font-semibold">
                    {t("Total")}: ₹{totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>{t("Notes")}</Label>
              <Textarea rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t("Any special instructions…")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>{t("Cancel")}</Button>
              <Button type="submit" disabled={saving || (!form.vendorId && !form.vendorName)}>
                {saving ? t('Creating…') : t('Create PO')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Receive PO Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!receiveTarget} onOpenChange={(open) => !open && setReceiveTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-emerald-600" />
              {t("Receive Stock")} — {receiveTarget?.poNumber}
            </DialogTitle>
          </DialogHeader>
          {receiveTarget && (
            <form onSubmit={handleReceive} className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {t("Enter the quantity received for each item. Inventory will be updated immediately.")}
              </p>

              <div className="space-y-2">
                {(receiveTarget.lineItems || []).map((line) => {
                  const remaining = line.quantityOrdered - line.quantityReceived;
                  return (
                    <div key={line.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{line.itemName}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("Ordered")}: {line.quantityOrdered}
                          {line.quantityReceived > 0 && ` · ${t("Already received")}: ${line.quantityReceived}`}
                          {remaining > 0 && ` · ${t("Remaining")}: ${remaining}`}
                        </p>
                      </div>
                      <div className="w-24 shrink-0">
                        <Input
                          type="number"
                          min={0}
                          max={remaining}
                          value={receiveQtys[line.id] ?? 0}
                          onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [line.id]: Number(e.target.value) }))}
                          className="h-8 text-center text-sm"
                          disabled={remaining <= 0}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setReceiveTarget(null)}>{t("Cancel")}</Button>
                <Button type="submit" disabled={receiving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {receiving ? t('Updating stock…') : t('Receive & Update Inventory')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Line Item Row Component ────────────────────────────────────────────────
function LineItemRow({
  line, allItems, onUpdate, onSelectItem, onRemove,
}: {
  line: { itemId: string; itemName: string; quantityOrdered: number; unitPrice: number; _search?: string };
  allItems: Item[];
  onUpdate: (patch: Partial<typeof line>) => void;
  onSelectItem: (item: Item) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const [showDropdown, setShowDropdown] = useState(false);

  const search = line._search || '';
  const suggestions = search.length > 0
    ? allItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())).slice(0, 6)
    : [];

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg border bg-background">
      {/* Item search */}
      <div className="flex-1 relative">
        <Input
          placeholder={t("Search inventory item…")}
          value={search}
          onChange={(e) => {
            onUpdate({ _search: e.target.value, itemId: '', itemName: e.target.value });
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          className="h-8 text-sm"
        />
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                onMouseDown={() => {
                  onSelectItem(item);
                  setShowDropdown(false);
                }}
              >
                <span className="font-medium">{item.name}</span>
                <span className="text-muted-foreground ml-2 text-xs">{item.sku} · {item.available} {t("avail")}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quantity */}
      <Input
        type="number" min={1} placeholder={t("Qty")}
        value={line.quantityOrdered}
        onChange={(e) => onUpdate({ quantityOrdered: Number(e.target.value) })}
        className="h-8 w-16 text-sm text-center"
      />

      {/* Unit Price */}
      <div className="relative w-24">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
        <Input
          type="number" min={0} placeholder={t("Price")}
          value={line.unitPrice}
          onChange={(e) => onUpdate({ unitPrice: Number(e.target.value) })}
          className="h-8 text-sm pl-5"
        />
      </div>

      <button
        type="button" onClick={onRemove}
        className="h-8 w-8 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
