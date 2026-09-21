import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Plus, Search, Package, MoreHorizontal, Eye, ArrowRightLeft,
  ShieldAlert, LayoutGrid, List, MapPin, PackagePlus, Pencil, Trash2, Settings2,
} from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useOrgConfig } from '@/hooks/useOrgConfig';
import { inventoryService, categoryService, recipientService, assignmentService, transactionService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { CustomFieldsSheet } from '@/components/shared/CustomFieldsSheet';
import { CustomFieldsRenderer } from '@/components/shared/CustomFieldsRenderer';
import { CsvActions } from '@/components/shared/CsvActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Item, Category, Recipient } from '@/types';

const EMPTY_FORM = { name: '', sku: '', categoryId: '', categoryName: '', quantity: '', location: '', minQuantity: '10', reorderQty: '50', attributes: {} as Record<string, string | number | boolean> };
const EMPTY_ISSUE = { recipientId: '', quantity: '1', conditionIssued: 'Good', expectedReturn: '' };

// ── Colour helpers ─────────────────────────────────────────────────────────────
const CAT_PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b',
  '#10b981', '#06b6d4', '#3b82f6', '#84cc16', '#f97316',
];
function catColor(name: string) {
  let h = 0;
  for (const ch of name) h = ((h << 5) - h) + ch.charCodeAt(0);
  return CAT_PALETTE[Math.abs(h) % CAT_PALETTE.length];
}
function strSeed(s: string) {
  let h = 0;
  for (const ch of s) h = ((h << 5) - h) + ch.charCodeAt(0);
  return Math.abs(h) % 500 + 1; // 1-500
}
const STATUS_BAR: Record<string, string> = {
  in_stock: '#10b981',
  low_stock: '#f59e0b',
  out_of_stock: '#ef4444',
};

// ── Category → relevant Unsplash photo IDs ────────────────────────────────────
// Each category has multiple photos; item ID hash picks one → different per item
const CATEGORY_PHOTOS: Record<string, string[]> = {
  uniform:     ['1558618666-fcd25c85cd64','1467043237784-4e9a653ebbb9','1491553895911-0055eca6402d','1515886657613-9f3515b0c78f'],
  uniforms:    ['1558618666-fcd25c85cd64','1467043237784-4e9a653ebbb9','1491553895911-0055eca6402d','1515886657613-9f3515b0c78f'],
  clothing:    ['1558618666-fcd25c85cd64','1489987707849-d955f259f23f','1523381294911-8d3cead13475','1578587018452-892bacefd3f2'],
  book:        ['1481627834876-b7833e8f5882','1456513080510-7bf3a84b82f8','1512820790803-83ca734da794','1524995997946-a1cd2bed3849'],
  books:       ['1481627834876-b7833e8f5882','1456513080510-7bf3a84b82f8','1512820790803-83ca734da794','1524995997946-a1cd2bed3849'],
  textbook:    ['1481627834876-b7833e8f5882','1456513080510-7bf3a84b82f8','1512820790803-83ca734da794','1524995997946-a1cd2bed3849'],
  medicine:    ['1584308666744-24d5c474f2ae','1559757148-5c350d0d3c56','1471864190281-a93a3070b6de','1583912267550-d974b8c31373'],
  medicines:   ['1584308666744-24d5c474f2ae','1559757148-5c350d0d3c56','1471864190281-a93a3070b6de','1583912267550-d974b8c31373'],
  pharmacy:    ['1584308666744-24d5c474f2ae','1559757148-5c350d0d3c56','1471864190281-a93a3070b6de','1583912267550-d974b8c31373'],
  drug:        ['1584308666744-24d5c474f2ae','1559757148-5c350d0d3c56','1471864190281-a93a3070b6de','1583912267550-d974b8c31373'],
  sport:       ['1461896836374-f5f32cf8a13a','1517649763962-0c623066013b','1571019613454-1cb2f99b2d8b','1540497077202-7035ce6e8cd0'],
  sports:      ['1461896836374-f5f32cf8a13a','1517649763962-0c623066013b','1571019613454-1cb2f99b2d8b','1540497077202-7035ce6e8cd0'],
  equipment:   ['1530124566582-a618bc2615dc','1504917595217-d4dc5ebe6122','1562259949-e8e7289dc8d2','1581091226825-a6a2a5aee158'],
  electronics: ['1518770660439-4636190af475','1519389950473-47ba0277781c','1498050108023-c5249f4df085','1496181133206-80ce9b88a853'],
  laptop:      ['1498050108023-c5249f4df085','1496181133206-80ce9b88a853','1517694712202-14dd9538aa97','1525547719571-a2d4ac2cd75c'],
  phone:       ['1511707171634-5f897ff02aa9','1512054502232-10a0a035d672','1585060544812-6b45742d762f','1574944985070-8f3ebc0f78d4'],
  furniture:   ['1555041469-db61040d54d7','1524758631624-e2822132143',  '1506439773649-6e0eb8cfb237','1493663284031-b7e3aaa31dcf'],
  stationery:  ['1455390582262-044cdead277a','1503676260728-1c00da094a0b','1471107191679-f26174d2d41e','1484480974693-6ca0a78fb36b'],
  food:        ['1504674900247-0877df9cc836','1546069901-ba9599a7e63c','1567620905732-2d1ec7ab7445','1490645935967-10de6ba17061'],
  tools:       ['1530124566582-a618bc2615dc','1504917595217-d4dc5ebe6122','1581783342308-f792dbdd1696','1572981779307-38b8cabb2407'],
  asset:       ['1518893883800-45cd0954574b','1504917595217-d4dc5ebe6122','1581783342308-f792dbdd1696','1562259949-e8e7289dc8d2'],
  assets:      ['1518893883800-45cd0954574b','1504917595217-d4dc5ebe6122','1581783342308-f792dbdd1696','1562259949-e8e7289dc8d2'],
};

// pick a photo: match first word of category (lowercase) against map, then use item hash to vary within the array
function getPhotoId(categoryName: string, itemId: string): string | null {
  const key = categoryName.toLowerCase().trim().split(/\s+/)[0];
  const photos = CATEGORY_PHOTOS[key];
  if (!photos) return null;
  return photos[strSeed(itemId) % photos.length];
}

function itemImgSrc(categoryName: string, itemId: string, w: number, h: number): string {
  const id = getPhotoId(categoryName, itemId);
  if (id) return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=80&auto=format`;
  // fallback: picsum with category-seeded but item-varied seed
  const seed = `${categoryName.toLowerCase().replace(/\s+/g, '-')}-${strSeed(itemId)}`;
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

// ── Card image ─────────────────────────────────────────────────────────────────
function CardImage({ categoryName, itemId }: { categoryName: string; itemId: string }) {
  const [failed, setFailed] = useState(false);
  const color = catColor(categoryName);

  if (failed) {
    return (
      <div className="w-full h-32 flex items-center justify-center select-none" style={{ background: color + '14' }}>
        <span className="text-6xl font-black opacity-20" style={{ color }}>
          {categoryName.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }
  return (
    <img
      src={itemImgSrc(categoryName, itemId, 480, 280)}
      alt={categoryName}
      className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500"
      onError={() => setFailed(true)}
    />
  );
}

// ── Table row thumbnail ────────────────────────────────────────────────────────
function RowThumb({ categoryName, itemId }: { categoryName: string; itemId: string }) {
  const [failed, setFailed] = useState(false);
  const color = catColor(categoryName);

  if (failed) {
    return (
      <div className="h-8 w-8 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0" style={{ background: color + '18', color }}>
        {categoryName.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={itemImgSrc(categoryName, itemId, 80, 80)}
      alt={categoryName}
      className="h-8 w-8 rounded-lg object-cover shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function InventoryPage() {
  const { currentOrg } = useOrganization();
  const config = useOrgConfig();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [view, setView] = useState<'grid' | 'table'>('grid');

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [damageItem, setDamageItem] = useState<Item | null>(null);
  const [damageForm, setDamageForm] = useState({ quantity: '1', source: '', notes: '' });
  const [damageSaving, setDamageSaving] = useState(false);

  const [issueItem, setIssueItem] = useState<Item | null>(null);
  const [issueForm, setIssueForm] = useState(EMPTY_ISSUE);
  const [issueSaving, setIssueSaving] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');

  const [restockItem, setRestockItem] = useState<Item | null>(null);
  const [restockForm, setRestockForm] = useState({ quantity: '', reference: '', notes: '' });
  const [restockSaving, setRestockSaving] = useState(false);
  const [fieldsSheetOpen, setFieldsSheetOpen] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    inventoryService.getByOrganization(currentOrg.id).then(setItems);
    categoryService.getByOrganization(currentOrg.id).then(setCategories);
    recipientService.getByOrganization(currentOrg.id).then(setRecipients);
  }, [currentOrg]);

  const locations = useMemo(() => Array.from(new Set(items.map(i => i.location))), [items]);

  const filtered = useMemo(() => items.filter(item => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.sku.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== 'all' && item.categoryName !== categoryFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (locationFilter !== 'all' && item.location !== locationFilter) return false;
    return true;
  }), [items, search, categoryFilter, statusFilter, locationFilter]);

  const filteredRecipients = useMemo(() => {
    if (!recipientSearch) return recipients;
    const q = recipientSearch.toLowerCase();
    return recipients.filter(r => r.name.toLowerCase().includes(q) || r.identifier?.toLowerCase().includes(q));
  }, [recipients, recipientSearch]);

  const statsRow = useMemo(() => [
    { label: t('Total Items'),  value: items.length,                                           color: '#6366f1', bg: '#ede9fe' },
    { label: t('In Stock'),     value: items.filter(i => i.status === 'in_stock').length,      color: '#059669', bg: '#d1fae5' },
    { label: t('Low Stock'),    value: items.filter(i => i.status === 'low_stock').length,     color: '#d97706', bg: '#fef3c7' },
    { label: t('Out of Stock'), value: items.filter(i => i.status === 'out_of_stock').length,  color: '#dc2626', bg: '#fee2e2' },
  ], [items, t]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function openEdit(item: Item, e: React.MouseEvent) {
    e.stopPropagation();
    setEditItem(item);
    setForm({
      name: item.name, sku: item.sku,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      quantity: String(item.quantity),
      location: item.location,
      minQuantity: String(item.minQuantity ?? 10),
      reorderQty: String(item.reorderQty ?? 50),
      attributes: (item.attributes ?? {}) as Record<string, string | number | boolean>,
    });
    setShowAddDialog(true);
  }

  async function handleDeleteItem(item: Item, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`${t('Delete')} "${item.name}"? ${t('This cannot be undone.')}`)) return;
    try {
      await inventoryService.delete(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast({ title: `${item.name} ${t('deleted')}` });
    } catch {
      toast({ title: t('Error'), description: t('Failed to delete item'), variant: 'destructive' });
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg) return;
    const cat = categories.find(c => c.id === form.categoryId);
    setSaving(true);
    try {
      if (editItem) {
        const updated = await inventoryService.update(editItem.id, {
          name: form.name, sku: form.sku,
          categoryId: form.categoryId,
          categoryName: cat?.name || form.categoryName,
          location: form.location,
          minQuantity: Number(form.minQuantity),
          reorderQty: Number(form.reorderQty),
          attributes: form.attributes,
        });
        setItems(prev => prev.map(i => i.id === editItem.id ? updated : i));
      } else {
        const created = await inventoryService.create({
          organizationId: currentOrg.id,
          name: form.name, sku: form.sku,
          categoryId: form.categoryId,
          categoryName: cat?.name || form.categoryId,
          module: 'general',
          quantity: Number(form.quantity),
          available: Number(form.quantity),
          reserved: 0,
          minQuantity: Number(form.minQuantity),
          reorderQty: Number(form.reorderQty),
          location: form.location,
          attributes: form.attributes,
        });
        setItems(prev => [...prev, created]);
      }
      setShowAddDialog(false);
      setEditItem(null);
      setForm(EMPTY_FORM);
    } finally { setSaving(false); }
  }

  function openDamage(item: Item, e: React.MouseEvent) {
    e.stopPropagation();
    setDamageItem(item);
    setDamageForm({ quantity: '1', source: '', notes: '' });
  }

  async function handleDamage(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !damageItem) return;
    const qty = parseInt(damageForm.quantity) || 1;
    setDamageSaving(true);
    try {
      await inventoryService.adjustStock(damageItem.id, -qty);
      await transactionService.create({
        organizationId: currentOrg.id,
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        itemId: damageItem.id, itemName: damageItem.name,
        type: 'damaged', quantity: -qty, user: 'Store Manager',
        reference: `DMG-${Date.now()}`,
        notes: `${damageForm.source}${damageForm.notes ? ': ' + damageForm.notes : ''}`,
      });
      setItems(await inventoryService.getByOrganization(currentOrg.id));
      setDamageItem(null);
      toast({ title: `${qty} unit${qty > 1 ? 's' : ''} of ${damageItem.name} written off`, description: damageForm.source });
    } finally { setDamageSaving(false); }
  }

  function openRestock(item: Item, e: React.MouseEvent) {
    e.stopPropagation();
    setRestockItem(item);
    setRestockForm({ quantity: '', reference: '', notes: '' });
  }

  async function handleRestock(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !restockItem) return;
    const qty = parseInt(restockForm.quantity);
    if (!qty || qty <= 0) return;
    setRestockSaving(true);
    try {
      await inventoryService.adjustStock(restockItem.id, qty);
      await transactionService.create({
        organizationId: currentOrg.id,
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        itemId: restockItem.id, itemName: restockItem.name,
        type: 'received', quantity: qty, user: 'Store Manager',
        reference: restockForm.reference || `RCV-${Date.now()}`,
        notes: restockForm.notes,
      });
      setItems(await inventoryService.getByOrganization(currentOrg.id));
      setRestockItem(null);
      toast({ title: `${qty} unit${qty > 1 ? 's' : ''} added to ${restockItem.name}` });
    } finally { setRestockSaving(false); }
  }

  function openIssue(item: Item, e: React.MouseEvent) {
    e.stopPropagation();
    setIssueItem(item);
    setIssueForm(EMPTY_ISSUE);
    setRecipientSearch('');
  }

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !issueItem || !issueForm.recipientId) return;
    const recipient = recipients.find(r => r.id === issueForm.recipientId);
    if (!recipient) return;
    const qty = parseInt(issueForm.quantity) || 1;
    setIssueSaving(true);
    try {
      await assignmentService.create({
        organizationId: currentOrg.id,
        recipientId: recipient.id, recipientName: recipient.name,
        recipientIdentifier: recipient.identifier, recipientGroup: recipient.group,
        itemId: issueItem.id, itemName: issueItem.name,
        quantity: qty, conditionIssued: issueForm.conditionIssued,
        issueDate: new Date().toISOString().slice(0, 10),
        expectedReturn: issueForm.expectedReturn || undefined,
      });
      await transactionService.create({
        organizationId: currentOrg.id,
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        itemId: issueItem.id, itemName: issueItem.name,
        type: 'issued', quantity: -qty, user: 'Store Manager',
        reference: `ASN-${Date.now()}`,
        recipient: recipient.name, recipientClass: recipient.group,
      });
      setItems(await inventoryService.getByOrganization(currentOrg.id));
      setIssueItem(null);
      toast({ title: `${issueItem.name} issued to ${recipient.name}` });
    } finally { setIssueSaving(false); }
  }

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader
        title={t('Inventory')}
        description={`${items.length} ${t('items')} · ${currentOrg.name}`}
        actions={
          <div className="flex items-center gap-2">
            <CsvActions
              exportUrl="/data/export/inventory"
              importUrl="/data/import/inventory"
              entityName="Inventory"
              sampleHeaders="name,sku,category,quantity,location,min_quantity,reorder_qty"
              onImportComplete={() => currentOrg && inventoryService.getByOrganization(currentOrg.id).then(setItems)}
            />
            <Button variant="outline" size="sm" onClick={() => setFieldsSheetOpen(true)}>
              <Settings2 className="h-4 w-4 mr-1" />{t('Custom Fields')}
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> {t('Add Item')}
            </Button>
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {statsRow.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 text-[15px] font-bold" style={{ background: s.bg, color: s.color }}>
              {s.value}
            </div>
            <span className="text-[12px] text-gray-500 font-medium leading-tight">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder={t('Search by name or SKU…')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-gray-50 border-0 focus-visible:ring-1 focus-visible:ring-gray-300"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px] border-gray-200 bg-white text-[13px]">
              <SelectValue placeholder={t('Category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All Categories')}</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] border-gray-200 bg-white text-[13px]">
              <SelectValue placeholder={t('Status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All Status')}</SelectItem>
              <SelectItem value="in_stock">{t('In Stock')}</SelectItem>
              <SelectItem value="low_stock">{t('Low Stock')}</SelectItem>
              <SelectItem value="out_of_stock">{t('Out of Stock')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[130px] border-gray-200 bg-white text-[13px]">
              <SelectValue placeholder={t('Location')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All Locations')}</SelectItem>
              {locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-1 ml-1">
            <button
              onClick={() => setView('grid')}
              title={t('Card view')}
              className={`h-7 w-7 flex items-center justify-center rounded-md transition-all ${view === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView('table')}
              title={t('Table view')}
              className={`h-7 w-7 flex items-center justify-center rounded-md transition-all ${view === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length > 0 && (
        <p className="text-[12px] text-gray-400 mb-3 px-1">
          {t('Showing')} <span className="font-semibold text-gray-600">{filtered.length}</span> {filtered.length !== 1 ? t('items') : t('item')}
          {(search || categoryFilter !== 'all' || statusFilter !== 'all' || locationFilter !== 'all') ? ` (${t('filtered')})` : ''}
        </p>
      )}

      {/* ── Empty ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <EmptyState
            icon={Package}
            title={t('No items found')}
            description={t('Try adjusting your filters or add a new item.')}
            action={<Button onClick={() => setShowAddDialog(true)}><Plus className="h-4 w-4 mr-1" />{t('Add Item')}</Button>}
          />
        </div>

      ) : view === 'grid' ? (

        /* ══════════════════════════════════════
           CARD GRID
        ══════════════════════════════════════ */
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map(item => {
            const color    = catColor(item.categoryName);
            const pct      = item.quantity > 0 ? Math.round((item.available / item.quantity) * 100) : 0;
            const barColor = STATUS_BAR[item.status] ?? '#9ca3af';

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden flex flex-col group"
                onClick={() => navigate(`/inventory/${item.id}`)}
              >
                {/* ── Photo header ── */}
                <div className="relative overflow-hidden bg-gray-50">
                  <CardImage categoryName={item.categoryName} itemId={item.id} />

                  {/* Status badge overlay */}
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={item.status} />
                  </div>

                  {/* Category colour strip at bottom of image */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: color }} />
                </div>

                {/* ── Content ── */}
                <div className="p-4 flex flex-col flex-1">
                  {/* Name */}
                  <p className="text-[14px] font-semibold text-gray-900 leading-snug mb-0.5 group-hover:text-gray-700 transition-colors line-clamp-2">
                    {item.name}
                  </p>
                  {/* SKU */}
                  <p className="text-[11px] font-mono text-gray-400 mb-2">{item.sku}</p>

                  {/* Location + category */}
                  <div className="flex items-center gap-1 text-[11px] mb-4 min-w-0" style={{ color: '#9ca3af' }}>
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.location}</span>
                    <span className="mx-1 shrink-0" style={{ color: '#e5e7eb' }}>·</span>
                    <span className="truncate font-medium" style={{ color }}>{item.categoryName}</span>
                  </div>

                  {/* Stock bar */}
                  <div className="mt-auto">
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-gray-400">{t('Available')}</span>
                      <span className="font-semibold text-gray-700">
                        {item.available}
                        <span className="text-gray-300 font-normal">/{item.quantity}</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 text-right">{pct}% {t('in stock')}</p>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-1.5 pt-3 mt-3 border-t border-gray-50"
                    onClick={e => e.stopPropagation()}
                  >
                    {item.available > 0 ? (
                      <button
                        className="flex-1 text-[12px] font-semibold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        style={{ background: color + '12', color }}
                        onMouseEnter={e => (e.currentTarget.style.background = color + '28')}
                        onMouseLeave={e => (e.currentTarget.style.background = color + '12')}
                        onClick={e => openIssue(item, e)}
                      >
                        <ArrowRightLeft className="h-3 w-3" />
                        {config.assignmentLabel}
                      </button>
                    ) : (
                      <span className="flex-1 text-[11px] text-gray-300 text-center py-1.5 select-none">
                        {t('No stock')}
                      </span>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 transition-colors shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/inventory/${item.id}`)}>
                          <Eye className="h-4 w-4 mr-2" /> {t('View Details')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={e => openEdit(item, e)}>
                          <Pencil className="h-4 w-4 mr-2" /> {t('Edit Item')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={e => openRestock(item, e)}>
                          <PackagePlus className="h-4 w-4 mr-2" /> {t('Add Stock')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={e => openDamage(item, e)}
                        >
                          <ShieldAlert className="h-4 w-4 mr-2" /> {t('Report Damage')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={e => handleDeleteItem(item, e)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> {t('Delete Item')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      ) : (

        /* ══════════════════════════════════════
           TABLE VIEW
        ══════════════════════════════════════ */
        <Card className="shadow-sm border-gray-100">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/60">
                  <TableHead className="pl-4">{t('Item')}</TableHead>
                  <TableHead>{t('Category')}</TableHead>
                  <TableHead>{t('SKU')}</TableHead>
                  <TableHead className="text-right">{t('Total')}</TableHead>
                  <TableHead className="w-[120px]">{t('Stock')}</TableHead>
                  <TableHead>{t('Location')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead>{t('Updated')}</TableHead>
                  <TableHead className="w-[160px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => {
                  const color    = catColor(item.categoryName);
                  const pct      = item.quantity > 0 ? Math.round((item.available / item.quantity) * 100) : 0;
                  const barColor = STATUS_BAR[item.status] ?? '#9ca3af';
                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-gray-50/70 transition-colors"
                      onClick={() => navigate(`/inventory/${item.id}`)}
                    >
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <RowThumb categoryName={item.categoryName} itemId={item.id} />
                          <span className="font-medium text-[13px] text-gray-900">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[12px] font-medium px-2 py-0.5 rounded-md" style={{ background: color + '14', color }}>
                          {item.categoryName}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-gray-400">{item.sku}</TableCell>
                      <TableCell className="text-right font-semibold text-[13px]">{item.quantity}</TableCell>
                      <TableCell>
                        <div>
                          <div className="flex justify-between text-[10px] mb-1 text-gray-400">
                            <span>{item.available} {t('avail')}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full w-20 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-[13px] text-gray-500">{item.location}</TableCell>
                      <TableCell><StatusBadge status={item.status} /></TableCell>
                      <TableCell className="text-[12px] text-gray-400 whitespace-nowrap">{item.lastUpdated}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {item.available > 0 && (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={e => openIssue(item, e)}>
                              <ArrowRightLeft className="h-3 w-3 mr-1" />
                              {config.assignmentLabel}
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/inventory/${item.id}`)}>
                                <Eye className="h-4 w-4 mr-2" /> {t('View Details')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={e => openEdit(item, e)}>
                                <Pencil className="h-4 w-4 mr-2" /> {t('Edit Item')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={e => openRestock(item, e)}>
                                <PackagePlus className="h-4 w-4 mr-2" /> {t('Add Stock')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={e => openDamage(item, e)}
                              >
                                <ShieldAlert className="h-4 w-4 mr-2" /> {t('Report Damage')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={e => handleDeleteItem(item, e)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> {t('Delete Item')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════
          DIALOGS
      ══════════════════════════════════════════════════════════ */}

      {/* Add / Edit Item */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) { setEditItem(null); setForm(EMPTY_FORM); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editItem ? t('Edit Item') : t('Add New Item')}</DialogTitle></DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="item-name">{t('Item Name')} *</Label>
              <Input id="item-name" placeholder={t('e.g. School Shirt')} required
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-sku">{t('SKU')} *</Label>
              <Input id="item-sku" placeholder={t('e.g. UNI-SH-002')} required
                value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-category">{t('Category')} *</Label>
              <Select required value={form.categoryId} onValueChange={val => {
                if (val === '__new__') {
                  const name = prompt(t('Enter new category name:'));
                  if (name && name.trim()) {
                    categoryService.create({ name: name.trim() }).then(cat => {
                      setCategories(prev => [...prev, cat]);
                      setForm(f => ({ ...f, categoryId: cat.id, categoryName: cat.name }));
                    });
                  }
                } else {
                  setForm({ ...form, categoryId: val });
                }
              }}>
                <SelectTrigger id="item-category"><SelectValue placeholder={t('Select category')} /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  <SelectItem value="__new__" className="text-primary font-medium">+ {t('Create New Category')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!editItem && (
              <div className="space-y-1.5">
                <Label htmlFor="item-qty">{t('Initial Quantity')} *</Label>
                <Input id="item-qty" type="number" min="0" placeholder="0" required
                  value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="item-loc">{t('Location')} *</Label>
              <Input id="item-loc" placeholder={t('e.g. Main Store')} required
                value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="item-min">{t('Low Stock Threshold')}</Label>
                <Input id="item-min" type="number" min="0" placeholder="10"
                  value={form.minQuantity} onChange={e => setForm({ ...form, minQuantity: e.target.value })} />
                <p className="text-xs text-muted-foreground">{t('Alert when stock ≤ this')}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-reorder">{t('Reorder Quantity')}</Label>
                <Input id="item-reorder" type="number" min="0" placeholder="50"
                  value={form.reorderQty} onChange={e => setForm({ ...form, reorderQty: e.target.value })} />
                <p className="text-xs text-muted-foreground">{t('Suggested PO qty')}</p>
              </div>
            </div>
            <CustomFieldsRenderer
              entity="item"
              values={form.attributes}
              onChange={(attrs) => setForm({ ...form, attributes: attrs })}
            />
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowAddDialog(false); setEditItem(null); setForm(EMPTY_FORM); }}>{t('Cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving ? t('Saving…') : editItem ? t('Save Changes') : t('Add Item')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Restock */}
      <Dialog open={!!restockItem} onOpenChange={open => !open && setRestockItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-emerald-600" />
              {t('Add Stock')} — {restockItem?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRestock} className="space-y-4 py-2">
            {restockItem && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="text-center">
                  <p className="text-[11px] text-gray-400 mb-0.5">{t('Current Stock')}</p>
                  <p className="text-[22px] font-bold text-gray-900 leading-none">{restockItem.quantity}</p>
                </div>
                <div className="h-8 w-px bg-gray-200" />
                <div className="text-center">
                  <p className="text-[11px] text-gray-400 mb-0.5">{t('Available')}</p>
                  <p className="text-[22px] font-bold text-emerald-600 leading-none">{restockItem.available}</p>
                </div>
                <div className="h-8 w-px bg-gray-200" />
                <div className="text-center">
                  <p className="text-[11px] text-gray-400 mb-0.5">{t('Reserved')}</p>
                  <p className="text-[22px] font-bold text-gray-500 leading-none">{restockItem.reserved}</p>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t('Units to Add')} *</Label>
              <Input
                type="number" min={1} placeholder={t('e.g. 50')} required
                value={restockForm.quantity}
                onChange={e => setRestockForm({ ...restockForm, quantity: e.target.value })}
              />
              {restockForm.quantity && parseInt(restockForm.quantity) > 0 && restockItem && (
                <p className="text-xs text-emerald-600 font-medium">
                  {t('New total will be')} {restockItem.quantity + parseInt(restockForm.quantity)} {t('units')}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t('Reference / PO Number')}</Label>
              <Input
                placeholder={t('e.g. PO-2024-001')}
                value={restockForm.reference}
                onChange={e => setRestockForm({ ...restockForm, reference: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Notes')}</Label>
              <Input
                placeholder={t('e.g. Received from vendor…')}
                value={restockForm.notes}
                onChange={e => setRestockForm({ ...restockForm, notes: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setRestockItem(null)}>{t('Cancel')}</Button>
              <Button
                type="submit" disabled={restockSaving || !restockForm.quantity}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {restockSaving ? t('Saving…') : `${t('Add')} ${restockForm.quantity || ''} ${t('Units')}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Damage */}
      <Dialog open={!!damageItem} onOpenChange={open => !open && setDamageItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t('Report Damage')} — {damageItem?.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleDamage} className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {t('Record units that are damaged and cannot be used. Stock will be reduced accordingly.')}
            </p>
            <div className="space-y-1.5">
              <Label>{t('Damage Source')} *</Label>
              <Input required value={damageForm.source}
                onChange={e => setDamageForm({ ...damageForm, source: e.target.value })}
                placeholder={t('e.g. Manufacturer defect, Flood damage…')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Units Damaged')} *</Label>
              <Input type="number" min={1} max={damageItem?.quantity} value={damageForm.quantity}
                onChange={e => setDamageForm({ ...damageForm, quantity: e.target.value })} />
              <p className="text-xs text-muted-foreground">{damageItem?.quantity} {t('units in stock')}</p>
            </div>
            <div className="space-y-1.5">
              <Label>{t('Notes')}</Label>
              <Textarea value={damageForm.notes} rows={3} placeholder={t('Describe the damage…')}
                onChange={e => setDamageForm({ ...damageForm, notes: e.target.value })} />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDamageItem(null)}>{t('Cancel')}</Button>
              <Button type="submit" variant="destructive" disabled={damageSaving}>
                {damageSaving ? t('Saving…') : t('Write Off')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Issue */}
      <Dialog open={!!issueItem} onOpenChange={open => !open && setIssueItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{config.assignmentLabel} — {issueItem?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleIssue} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('Select')} {config.recipientLabel} *</Label>
              <Input
                placeholder={`${t('Search by name or')} ${config.identifierLabel.toLowerCase()}…`}
                value={recipientSearch}
                onChange={e => { setRecipientSearch(e.target.value); setIssueForm({ ...issueForm, recipientId: '' }); }}
              />
              {filteredRecipients.length > 0 && !issueForm.recipientId && (
                <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                  {filteredRecipients.map(r => (
                    <button key={r.id} type="button"
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                      onClick={() => { setIssueForm({ ...issueForm, recipientId: r.id }); setRecipientSearch(r.name); }}
                    >
                      <span className="font-medium">{r.name}</span>
                      {r.identifier && <span className="text-muted-foreground ml-2 text-xs">{r.identifier}</span>}
                      {r.group && <span className="text-muted-foreground ml-2 text-xs">· {r.group}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('Quantity')} *</Label>
                <Input type="number" min={1} max={issueItem?.available} value={issueForm.quantity}
                  onChange={e => setIssueForm({ ...issueForm, quantity: e.target.value })} />
                <p className="text-xs text-muted-foreground">{issueItem?.available} {t('available')}</p>
              </div>
              {config.enableConditionTracking && (
                <div className="space-y-1.5">
                  <Label>{t('Condition')}</Label>
                  <Select value={issueForm.conditionIssued} onValueChange={v => setIssueForm({ ...issueForm, conditionIssued: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['New', 'Good', 'Fair', 'Poor'].map(c => <SelectItem key={c} value={c}>{t(c)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {config.assignmentMode === 'lending' && (
              <div className="space-y-1.5">
                <Label>{t('Expected Return Date')}</Label>
                <Input type="date" value={issueForm.expectedReturn}
                  onChange={e => setIssueForm({ ...issueForm, expectedReturn: e.target.value })} />
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIssueItem(null)}>{t('Cancel')}</Button>
              <Button type="submit" disabled={!issueForm.recipientId || issueSaving}>
                {issueSaving ? t('Saving…') : `${config.assignmentLabel} ${t('Item')}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CustomFieldsSheet
        entity="item"
        entityLabel="Items"
        open={fieldsSheetOpen}
        onOpenChange={setFieldsSheetOpen}
      />
    </div>
  );
}
