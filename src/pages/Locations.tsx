import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Plus, ArrowLeftRight, Search, Building2, Package,
  User, Download, Edit2, Trash2, X, RefreshCw,
  Eye, Sparkles, Phone, Layers, Warehouse as WarehouseIcon,
} from 'lucide-react';
import { generateLocationCode } from '@/lib/locationCode';
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
import { locationService, inventoryService } from '@/services';
import type { StorageLocation, StockTransferPayload, Item } from '@/types';

const PLACE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  classroom: { label: 'Classroom', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  lab: { label: 'Laboratory', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  library: { label: 'Library & Reading Room', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  office: { label: 'Office / Administration', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  clinic: { label: 'Clinic / Infirmary', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  sports_room: { label: 'Sports Facility / Field', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  staff_room: { label: 'Staff Room / Lounge', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  store_room: { label: 'Department Store Room', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  other: { label: 'General Spot / Place', color: 'bg-gray-100 text-gray-800 border-gray-200' },
};

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

export function LocationsPage() {
  const { currentOrg } = useOrganization();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferSourceLoc, setTransferSourceLoc] = useState<string>('');
  const [viewItemsModalOpen, setViewItemsModalOpen] = useState(false);
  const [selectedLocationForItems, setSelectedLocationForItems] = useState<StorageLocation | null>(null);
  const [locationItems, setLocationItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Form states for Location (Place) Add/Edit — NO capacity field!
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [isCodeTouched, setIsCodeTouched] = useState(false);
  const [formBuilding, setFormBuilding] = useState('');
  const [formFloor, setFormFloor] = useState('');
  const [formType, setFormType] = useState('classroom');
  const [formSupervisor, setFormSupervisor] = useState('');
  const [formSupervisorPhone, setFormSupervisorPhone] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states for Transfer
  const [transferItemId, setTransferItemId] = useState('');
  const [transferToLoc, setTransferToLoc] = useState('');
  const [transferQty, setTransferQty] = useState('1');
  const [transferNotes, setTransferNotes] = useState('');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [locData, itemData] = await Promise.all([
        locationService.getAll(),
        inventoryService.getByOrganization(currentOrg?.id || ''),
      ]);
      setLocations(locData);
      setItems(itemData);
    } catch (err) {
      console.error('Failed to load places', err);
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Distinct Buildings
  const buildings = useMemo(() => {
    const set = new Set<string>();
    locations.forEach((l) => {
      if (l.building) set.add(l.building);
    });
    return Array.from(set).sort();
  }, [locations]);

  // Filtered Locations (Places)
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (typeFilter !== 'all' && loc.type !== typeFilter) return false;
      if (buildingFilter !== 'all' && loc.building !== buildingFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        loc.name.toLowerCase().includes(q) ||
        (loc.code || '').toLowerCase().includes(q) ||
        (loc.building || '').toLowerCase().includes(q) ||
        (loc.floor || '').toLowerCase().includes(q) ||
        (loc.supervisorName || '').toLowerCase().includes(q)
      );
    });
  }, [locations, search, typeFilter, buildingFilter]);

  // Place-Centric KPIs
  const totalUnitsPlaced = useMemo(() => locations.reduce((s, l) => s + (l.totalUnits || 0), 0), [locations]);
  const totalItemsPlaced = useMemo(() => locations.reduce((s, l) => s + (l.totalItems || 0), 0), [locations]);
  const supervisorAssignedCount = useMemo(() => locations.filter((l) => !!l.supervisorName).length, [locations]);
  const existingCodes = useMemo(() => locations.map(l => l.code).filter((c): c is string => !!c), [locations]);

  // Handle open Add Location (Place)
  function handleOpenCreateLocation() {
    setEditingLocation(null);
    setFormName('');
    setFormCode('');
    setIsCodeTouched(false);
    setFormBuilding('');
    setFormFloor('');
    setFormType('classroom');
    setFormSupervisor('');
    setFormSupervisorPhone('');
    setFormError(null);
    setLocationModalOpen(true);
  }

  // Handle open Edit Location (Place)
  function handleOpenEditLocation(loc: StorageLocation) {
    setEditingLocation(loc);
    setFormName(loc.name);
    setFormCode(loc.code || '');
    setIsCodeTouched(true);
    setFormBuilding(loc.building || '');
    setFormFloor(loc.floor || '');
    setFormType(loc.type || 'classroom');
    setFormSupervisor(loc.supervisorName || '');
    setFormSupervisorPhone(loc.supervisorPhone || '');
    setFormError(null);
    setLocationModalOpen(true);
  }

  // Submit Add / Edit Location (Place)
  async function handleSubmitLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError(t('Place or room name is required'));
      return;
    }

    setSavingLocation(true);
    setFormError(null);
    try {
      const finalCode = formCode.trim() || generateLocationCode(formName, existingCodes);
      if (editingLocation) {
        await locationService.update(editingLocation.id, {
          name: formName.trim(),
          code: finalCode || undefined,
          building: formBuilding.trim() || undefined,
          floor: formFloor.trim() || undefined,
          type: formType,
          supervisorName: formSupervisor.trim() || undefined,
          supervisorPhone: formSupervisorPhone.trim() || undefined,
        });
      } else {
        await locationService.create({
          name: formName.trim(),
          code: finalCode || undefined,
          building: formBuilding.trim() || undefined,
          floor: formFloor.trim() || undefined,
          type: formType,
          supervisorName: formSupervisor.trim() || undefined,
          supervisorPhone: formSupervisorPhone.trim() || undefined,
        });
      }
      setLocationModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save place');
    } finally {
      setSavingLocation(false);
    }
  }

  // Handle open View Items Drawer
  async function handleOpenViewItems(loc: StorageLocation) {
    setSelectedLocationForItems(loc);
    setViewItemsModalOpen(true);
    setLoadingItems(true);
    try {
      const data = await locationService.getItems(loc.id);
      setLocationItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItems(false);
    }
  }

  // Handle open Transfer Modal
  function handleOpenTransfer(preSelectedLocName?: string) {
    setTransferSourceLoc(preSelectedLocName || '');
    setTransferItemId('');
    setTransferToLoc('');
    setTransferQty('1');
    setTransferNotes('');
    setTransferError(null);
    setTransferSuccess(null);
    setTransferModalOpen(true);
  }

  // Available items in the source location
  const transferableItems = useMemo(() => {
    if (!transferSourceLoc) return items;
    return items.filter((i) => i.location === transferSourceLoc && i.available > 0);
  }, [items, transferSourceLoc]);

  const selectedItemForTransfer = useMemo(() => {
    return items.find((i) => i.id === transferItemId);
  }, [items, transferItemId]);

  // Submit Stock Transfer
  async function handleSubmitTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!transferItemId) {
      setTransferError(t('Please select an item to move'));
      return;
    }
    if (!transferToLoc) {
      setTransferError(t('Please select destination room / place'));
      return;
    }
    const qty = parseInt(transferQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setTransferError(t('Quantity must be greater than 0'));
      return;
    }
    if (selectedItemForTransfer && qty > selectedItemForTransfer.quantity) {
      setTransferError(t(`Cannot move ${qty} units; only ${selectedItemForTransfer.quantity} available in this room.`));
      return;
    }

    setSubmittingTransfer(true);
    setTransferError(null);
    try {
      const res = await locationService.transfer({
        itemId: transferItemId,
        fromLocation: selectedItemForTransfer?.location || transferSourceLoc,
        toLocation: transferToLoc,
        quantity: qty,
        notes: transferNotes.trim() || undefined,
      });
      setTransferSuccess(res.message);
      await fetchData();
      setTimeout(() => {
        setTransferModalOpen(false);
      }, 1200);
    } catch (err: any) {
      setTransferError(err?.message || 'Move failed');
    } finally {
      setSubmittingTransfer(false);
    }
  }

  // Export Places CSV
  function handleExportCSV() {
    const headers = ['Place / Room Name', 'Code', 'Building', 'Floor / Area', 'Type', 'Supervisor In-Charge', 'Phone', 'Items Placed', 'Total Units'];
    const rows = filteredLocations.map((l) => [
      l.name,
      l.code || '',
      l.building || '',
      l.floor || '',
      PLACE_TYPE_LABELS[l.type]?.label || l.type,
      l.supervisorName || '',
      l.supervisorPhone || '',
      l.totalItems || 0,
      l.totalUnits || 0,
    ]);
    exportCSV([headers, ...rows], `places-${currentOrg?.id || 'export'}.csv`);
  }

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs: Places vs Warehouses */}
      <div className="flex items-center gap-2 border-b pb-3">
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
        >
          <MapPin className="h-4 w-4" />
          <span>{t('Places & Rooms')}</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/warehouses')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
        >
          <WarehouseIcon className="h-4 w-4" />
          <span>{t('Central Warehouses')}</span>
        </button>
      </div>

      {/* Page Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title={t('Places & Physical Locations')}
          description={t('Track where inventory items and assets physically live across campus rooms, science labs, classrooms, and departments.')}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleOpenTransfer()}>
            <ArrowLeftRight className="h-4 w-4 mr-1.5 text-primary" />
            {t('Move Between Rooms')}
          </Button>
          <Button size="sm" onClick={handleOpenCreateLocation}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t('New Place / Room')}
          </Button>
        </div>
      </div>

      {/* Place-Centric KPI Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
              <span>{t('Total Places & Rooms')}</span>
              <MapPin className="h-4 w-4 text-primary" />
            </p>
            <p className="text-2xl font-bold mt-1">{locations.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {buildings.length} {t('buildings / complexes')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
              <span>{t('Buildings & Wings')}</span>
              <Building2 className="h-4 w-4 text-blue-600" />
            </p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{buildings.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('Campus complexes mapped')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
              <span>{t('Items Kept in Rooms')}</span>
              <Package className="h-4 w-4 text-emerald-600" />
            </p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{totalUnitsPlaced.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{totalItemsPlaced} {t('distinct SKUs assigned')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center justify-between">
              <span>{t('Supervisors Assigned')}</span>
              <User className="h-4 w-4 text-purple-600" />
            </p>
            <p className="text-2xl font-bold mt-1 text-purple-600">
              {supervisorAssignedCount}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('Staff in-charge of places')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative w-56 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t('Search place, room code, supervisor…')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              <select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                className="h-9 px-2.5 text-xs rounded-md border border-input bg-background"
              >
                <option value="all">{t('All Buildings / Complexes')}</option>
                {buildings.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 px-2.5 text-xs rounded-md border border-input bg-background"
              >
                <option value="all">{t('All Place Types')}</option>
                {Object.entries(PLACE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>

              {(search || buildingFilter !== 'all' || typeFilter !== 'all') && (
                <button
                  onClick={() => { setSearch(''); setBuildingFilter('all'); setTypeFilter('all'); }}
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

      {/* Main Content: Grid vs Table */}
      {loading ? (
        <div className="text-center py-16 text-sm text-muted-foreground">
          {t('Loading physical locations…')}
        </div>
      ) : filteredLocations.length === 0 ? (
        <Card className="py-16 text-center text-sm text-muted-foreground">
          <p>{t('No places match your filters.')}</p>
          <Button variant="link" size="sm" onClick={handleOpenCreateLocation} className="mt-2">
            {t('+ Add a new place / room')}
          </Button>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLocations.map((loc) => {
            const typeInfo = PLACE_TYPE_LABELS[loc.type] || PLACE_TYPE_LABELS.other;
            return (
              <Card key={loc.id} className="hover:border-primary/50 transition-all flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {loc.building || t('Main Campus')}
                          {loc.floor ? ` • ${loc.floor}` : ''}
                        </span>
                      </span>
                      <CardTitle className="text-base font-semibold leading-snug truncate">
                        {loc.name}
                      </CardTitle>
                    </div>
                    {loc.code && (
                      <Badge variant="outline" className="font-mono text-[10px] shrink-0 font-medium">
                        {loc.code}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    {loc.supervisorName && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate" title={loc.supervisorPhone ? `${loc.supervisorName} (${loc.supervisorPhone})` : loc.supervisorName}>
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{loc.supervisorName}</span>
                        {loc.supervisorPhone && (
                          <span className="font-mono text-[10px] text-muted-foreground/80 truncate">· {loc.supervisorPhone}</span>
                        )}
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {/* Clean Place Inventory Summary (No fake capacity bar!) */}
                  <div className="bg-muted/40 p-2.5 rounded-lg border border-border/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">
                          {loc.totalUnits?.toLocaleString()} {t('units kept here')}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {loc.totalItems || 0} {t('distinct inventory items')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {t('Physical Spot')}
                    </Badge>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                    <button
                      type="button"
                      onClick={() => handleOpenViewItems(loc)}
                      className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {t('View Items')} ({loc.totalItems || 0})
                    </button>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenTransfer(loc.name)}
                        className="h-7 px-2 text-xs"
                        title={t('Move items from this room')}
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditLocation(loc)}
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
                    <TableHead className="text-xs">{t('Place / Room Name')}</TableHead>
                    <TableHead className="text-xs">{t('Code')}</TableHead>
                    <TableHead className="text-xs">{t('Building / Wing')}</TableHead>
                    <TableHead className="text-xs">{t('Floor / Zone')}</TableHead>
                    <TableHead className="text-xs">{t('Type')}</TableHead>
                    <TableHead className="text-xs">{t('Supervisor In-Charge')}</TableHead>
                    <TableHead className="text-xs text-right">{t('Distinct SKUs')}</TableHead>
                    <TableHead className="text-xs text-right">{t('Units Kept')}</TableHead>
                    <TableHead className="text-xs text-right">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocations.map((loc) => {
                    const typeInfo = PLACE_TYPE_LABELS[loc.type] || PLACE_TYPE_LABELS.other;
                    return (
                      <TableRow key={loc.id}>
                        <TableCell className="font-semibold text-xs">{loc.name}</TableCell>
                        <TableCell className="font-mono text-xs">{loc.code || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{loc.building || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{loc.floor || '—'}</TableCell>
                        <TableCell className="text-xs">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="font-medium text-foreground">{loc.supervisorName || '—'}</div>
                          {loc.supervisorPhone && <div className="text-[10px] font-mono text-muted-foreground">{loc.supervisorPhone}</div>}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">{loc.totalItems || 0}</TableCell>
                        <TableCell className="text-xs text-right font-bold text-emerald-600">{loc.totalUnits?.toLocaleString() || 0}</TableCell>
                        <TableCell className="text-xs text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenViewItems(loc)} className="h-7 w-7 p-0">
                              <Eye className="h-3.5 w-3.5 text-primary" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenTransfer(loc.name)} className="h-7 w-7 p-0">
                              <ArrowLeftRight className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEditLocation(loc)} className="h-7 w-7 p-0">
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

      {/* ── Dialog 1: Add / Edit Place / Room ── */}
      <Dialog open={locationModalOpen} onOpenChange={setLocationModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {editingLocation ? t('Edit Place / Room') : t('Add New Place / Room')}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t('Define physical rooms, classrooms, laboratories, or departments for tracking item locations.')}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs border border-destructive/20">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmitLocation} className="space-y-3.5 text-xs">
            <div>
              <label className="font-medium block mb-1">{t('Place / Room Name *')}</label>
              <Input
                placeholder={t('e.g. Science Lab 1, Classroom 10-A, Staff Room, Library 2nd Floor')}
                value={formName}
                onChange={(e) => {
                  const val = capitalizeWords(e.target.value);
                  setFormName(val);
                  if (!editingLocation && !isCodeTouched) {
                    const auto = generateLocationCode(val, existingCodes);
                    setFormCode(auto);
                  }
                }}
                autoCapitalize="words"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium">{t('Place Code')}</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCodeTouched(false);
                      const auto = generateLocationCode(formName, existingCodes);
                      setFormCode(auto);
                    }}
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:text-amber-700 font-medium inline-flex items-center gap-1 hover:underline cursor-pointer"
                    title={t('Auto-generate code from room name')}
                  >
                    <Sparkles className="h-3 w-3" />
                    {t('Auto')}
                  </button>
                </div>
                <Input
                  placeholder={t('e.g. LAB-01, RM-101')}
                  value={formCode}
                  onChange={(e) => {
                    setIsCodeTouched(true);
                    setFormCode(e.target.value.toUpperCase());
                  }}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="font-medium block mb-1">{t('Place Type')}</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs rounded-md border border-input bg-background"
                >
                  {Object.entries(PLACE_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium block mb-1">{t('Building / Complex')}</label>
                <Input
                  placeholder={t('e.g. Main Block, Science Wing')}
                  value={formBuilding}
                  onChange={(e) => setFormBuilding(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-medium block mb-1">{t('Floor / Zone / Wing')}</label>
                <Input
                  placeholder={t('e.g. Ground Floor, 2nd Floor, Room 104')}
                  value={formFloor}
                  onChange={(e) => setFormFloor(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium block mb-1">{t('Supervisor / In-Charge Staff')}</label>
                <Input
                  placeholder={t('e.g. Dr. Rajesh Sharma, Head of Dept')}
                  value={formSupervisor}
                  onChange={(e) => setFormSupervisor(capitalizeWords(e.target.value))}
                  autoCapitalize="words"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-medium block mb-1">{t('Supervisor Contact')}</label>
                <CountryPhoneInput
                  value={formSupervisorPhone}
                  onChange={setFormSupervisorPhone}
                  placeholder="98765 43210"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setLocationModalOpen(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" size="sm" disabled={savingLocation}>
                {savingLocation ? t('Saving…') : editingLocation ? t('Save Changes') : t('Create Place')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 2: Room-to-Room Move ── */}
      <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-primary" />
              {t('Move Inventory Between Rooms')}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t('Transfer items between classrooms, laboratories, or department rooms.')}
            </DialogDescription>
          </DialogHeader>

          {transferError && (
            <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs border border-destructive/20">
              {transferError}
            </div>
          )}

          {transferSuccess && (
            <div className="p-2.5 rounded-md bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center gap-1.5 font-medium">
              <Package className="h-4 w-4 text-emerald-600 shrink-0" />
              {transferSuccess}
            </div>
          )}

          <form onSubmit={handleSubmitTransfer} className="space-y-3.5 text-xs">
            {/* Source Location */}
            <div>
              <label className="font-medium block mb-1">{t('Source Place / Room')}</label>
              <select
                value={transferSourceLoc}
                onChange={(e) => {
                  setTransferSourceLoc(e.target.value);
                  setTransferItemId('');
                }}
                className="w-full h-9 px-2.5 text-xs rounded-md border border-input bg-background font-medium"
              >
                <option value="">{t('— Select Origin Room —')}</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name} ({loc.totalUnits || 0} units kept)
                  </option>
                ))}
              </select>
            </div>

            {/* Item Selection */}
            <div>
              <label className="font-medium block mb-1">{t('Select Item to Move *')}</label>
              <select
                value={transferItemId}
                onChange={(e) => setTransferItemId(e.target.value)}
                required
                className="w-full h-9 px-2.5 text-xs rounded-md border border-input bg-background"
                disabled={!transferSourceLoc}
              >
                <option value="">
                  {transferSourceLoc ? t('— Select an Item in this room —') : t('— Select source room first —')}
                </option>
                {transferableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku}) — {item.quantity} units available
                  </option>
                ))}
              </select>
            </div>

            {/* Target Location */}
            <div>
              <label className="font-medium block mb-1">{t('Destination Room / Place *')}</label>
              <select
                value={transferToLoc}
                onChange={(e) => setTransferToLoc(e.target.value)}
                required
                className="w-full h-9 px-2.5 text-xs rounded-md border border-input bg-background font-medium"
              >
                <option value="">{t('— Select Target Room / Place —')}</option>
                {locations
                  .filter((loc) => loc.name !== transferSourceLoc)
                  .map((loc) => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name} ({loc.building || 'Campus'})
                    </option>
                  ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-medium">{t('Units to Move *')}</label>
                {selectedItemForTransfer && (
                  <span className="text-[11px] text-muted-foreground">
                    {t('Current at origin')}: <strong className="text-foreground">{selectedItemForTransfer.quantity}</strong>
                  </span>
                )}
              </div>
              <Input
                type="number"
                min="1"
                max={selectedItemForTransfer?.quantity || 9999}
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value)}
                required
                className="h-9 text-xs font-mono"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="font-medium block mb-1">{t('Move Reason / Notes')}</label>
              <Input
                placeholder={t('e.g. Moved to Physics Lab for Class 12 experiments')}
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setTransferModalOpen(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" size="sm" disabled={submittingTransfer}>
                {submittingTransfer ? t('Moving…') : t('Confirm Move')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 3: View Items in Place ── */}
      <Dialog open={viewItemsModalOpen} onOpenChange={setViewItemsModalOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center justify-between">
              <span>{selectedLocationForItems?.name}</span>
              <Badge variant="outline" className="font-mono text-xs">
                {selectedLocationForItems?.code || selectedLocationForItems?.building}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t('All inventory items and equipment currently located in this physical room.')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2">
            {loadingItems ? (
              <div className="text-center py-12 text-xs text-muted-foreground">
                {t('Loading items…')}
              </div>
            ) : locationItems.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground">
                {t('No items are currently kept in this room.')}
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{t('Item Name')}</TableHead>
                      <TableHead className="text-xs">{t('SKU')}</TableHead>
                      <TableHead className="text-xs">{t('Category')}</TableHead>
                      <TableHead className="text-xs text-right">{t('Units Available')}</TableHead>
                      <TableHead className="text-xs text-right">{t('Action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locationItems.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-semibold text-xs">{it.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{it.sku}</TableCell>
                        <TableCell className="text-xs">{it.categoryName || '—'}</TableCell>
                        <TableCell className="text-xs text-right font-bold text-emerald-600">
                          {it.available}
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
                            <Eye className="h-3 w-3" />
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
