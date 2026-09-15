import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Truck, Mail, Phone, MapPin, Pencil, Trash2 } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { supplierService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Supplier } from '@/types';

const EMPTY_FORM = {
  name: '', contactPerson: '', phone: '', email: '',
  address: '', itemsSupplied: '', status: 'active' as 'active' | 'inactive',
};

export function SuppliersPage() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    supplierService.getByOrganization(currentOrg.id).then(setSuppliers);
  }, [currentOrg]);

  const filtered = suppliers.filter((s) =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.itemsSupplied || '').toLowerCase().includes(search.toLowerCase()),
  );

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  }

  function openEdit(s: Supplier, e: React.MouseEvent) {
    e.stopPropagation();
    setEditTarget(s);
    setForm({
      name: s.name,
      contactPerson: s.contactPerson || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      itemsSupplied: s.itemsSupplied || '',
      status: s.status,
    });
    setShowDialog(true);
  }

  async function handleDelete(s: Supplier, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete supplier "${s.name}"?`)) return;
    try {
      await supplierService.delete(s.id);
      setSuppliers((prev) => prev.filter((x) => x.id !== s.id));
      toast({ title: `${s.name} deleted` });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete supplier', variant: 'destructive' });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg) return;
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await supplierService.update(editTarget.id, form);
        setSuppliers((prev) => prev.map((s) => (s.id === editTarget.id ? updated : s)));
        toast({ title: `${updated.name} updated` });
      } else {
        const created = await supplierService.create({ ...form, organizationId: currentOrg.id });
        setSuppliers((prev) => [...prev, created]);
        toast({ title: `${created.name} added` });
      }
      setShowDialog(false);
    } catch {
      toast({ title: 'Error', description: 'Failed to save supplier', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description={`${suppliers.length} supplier${suppliers.length !== 1 ? 's' : ''}`}
        actions={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add Supplier</Button>}
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Truck}
              title="No suppliers found"
              description="Add a supplier to start tracking purchases."
              action={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add Supplier</Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((supplier) => (
            <Card
              key={supplier.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/suppliers/${supplier.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{supplier.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{supplier.itemsSupplied}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => openEdit(supplier, e)}
                      className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(supplier, e)}
                      className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {supplier.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{supplier.email}</span></p>}
                  {supplier.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0" />{supplier.phone}</p>}
                  {supplier.address && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{supplier.address}</span></p>}
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                  <span className="text-muted-foreground">Contact</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{supplier.contactPerson || '—'}</span>
                    <StatusBadge status={supplier.status} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Supplier Name *</Label>
              <Input required placeholder="e.g. ABC Trading Co." value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contact Person</Label>
                <Input placeholder="e.g. Rajesh Kumar" value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input placeholder="+91 98765 43210" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="supplier@example.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input placeholder="City, State" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Items Supplied</Label>
              <Input placeholder="e.g. Uniforms, Stationery" value={form.itemsSupplied}
                onChange={(e) => setForm({ ...form, itemsSupplied: e.target.value })} />
            </div>
            {editTarget && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as 'active' | 'inactive' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Supplier'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
