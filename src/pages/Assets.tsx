import { useState, useEffect } from 'react';
import { Briefcase, Monitor, Wrench, User, Plus, Trash2, Search, Pencil, Settings2 } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { assetService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { CustomFieldsSheet } from '@/components/shared/CustomFieldsSheet';
import { KPICard } from '@/components/shared/KPICard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import type { Asset, AssetStatus } from '@/types';

const STATUS_CONFIG: Record<AssetStatus, { label: string; className: string }> = {
  in_use:      { label: 'In Use',      className: 'bg-blue-50 text-blue-700 border-blue-200' },
  available:   { label: 'Available',   className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  maintenance: { label: 'Maintenance', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  retired:     { label: 'Retired',     className: 'bg-muted text-muted-foreground' },
};

const CONDITION_CONFIG: Record<string, string> = {
  Good: 'text-emerald-600',
  Fair: 'text-amber-600',
  Poor: 'text-red-600',
};

const ASSET_TYPES = ['IT Equipment', 'Furniture', 'Vehicle', 'Lab Equipment', 'Sports Equipment', 'Other'];

const EMPTY_FORM: Omit<Asset, 'id' | 'assetCode' | 'organizationId' | 'createdAt'> = {
  name: '', assetType: 'IT Equipment', assignedTo: '', department: '',
  location: '', condition: 'Good', status: 'available', purchaseDate: '', value: 0, notes: '',
};

export function AssetsPage() {
  const { currentOrg } = useOrganization();
  const { can } = useAuth();
  const canCreate = can('inventory:create');
  const canUpdate = can('inventory:update');
  const canDelete = can('inventory:delete');
  const canManageFields = can('settings:update');
  const { toast } = useToast();
  const { t } = useTranslation();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [fieldsSheetOpen, setFieldsSheetOpen] = useState(false);

  const load = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const data = await assetService.getByOrganization(currentOrg.id);
      setAssets(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [currentOrg]);

  if (!currentOrg) return null;

  const filtered = assets.filter((a) => {
    const matchSearch = !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.assetCode || '').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || a.assetType === typeFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const total = assets.length;
  const inUse = assets.filter((a) => a.status === 'in_use').length;
  const available = assets.filter((a) => a.status === 'available').length;
  const maintenance = assets.filter((a) => a.status === 'maintenance').length;

  function openCreate() {
    setEditAsset(null);
    setForm({ ...EMPTY_FORM });
    setShowCreate(true);
  }

  function openEdit(asset: Asset) {
    setEditAsset(asset);
    setForm({
      name: asset.name, assetType: asset.assetType || 'IT Equipment',
      assignedTo: asset.assignedTo || '', department: asset.department || '',
      location: asset.location || '', condition: asset.condition,
      status: asset.status, purchaseDate: asset.purchaseDate || '',
      value: asset.value, notes: asset.notes || '',
    });
    setShowCreate(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editAsset) {
        const updated = await assetService.update(editAsset.id, form);
        setAssets((prev) => prev.map((a) => (a.id === editAsset.id ? updated : a)));
        toast({ title: t('Asset updated') });
      } else {
        await assetService.create({ organizationId: currentOrg!.id, ...form });
        await load();
        toast({ title: t('Asset created') });
      }
      setShowCreate(false);
    } catch {
      toast({ title: t('Error'), description: t('Failed to save asset'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await assetService.delete(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
      toast({ title: t('Asset deleted') });
    } catch {
      toast({ title: t('Error'), description: t('Failed to delete'), variant: 'destructive' });
    }
  }

  const inp = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div>
      <PageHeader
        title={t('Asset Management')}
        description={t('Track and manage organizational assets and equipment')}
        actions={
          <div className="flex items-center gap-2">
            {canManageFields && (
              <Button variant="outline" size="sm" onClick={() => setFieldsSheetOpen(true)}>
                <Settings2 className="h-4 w-4 mr-1" />{t('Custom Fields')}
              </Button>
            )}
            {canCreate && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> {t('Add Asset')}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label={t('Total Assets')}       value={total}       icon={Briefcase} variant="default" />
        <KPICard label={t('In Use')}             value={inUse}       icon={User}      variant="success" />
        <KPICard label={t('Available')}          value={available}   icon={Monitor}   variant="default" />
        <KPICard label={t('Under Maintenance')}  value={maintenance} icon={Wrench}    variant="warning" />
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Search assets...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t('All Types')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Types')}</SelectItem>
            {ASSET_TYPES.map((typ) => <SelectItem key={typ} value={typ}>{t(typ)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('All Statuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Statuses')}</SelectItem>
            {(Object.keys(STATUS_CONFIG) as AssetStatus[]).map((s) => (
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
                <TableHead>{t('Asset')}</TableHead>
                <TableHead>{t('Asset ID')}</TableHead>
                <TableHead>{t('Type')}</TableHead>
                <TableHead>{t('Assigned To')}</TableHead>
                <TableHead>{t('Location')}</TableHead>
                <TableHead>{t('Condition')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead className="text-right">{t('Value (₹)')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-12">{t('Loading…')}</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                    {t('No assets found')}
                  </TableCell>
                </TableRow>
              ) : filtered.map((asset) => {
                const statusCfg = STATUS_CONFIG[asset.status];
                return (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {asset.assetCode || '—'}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{asset.assetType || '—'}</TableCell>
                    <TableCell className="text-sm">
                      {asset.assignedTo || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{asset.location || '—'}</TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${CONDITION_CONFIG[asset.condition] || ''}`}>
                        {t(asset.condition)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${statusCfg.className}`}>
                        {t(statusCfg.label)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {asset.value.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      {(canUpdate || canDelete) && (
                        <div className="flex gap-1">
                          {canUpdate && (
                            <button
                              onClick={() => openEdit(asset)}
                              className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(asset.id)}
                              className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editAsset ? t('Edit Asset') : t('Add Asset')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Asset Name')} *</label>
              <input required className={inp} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Type')}</label>
                <select className={inp} value={form.assetType}
                  onChange={(e) => setForm({ ...form, assetType: e.target.value })}>
                  {ASSET_TYPES.map((typ) => <option key={typ} value={typ}>{t(typ)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Condition')}</label>
                <select className={inp} value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value as Asset['condition'] })}>
                  <option value="Good">{t('Good')}</option>
                  <option value="Fair">{t('Fair')}</option>
                  <option value="Poor">{t('Poor')}</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Status')}</label>
                <select className={inp} value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as AssetStatus })}>
                  {(Object.keys(STATUS_CONFIG) as AssetStatus[]).map((s) => (
                    <option key={s} value={s}>{t(STATUS_CONFIG[s].label)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Value (₹)')}</label>
                <input type="number" min="0" className={inp} value={form.value}
                  onChange={(e) => setForm({ ...form, value: +e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Assigned To')}</label>
                <input className={inp} value={form.assignedTo}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Department')}</label>
                <input className={inp} value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Location')}</label>
                <input className={inp} value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Purchase Date')}</label>
                <input type="date" className={inp} value={form.purchaseDate}
                  onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Notes')}</label>
              <textarea className={inp} rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>{t('Cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving ? t('Saving…') : editAsset ? t('Update') : t('Add Asset')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CustomFieldsSheet
        entity="asset"
        entityLabel={t('Assets')}
        open={fieldsSheetOpen}
        onOpenChange={setFieldsSheetOpen}
      />
    </div>
  );
}
