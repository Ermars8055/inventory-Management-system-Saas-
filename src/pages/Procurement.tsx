import { useState, useEffect } from 'react';
import { ShoppingCart, Clock, CheckCircle, Package, Plus, Trash2, Search } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { procurementService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { KPICard } from '@/components/shared/KPICard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { PurchaseOrder, POStatus } from '@/types';

const STATUS_CONFIG: Record<POStatus, { label: string; className: string }> = {
  draft:     { label: 'Draft',            className: 'bg-muted text-muted-foreground' },
  pending:   { label: 'Pending Approval', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved:  { label: 'Approved',         className: 'bg-blue-50 text-blue-700 border-blue-200' },
  ordered:   { label: 'Ordered',          className: 'bg-purple-50 text-purple-700 border-purple-200' },
  received:  { label: 'Received',         className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled',        className: 'bg-red-50 text-red-700 border-red-200' },
};

const EMPTY_FORM = {
  supplier: '', itemsDesc: '', itemCount: 1,
  orderedDate: '', expectedDate: '', amount: 0,
  status: 'draft' as POStatus, notes: '',
};

export function ProcurementPage() {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const data = await procurementService.getByOrganization(currentOrg.id);
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [currentOrg]);

  if (!currentOrg) return null;

  const filtered = orders.filter((po) => {
    const matchSearch = !search ||
      po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      po.supplier.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pending = orders.filter((p) => p.status === 'pending').length;
  const approved = orders.filter((p) => p.status === 'approved' || p.status === 'ordered').length;
  const received = orders.filter((p) => p.status === 'received').length;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await procurementService.create({
        organizationId: currentOrg!.id,
        poNumber: '',
        raisedBy: user?.name || 'Staff',
        ...form,
      });
      await load();
      setShowCreate(false);
      setForm(EMPTY_FORM);
      toast({ title: 'Purchase order created' });
    } catch {
      toast({ title: 'Error', description: 'Failed to create purchase order', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: POStatus) {
    try {
      const updated = await procurementService.update(id, { status });
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  }

  async function handleDelete(id: string) {
    try {
      await procurementService.delete(id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
      toast({ title: 'Purchase order deleted' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  }

  const inp = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div>
      <PageHeader
        title="Procurement"
        description="Manage purchase orders and vendor procurement"
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> New PO
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label="Total Orders"       value={orders.length} icon={ShoppingCart} variant="default" />
        <KPICard label="Pending Approval"   value={pending}       icon={Clock}        variant="warning" />
        <KPICard label="Approved / Ordered" value={approved}      icon={CheckCircle}  variant="success" />
        <KPICard label="Received"           value={received}      icon={Package}      variant="default" />
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search PO number or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(Object.keys(STATUS_CONFIG) as POStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Raised By</TableHead>
                <TableHead className="text-right">Amount (₹)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-12">Loading…</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                    No purchase orders found
                  </TableCell>
                </TableRow>
              ) : filtered.map((po) => {
                const cfg = STATUS_CONFIG[po.status];
                return (
                  <TableRow key={po.id}>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{po.poNumber}</code>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{po.supplier}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                      {po.itemsDesc || '—'}
                      {po.itemCount > 0 && <span className="ml-1 text-xs">({po.itemCount})</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{po.orderedDate || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{po.expectedDate || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{po.raisedBy || '—'}</TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      {po.amount.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={po.status}
                        onValueChange={(v) => handleStatusChange(po.id, v as POStatus)}
                      >
                        <SelectTrigger className="h-7 w-[140px] text-xs">
                          <Badge variant="outline" className={`text-xs ${cfg.className} border-0 p-0`}>
                            {cfg.label}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_CONFIG) as POStatus[]).map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">{STATUS_CONFIG[s].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleDelete(po.id)}
                        className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create PO Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Supplier *</label>
              <input required className={inp} value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items Description</label>
              <input className={inp} value={form.itemsDesc}
                onChange={(e) => setForm({ ...form, itemsDesc: e.target.value })}
                placeholder="e.g. School Shirts, Pants" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Item Count</label>
                <input type="number" min="0" className={inp} value={form.itemCount}
                  onChange={(e) => setForm({ ...form, itemCount: +e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount (₹)</label>
                <input type="number" min="0" className={inp} value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: +e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order Date</label>
                <input type="date" className={inp} value={form.orderedDate}
                  onChange={(e) => setForm({ ...form, orderedDate: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expected By</label>
                <input type="date" className={inp} value={form.expectedDate}
                  onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</label>
              <select className={inp} value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as POStatus })}>
                {(Object.keys(STATUS_CONFIG) as POStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</label>
              <textarea className={inp} rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create PO'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
