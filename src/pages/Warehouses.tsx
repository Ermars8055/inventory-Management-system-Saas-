import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Warehouse as WarehouseIcon, MapPin, Plus, ArrowLeftRight, Search, Building2, Package,
  AlertTriangle, CheckCircle2, User, Download, Edit2, Trash2, RefreshCw, BarChart3,
  Eye, ArrowUpRight, Phone, Send,
} from 'lucide-react';
import { capitalizeWords } from '@/lib/formatters';
import { CountryPhoneInput } from '@/components/ui/country-phone-input';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { useOrganization } from '@/context/OrganizationContext';
import { useTranslation } from '@/hooks/useTranslation';
import { warehouseService, locationService, inventoryService } from '@/services';
import type { Warehouse, StorageLocation, Item } from '@/types';

function exportCSV(rows: (string | number)[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function WarehousesPage() {
  const { currentOrg } = useOrganization();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedSourceWh, setSelectedSourceWh] = useState<string>('');
  const [viewItemsModalOpen, setViewItemsModalOpen] = useState(false);
  const [selectedWarehouseForItems, setSelectedWarehouseForItems] = useState<Warehouse | null>(null);
  const [warehouseItems, setWarehouseItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Form states for Warehouse Add/Edit
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formBuilding, setFormBuilding] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formSupervisor, setFormSupervisor] = useState('');
  const [formSupervisorPhone, setFormSupervisorPhone] = useState('');
  const [formCapacity, setFormCapacity] = useState('5000');
  const [savingWarehouse, setSavingWarehouse] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states for Dispatch / Transfer
  const [dispatchItemId, setDispatchItemId] = useState('');
  const [dispatchTargetType, setDispatchTargetType] = useState<'warehouse' | 'location'>('location');
  const [dispatchTargetWhId, setDispatchTargetWhId] = useState('');
  const [dispatchTargetLocId, setDispatchTargetLocId] = useState('');
  const [dispatchQty, setDispatchQty] = useState('1');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [submittingDispatch, setSubmittingDispatch] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [whData, locData, itemData] = await Promise.all([
        warehouseService.getAll(),
        locationService.getAll(),
        inventoryService.getByOrganization(currentOrg?.id || ''),
      ]);
      setWarehouses(whData);
      setLocations(locData);
      setItems(itemData);
    } catch (err) {
      console.error('Failed to load warehouses', err);
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered Warehouses
  const filteredWarehouses = useMemo(() => {
    if (!search.trim()) return warehouses;
    const q = search.toLowerCase();
    return warehouses.filter((wh) =>
      wh.name.toLowerCase().includes(q) ||
      (wh.code || '').toLowerCase().includes(q) ||
      (wh.building || '').toLowerCase().includes(q) ||
      (wh.address || '').toLowerCase().includes(q) ||
      (wh.supervisorName || '').toLowerCase().includes(q)
    );
  }, [warehouses, search]);

  // Overall KPIs
  const totalUnitsInStorage = useMemo(() => warehouses.reduce((s, w) => s + (w.totalUnits || 0), 0), [warehouses]);
  const totalCapacity = useMemo(() => warehouses.reduce((s, w) => s + (w.maxCapacity || 5000), 0), [warehouses]);
  const overallUtilization = totalCapacity > 0 ? Math.round((totalUnitsInStorage / totalCapacity) * 100) : 0;
  const highCapacityCount = useMemo(() => warehouses.filter((w) => (w.utilizationPct || 0) >= 85).length, [warehouses]);

  // Open Create Modal
  function handleOpenCreateWarehouse() {
    setEditingWarehouse(null);
    setFormName('');
    setFormCode('');
    setFormBuilding('');
    setFormAddress('');
    setFormSupervisor('');
    setFormSupervisorPhone('');
    setFormCapacity('5000');
    setFormError(null);
    setWarehouseModalOpen(true);
  }

  // Open Edit Modal
  function handleOpenEditWarehouse(wh: Warehouse) {
    setEditingWarehouse(wh);
    setFormName(wh.name);
    setFormCode(wh.code || '');
    setFormBuilding(wh.building || '');
    setFormAddress(wh.address || '');
    setFormSupervisor(wh.supervisorName || '');
    setFormSupervisorPhone(wh.supervisorPhone || '');
    setFormCapacity(String(wh.maxCapacity || 5000));
    setFormError(null);
    setWarehouseModalOpen(true);
  }

  // Submit Add / Edit
  async function handleSubmitWarehouse(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError(t('Warehouse name is required'));
      return;
    }
    const cap = parseInt(formCapacity, 10);
    if (isNaN(cap) || cap <= 0) {
      setFormError(t('Capacity must be a valid positive number'));
      return;
    }

    setSavingWarehouse(true);
    setFormError(null);
    try {
      if (editingWarehouse) {
        await warehouseService.update(editingWarehouse.id, {
          name: formName.trim(),
          code: formCode.trim().toUpperCase() || undefined,
          building: formBuilding.trim() || undefined,
          address: formAddress.trim() || undefined,
          supervisorName: formSupervisor.trim() || undefined,
          supervisorPhone: formSupervisorPhone.trim() || undefined,
          maxCapacity: cap,
        });
      } else {
        await warehouseService.create({
          name: formName.trim(),
          code: formCode.trim().toUpperCase() || undefined,
          building: formBuilding.trim() || undefined,
          address: formAddress.trim() || undefined,
          supervisorName: formSupervisor.trim() || undefined,
          supervisorPhone: formSupervisorPhone.trim() || undefined,
          maxCapacity: cap,
        });
      }
      setWarehouseModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save warehouse');
    } finally {
      setSavingWarehouse(false);
    }
  }

  // Open View Items
  async function handleOpenViewItems(wh: Warehouse) {
    setSelectedWarehouseForItems(wh);
    setViewItemsModalOpen(true);
    setLoadingItems(true);
    try {
      const data = await warehouseService.getItems(wh.id);
      setWarehouseItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItems(false);
    }
  }

  // Open Dispatch / Transfer Modal
  function handleOpenDispatch(sourceWhId?: string) {
    setSelectedSourceWh(sourceWhId || (warehouses[0]?.id || ''));
    setDispatchItemId('');
    setDispatchTargetType('location');
    setDispatchTargetWhId('');
    setDispatchTargetLocId(locations[0]?.id || '');
    setDispatchQty('1');
    setDispatchNotes('');
    setDispatchError(null);
    setDispatchSuccess(null);
    setDispatchModalOpen(true);
  }

  // Items currently available in the selected source warehouse
  const sourceItems = useMemo(() => {
    if (!selectedSourceWh) return items;
    const targetWh = warehouses.find(w => w.id === selectedSourceWh);
    return items.filter(
      (i) => (i.warehouseId === selectedSourceWh || (targetWh && i.location === targetWh.name)) && i.available > 0
    );
  }, [items, selectedSourceWh, warehouses]);

  const selectedItemForDispatch = useMemo(() => {
    return items.find((i) => i.id === dispatchItemId);
  }, [items, dispatchItemId]);

  // Submit Stock Dispatch
  async function handleSubmitDispatch(e: React.FormEvent) {
    e.preventDefault();
    if (!dispatchItemId) {
      setDispatchError(t('Please select an item to dispatch'));
      return;
    }
    const qty = parseInt(dispatchQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setDispatchError(t('Quantity must be greater than 0'));
      return;
    }
    if (selectedItemForDispatch && qty > selectedItemForDispatch.quantity) {
      setDispatchError(t(`Cannot move ${qty} units; only ${selectedItemForDispatch.quantity} available in storage.`));
      return;
    }

    if (dispatchTargetType === 'warehouse' && !dispatchTargetWhId) {
      setDispatchError(t('Please select a destination warehouse depot'));
      return;
    }
    if (dispatchTargetType === 'location' && !dispatchTargetLocId) {
      setDispatchError(t('Please select a destination place / room'));
      return;
    }

    setSubmittingDispatch(true);
    setDispatchError(null);
    try {
      const res = await warehouseService.transfer({
        itemId: dispatchItemId,
        fromWarehouseId: selectedSourceWh,
        toWarehouseId: dispatchTargetType === 'warehouse' ? dispatchTargetWhId : undefined,
        toLocationId: dispatchTargetType === 'location' ? dispatchTargetLocId : undefined,
        quantity: qty,
        notes: dispatchNotes.trim() || undefined,
      });
      setDispatchSuccess(res.message);
      await fetchData();
      setTimeout(() => {
        setDispatchModalOpen(false);
      }, 1200);
    } catch (err: any) {
      setDispatchError(err?.message || 'Stock transfer failed');
    } finally {
      setSubmittingDispatch(false);
    }
  }

  // Export CSV
  function handleExportCSV() {
    const headers = ['Warehouse Name', 'Code', 'Building', 'Address', 'Manager', 'Capacity', 'Units Held', 'Utilization %'];
    const rows = filteredWarehouses.map((w) => [
      w.name,
      w.code || '',
      w.building || '',
      w.address || '',
      w.supervisorName || '',
      w.maxCapacity,
      w.totalUnits || 0,
      `${w.utilizationPct || 0}%`,
    ]);
    exportCSV([headers, ...rows], `warehouses-${currentOrg?.id || 'export'}.csv`);
  }

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs: Places vs Warehouses */}
      <div className="flex items-center gap-2 border-b pb-3">
        <button
          type="button"
          onClick={() => navigate('/locations')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
        >
          <MapPin className="h-4 w-4" />
          <span>{t('Places & Rooms')}</span>
        </button>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
        >
          <WarehouseIcon className="h-4 w-4" />
          <span>{t('Central Warehouses')}</span>
        </button>
      </div>

      {/* Page Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title={t('Central Warehouses & Depots')}
          description={t('Manage centralized bulk storage facilities, monitor rack & warehouse capacities, and dispatch stock to physical rooms.')}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleOpenDispatch()}>
            <Send className="h-4 w-4 mr-1.5 text-primary" />
            {t('Dispatch Stock')}
          </Button>
          <Button size="sm" onClick={handleOpenCreateWarehouse}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t('New Warehouse')}
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
              <span>{t('Total Warehouses')}</span>
              <WarehouseIcon className="h-4 w-4 text-primary" />
            </p>
            <p className="text-2xl font-bold mt-1">{warehouses.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('Storage depots & central hubs')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
              <span>{t('Units in Storage')}</span>
              <Package className="h-4 w-4 text-emerald-600" />
            </p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{totalUnitsInStorage.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('Held across all depots')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
              <span>{t('Overall Storage Utilization')}</span>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </p>
            <p className="text-2xl font-bold mt-1">{overallUtilization}%</p>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  overallUtilization > 85 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, overallUtilization)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
              <span>{t('Near Capacity (>85%)')}</span>
              <AlertTriangle className={`h-4 w-4 ${highCapacityCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            </p>
            <p className={`text-2xl font-bold mt-1 ${highCapacityCount > 0 ? 'text-amber-600' : 'text-foreground'}`}>
              {highCapacityCount}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('Depots requiring replenishment rebalance')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t('Search warehouse name, code, manager, address…')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-xs text-muted-foreground hover:text-foreground underline px-1"
                >
                  {t('Reset')}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-muted/70 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    viewMode === 'grid' ? 'bg-background shadow-xs font-semibold' : 'text-muted-foreground'
                  }`}
                >
                  {t('Grid Cards')}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    viewMode === 'table' ? 'bg-background shadow-xs font-semibold' : 'text-muted-foreground'
                  }`}
                >
                  {t('Table List')}
                </button>
              </div>

              <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 text-xs">
                <Download className="h-3.5 w-3.5 mr-1" />
                {t('CSV')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content: Grid Cards vs Table */}
      {loading ? (
        <div className="text-center py-16 text-sm text-muted-foreground">
          {t('Loading warehouse facilities…')}
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <Card className="py-16 text-center text-sm text-muted-foreground">
          <p>{t('No warehouses match your search.')}</p>
          <Button variant="link" size="sm" onClick={handleOpenCreateWarehouse} className="mt-2">
            {t('+ Add a new central warehouse')}
          </Button>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWarehouses.map((wh) => {
            const pct = wh.utilizationPct || 0;
            const isNearFull = pct >= 85;
            return (
              <Card key={wh.id} className="hover:border-primary/50 transition-all flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{wh.building || t('Main Campus')}</span>
                      </span>
                      <CardTitle className="text-base font-semibold leading-snug truncate">
                        {wh.name}
                      </CardTitle>
                    </div>
                    {wh.code && (
                      <Badge variant="outline" className="font-mono text-[10px] shrink-0 font-medium">
                        {wh.code}
                      </Badge>
                    )}
                  </div>

                  {wh.address && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-1">
                      {wh.address}
                    </p>
                  )}

                  {wh.supervisorName && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-2 truncate">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="truncate font-medium text-foreground">{wh.supervisorName}</span>
                      {wh.supervisorPhone && (
                        <span className="font-mono text-[10px] text-muted-foreground/80 truncate">· {wh.supervisorPhone}</span>
                      )}
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {/* Warehouse Capacity Gauge */}
                  <div className="space-y-1 bg-muted/30 p-2.5 rounded-lg border border-border/40">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{t('Depot Capacity')}</span>
                      <span className={`font-semibold ${isNearFull ? 'text-amber-600' : 'text-foreground'}`}>
                        {wh.totalUnits?.toLocaleString()} / {wh.maxCapacity?.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span>{wh.totalItems || 0} {t('SKUs held')}</span>
                      <span className="text-emerald-600 font-medium">{wh.availableCapacity?.toLocaleString()} {t('open units')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                    <button
                      type="button"
                      onClick={() => handleOpenViewItems(wh)}
                      className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {t('Stock Inventory')} ({wh.totalItems || 0})
                    </button>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDispatch(wh.id)}
                        className="h-7 px-2 text-xs"
                        title={t('Dispatch stock from this warehouse')}
                      >
                        <Send className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditWarehouse(wh)}
                        className="h-7 px-2 text-xs"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{t('Warehouse Depot')}</TableHead>
                    <TableHead className="text-xs">{t('Code')}</TableHead>
                    <TableHead className="text-xs">{t('Complex / Address')}</TableHead>
                    <TableHead className="text-xs">{t('Facility Manager')}</TableHead>
                    <TableHead className="text-xs text-right">{t('SKUs')}</TableHead>
                    <TableHead className="text-xs text-right">{t('Units Held')}</TableHead>
                    <TableHead className="text-xs">{t('Capacity Utilization')}</TableHead>
                    <TableHead className="text-xs text-right">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWarehouses.map((wh) => {
                    const pct = wh.utilizationPct || 0;
                    return (
                      <TableRow key={wh.id}>
                        <TableCell className="font-semibold text-xs">{wh.name}</TableCell>
                        <TableCell className="font-mono text-xs">{wh.code || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div>{wh.building || '—'}</div>
                          {wh.address && <div className="text-[10px] text-muted-foreground/75 truncate">{wh.address}</div>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="font-medium text-foreground">{wh.supervisorName || '—'}</div>
                          {wh.supervisorPhone && <div className="text-[10px] font-mono text-muted-foreground">{wh.supervisorPhone}</div>}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">{wh.totalItems || 0}</TableCell>
                        <TableCell className="text-xs text-right font-bold">{wh.totalUnits?.toLocaleString()}</TableCell>
                        <TableCell className="text-xs">
                          <div className="w-28 space-y-0.5">
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{pct}% of {wh.maxCapacity}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenViewItems(wh)} className="h-7 w-7 p-0">
                              <Eye className="h-3.5 w-3.5 text-primary" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenDispatch(wh.id)} className="h-7 w-7 p-0">
                              <Send className="h-3.5 w-3.5 text-primary" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEditWarehouse(wh)} className="h-7 w-7 p-0">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Dialog 1: Add / Edit Warehouse Depot ── */}
      <Dialog open={warehouseModalOpen} onOpenChange={setWarehouseModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <WarehouseIcon className="h-4 w-4 text-primary" />
              {editingWarehouse ? t('Edit Central Warehouse') : t('Add New Central Warehouse')}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t('Define centralized storage facilities, distribution hubs, and manage storage capacity limits.')}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs border border-destructive/20">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmitWarehouse} className="space-y-3.5 text-xs">
            <div>
              <label className="font-medium block mb-1">{t('Warehouse Facility Name *')}</label>
              <Input
                placeholder={t('e.g. Central Logistics Hub, North Storage Depot')}
                value={formName}
                onChange={(e) => setFormName(capitalizeWords(e.target.value))}
                autoCapitalize="words"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium block mb-1">{t('Warehouse Code')}</label>
                <Input
                  placeholder={t('e.g. WH-01, ND-02')}
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="font-medium block mb-1">{t('Max Storage Capacity (Units) *')}</label>
                <Input
                  type="number"
                  min="1"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  required
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium block mb-1">{t('Building / Logistics Block')}</label>
                <Input
                  placeholder={t('e.g. Block C, South Terminal')}
                  value={formBuilding}
                  onChange={(e) => setFormBuilding(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-medium block mb-1">{t('Address / Zone')}</label>
                <Input
                  placeholder={t('e.g. Gate 4, Industrial Area')}
                  value={formAddress}
                  onChange={(e) => setFormAddress(capitalizeWords(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium block mb-1">{t('Facility Manager')}</label>
                <Input
                  placeholder={t('e.g. Rajesh Kumar')}
                  value={formSupervisor}
                  onChange={(e) => setFormSupervisor(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-medium block mb-1">{t('Manager Contact')}</label>
                <CountryPhoneInput
                  value={formSupervisorPhone}
                  onChange={setFormSupervisorPhone}
                  placeholder="98765 43210"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setWarehouseModalOpen(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" size="sm" disabled={savingWarehouse}>
                {savingWarehouse ? t('Saving…') : editingWarehouse ? t('Save Changes') : t('Create Warehouse')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 2: Dispatch / Transfer Stock ── */}
      <Dialog open={dispatchModalOpen} onOpenChange={setDispatchModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              {t('Dispatch Stock from Warehouse')}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t('Transfer inventory between warehouses or dispatch directly to physical rooms & labs.')}
            </DialogDescription>
          </DialogHeader>

          {dispatchError && (
            <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs border border-destructive/20">
              {dispatchError}
            </div>
          )}

          {dispatchSuccess && (
            <div className="p-2.5 rounded-md bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              {dispatchSuccess}
            </div>
          )}

          <form onSubmit={handleSubmitDispatch} className="space-y-3.5 text-xs">
            {/* Origin Warehouse */}
            <div>
              <label className="font-medium block mb-1">{t('Origin Warehouse Depot *')}</label>
              <select
                value={selectedSourceWh}
                onChange={(e) => {
                  setSelectedSourceWh(e.target.value);
                  setDispatchItemId('');
                }}
                className="w-full h-9 px-2.5 text-xs rounded-md border border-input bg-background font-medium"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.totalUnits || 0} units held · {wh.maxCapacity} cap)
                  </option>
                ))}
              </select>
            </div>

            {/* Select Item */}
            <div>
              <label className="font-medium block mb-1">{t('Select Item to Move *')}</label>
              <select
                value={dispatchItemId}
                onChange={(e) => setDispatchItemId(e.target.value)}
                required
                className="w-full h-9 px-2.5 text-xs rounded-md border border-input bg-background"
              >
                <option value="">{t('— Select an Item in this warehouse —')}</option>
                {sourceItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku}) — {item.quantity} available
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Mode: Physical Location (Place) OR another Warehouse */}
            <div>
              <label className="font-medium block mb-1">{t('Dispatch Destination Type')}</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setDispatchTargetType('location')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md border text-xs font-medium transition-all ${
                    dispatchTargetType === 'location'
                      ? 'bg-primary/10 border-primary text-primary font-semibold'
                      : 'border-input hover:bg-muted/50'
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {t('Physical Room / Lab')}
                </button>
                <button
                  type="button"
                  onClick={() => setDispatchTargetType('warehouse')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md border text-xs font-medium transition-all ${
                    dispatchTargetType === 'warehouse'
                      ? 'bg-primary/10 border-primary text-primary font-semibold'
                      : 'border-input hover:bg-muted/50'
                  }`}
                >
                  <WarehouseIcon className="h-3.5 w-3.5" />
                  {t('Another Warehouse')}
                </button>
              </div>

              {dispatchTargetType === 'location' ? (
                <select
                  value={dispatchTargetLocId}
                  onChange={(e) => setDispatchTargetLocId(e.target.value)}
                  required
                  className="w-full h-9 px-2.5 text-xs rounded-md border border-input bg-background font-medium"
                >
                  <option value="">{t('— Select Target Room / Place —')}</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.building || 'Campus'})
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={dispatchTargetWhId}
                  onChange={(e) => setDispatchTargetWhId(e.target.value)}
                  required
                  className="w-full h-9 px-2.5 text-xs rounded-md border border-input bg-background font-medium"
                >
                  <option value="">{t('— Select Target Warehouse Depot —')}</option>
                  {warehouses
                    .filter((w) => w.id !== selectedSourceWh)
                    .map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.availableCapacity || 0} open space)
                      </option>
                    ))}
                </select>
              )}
            </div>

            {/* Quantity */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-medium">{t('Units to Dispatch *')}</label>
                {selectedItemForDispatch && (
                  <span className="text-[11px] text-muted-foreground">
                    {t('Current at origin')}: <strong className="text-foreground">{selectedItemForDispatch.quantity}</strong>
                  </span>
                )}
              </div>
              <Input
                type="number"
                min="1"
                max={selectedItemForDispatch?.quantity || 9999}
                value={dispatchQty}
                onChange={(e) => setDispatchQty(e.target.value)}
                required
                className="h-9 text-xs font-mono"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="font-medium block mb-1">{t('Dispatch Purpose / Reference')}</label>
              <Input
                placeholder={t('e.g. Bulk issuance to Chemistry Lab for semester start')}
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDispatchModalOpen(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" size="sm" disabled={submittingDispatch}>
                {submittingDispatch ? t('Dispatching…') : t('Confirm Dispatch')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 3: View Items in Warehouse ── */}
      <Dialog open={viewItemsModalOpen} onOpenChange={setViewItemsModalOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center justify-between">
              <span>{selectedWarehouseForItems?.name}</span>
              <Badge variant="outline" className="font-mono text-xs">
                {selectedWarehouseForItems?.code || 'WH'}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t('All inventory items and bulk units currently stored in this warehouse facility.')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2">
            {loadingItems ? (
              <div className="text-center py-12 text-xs text-muted-foreground">
                {t('Loading items…')}
              </div>
            ) : warehouseItems.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground">
                {t('No items are currently stored in this warehouse.')}
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{t('Item Name')}</TableHead>
                      <TableHead className="text-xs">{t('SKU')}</TableHead>
                      <TableHead className="text-xs">{t('Category')}</TableHead>
                      <TableHead className="text-xs text-right">{t('Units')}</TableHead>
                      <TableHead className="text-xs text-right">{t('Action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouseItems.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-semibold text-xs">{it.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{it.sku}</TableCell>
                        <TableCell className="text-xs">{it.categoryName || '—'}</TableCell>
                        <TableCell className="text-xs text-right font-bold text-emerald-600">
                          {it.quantity}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          <button
                            onClick={() => {
                              setViewItemsModalOpen(false);
                              navigate(`/inventory/${it.id}`);
                            }}
                            className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-0.5"
                          >
                            {t('Details')}
                            <ArrowUpRight className="h-3 w-3" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setViewItemsModalOpen(false)}>
              {t('Close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
