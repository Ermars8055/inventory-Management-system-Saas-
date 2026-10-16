import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Store, Mail, Phone, MapPin, Pencil, Trash2, Settings2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { vendorService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { CustomFieldsSheet } from '@/components/shared/CustomFieldsSheet';
import { CsvActions } from '@/components/shared/CsvActions';
import { CustomFieldsRenderer } from '@/components/shared/CustomFieldsRenderer';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Vendor } from '@/types';
import { capitalizeWords } from '@/lib/formatters';
import { CountryPhoneInput } from '@/components/ui/country-phone-input';

const EMPTY_FORM = {
  name: '', contactPerson: '', phone: '', email: '',
  address: '', vendorType: '', status: 'active' as 'active' | 'inactive',
  attributes: {} as Record<string, string | number | boolean>,
};

export function VendorsPage() {
  const { currentOrg } = useOrganization();
  const { can } = useAuth();
  const canCreate = can('vendors:create');
  const canUpdate = can('vendors:update');
  const canDelete = can('vendors:delete');
  const canManageFields = can('settings:update');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<Vendor | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [fieldsSheetOpen, setFieldsSheetOpen] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    vendorService.getByOrganization(currentOrg.id).then(setVendors);
  }, [currentOrg]);

  const filtered = vendors.filter((v) =>
    !search ||
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.vendorType || '').toLowerCase().includes(search.toLowerCase()),
  );

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  }

  function openEdit(v: Vendor, e: React.MouseEvent) {
    e.stopPropagation();
    setEditTarget(v);
    setForm({
      name: v.name,
      contactPerson: v.contactPerson || '',
      phone: v.phone || '',
      email: v.email || '',
      address: v.address || '',
      vendorType: v.vendorType || '',
      status: v.status,
      attributes: (v.attributes ?? {}) as Record<string, string | number | boolean>,
    });
    setShowDialog(true);
  }

  async function handleDelete(v: Vendor, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(t('Delete vendor') + ` "${v.name}"?`)) return;
    try {
      await vendorService.delete(v.id);
      setVendors((prev) => prev.filter((x) => x.id !== v.id));
      toast({ title: `${v.name} ${t('deleted')}` });
    } catch {
      toast({ title: t('Error'), description: t('Failed to delete vendor'), variant: 'destructive' });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg) return;
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await vendorService.update(editTarget.id, { ...form, attributes: form.attributes });
        setVendors((prev) => prev.map((v) => (v.id === editTarget.id ? updated : v)));
        toast({ title: `${updated.name} ${t('updated')}` });
      } else {
        const created = await vendorService.create({ ...form, organizationId: currentOrg.id, attributes: form.attributes });
        setVendors((prev) => [...prev, created]);
        toast({ title: `${created.name} ${t('added')}` });
      }
      setShowDialog(false);
    } catch {
      toast({ title: t('Error'), description: t('Failed to save vendor'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader
        title={t('Vendors')}
        description={`${vendors.length} ${vendors.length !== 1 ? t('vendors') : t('vendor')}`}
        actions={
          <div className="flex items-center gap-2">
            <CsvActions
              exportUrl="/data/export/vendors"
              importUrl={canCreate ? "/data/import/vendors" : undefined}
              entityName={t('Vendors')}
              sampleHeaders="name,contact_person,phone,email,address,vendor_type"
              onImportComplete={() => currentOrg && vendorService.getByOrganization(currentOrg.id).then(setVendors)}
            />
            {canManageFields && (
              <Button variant="outline" size="sm" onClick={() => setFieldsSheetOpen(true)}>
                <Settings2 className="h-4 w-4 mr-1" />{t('Custom Fields')}
              </Button>
            )}
            {canCreate && (
              <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />{t('Add Vendor')}</Button>
            )}
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('Search vendors...')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Store}
              title={t('No vendors found')}
              description={t('Add a vendor to start tracking purchases.')}
              action={canCreate ? <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />{t('Add Vendor')}</Button> : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((vendor) => (
            <Card
              key={vendor.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/vendors/${vendor.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{vendor.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{vendor.vendorType}</p>
                    </div>
                  </div>
                  {(canUpdate || canDelete) && (
                    <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                      {canUpdate && (
                        <button
                          onClick={(e) => openEdit(vendor, e)}
                          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={(e) => handleDelete(vendor, e)}
                          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {vendor.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{vendor.email}</span></p>}
                  {vendor.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0" />{vendor.phone}</p>}
                  {vendor.address && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{vendor.address}</span></p>}
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('Contact')}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{vendor.contactPerson || '—'}</span>
                    <StatusBadge status={vendor.status} />
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
            <DialogTitle>{editTarget ? t('Edit Vendor') : t('Add Vendor')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>{t('Vendor Name')} *</Label>
              <Input
                required
                placeholder={t('e.g. ABC Trading Co.')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: capitalizeWords(e.target.value) })}
                autoCapitalize="words"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('Contact Person')}</Label>
                <Input
                  placeholder={t('e.g. Rajesh Kumar')}
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: capitalizeWords(e.target.value) })}
                  autoCapitalize="words"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('Phone')}</Label>
                <CountryPhoneInput
                  value={form.phone}
                  onChange={(val) => setForm({ ...form, phone: val })}
                  placeholder="98765 43210"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('Email')}</Label>
              <Input type="email" placeholder={t('vendor@example.com')} value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Address')}</Label>
              <Input
                placeholder={t('City, State')}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: capitalizeWords(e.target.value) })}
                autoCapitalize="words"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Vendor Type')}</Label>
              <Input placeholder={t('e.g. Manufacturer, Distributor')} value={form.vendorType}
                onChange={(e) => setForm({ ...form, vendorType: e.target.value })} />
            </div>
            {editTarget && (
              <div className="space-y-1.5">
                <Label>{t('Status')}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as 'active' | 'inactive' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('Active')}</SelectItem>
                    <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <CustomFieldsRenderer
              entity="vendor"
              values={form.attributes}
              onChange={(attrs) => setForm({ ...form, attributes: attrs })}
            />
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>{t('Cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving ? t('Saving…') : editTarget ? t('Save Changes') : t('Add Vendor')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CustomFieldsSheet
        entity="vendor"
        entityLabel={t('Vendors')}
        open={fieldsSheetOpen}
        onOpenChange={setFieldsSheetOpen}
      />
    </div>
  );
}
