import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ChevronRight, Package, GripVertical } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { classTemplateService, inventoryService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import type { ClassTemplate, Item } from '@/types';

const EMPTY_TEMPLATE = { name: '', group: '', academicYear: '', notes: '' };
const EMPTY_ITEM = { itemId: '', itemName: '', quantity: '1', unitPrice: '0', conditionIssued: 'New', notes: '' };
const CONDITIONS = ['New', 'Good', 'Fair', 'Poor'];

export function ClassTemplatesPage() {
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ClassTemplate | null>(null);

  // Template dialog
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ClassTemplate | null>(null);
  const [tForm, setTForm] = useState(EMPTY_TEMPLATE);
  const [tSaving, setTSaving] = useState(false);

  // Line-item dialog
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string } | null>(null);
  const [iForm, setIForm] = useState(EMPTY_ITEM);
  const [iSaving, setISaving] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    Promise.all([
      classTemplateService.getByOrganization(currentOrg.id),
      inventoryService.getByOrganization(currentOrg.id),
    ]).then(([ts, inv]) => {
      setTemplates(ts);
      setItems(inv);
    }).finally(() => setLoading(false));
  }, [currentOrg]);

  // ── Template CRUD ───────────────────────────────────────────────────────
  function openNewTemplate() {
    setEditingTemplate(null);
    setTForm(EMPTY_TEMPLATE);
    setShowTemplateDialog(true);
  }

  function openEditTemplate(t: ClassTemplate) {
    setEditingTemplate(t);
    setTForm({ name: t.name, group: t.group, academicYear: t.academicYear ?? '', notes: t.notes ?? '' });
    setShowTemplateDialog(true);
  }

  async function saveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg) return;
    setTSaving(true);
    try {
      if (editingTemplate) {
        const updated = await classTemplateService.update(editingTemplate.id, {
          name: tForm.name, group: tForm.group,
          academicYear: tForm.academicYear || undefined,
          notes: tForm.notes || undefined,
        });
        setTemplates(ts => ts.map(t => t.id === updated.id ? updated : t));
        if (selected?.id === updated.id) setSelected(updated);
      } else {
        const created = await classTemplateService.create({
          organizationId: currentOrg.id,
          name: tForm.name, group: tForm.group,
          academicYear: tForm.academicYear || undefined,
          notes: tForm.notes || undefined,
          items: [],
        });
        setTemplates(ts => [...ts, created]);
      }
      setShowTemplateDialog(false);
      toast({ title: t(editingTemplate ? 'Template updated' : 'Template created') });
    } finally { setTSaving(false); }
  }

  async function deleteTemplate(tmpl: ClassTemplate) {
    if (!confirm(t('Delete template') + ' "' + tmpl.name + '"? ' + t('This cannot be undone.'))) return;
    await classTemplateService.delete(tmpl.id);
    setTemplates(ts => ts.filter(x => x.id !== tmpl.id));
    if (selected?.id === tmpl.id) setSelected(null);
    toast({ title: t('Template deleted') });
  }

  // ── Line-item CRUD ──────────────────────────────────────────────────────
  function openNewItem() {
    setEditingItem(null);
    setIForm(EMPTY_ITEM);
    setItemSearch('');
    setShowItemDropdown(false);
    setShowItemDialog(true);
  }

  function openEditItem(li: ClassTemplate['items'][0]) {
    setEditingItem({ id: li.id });
    setIForm({
      itemId: li.itemId ?? '',
      itemName: li.itemName,
      quantity: String(li.quantity),
      unitPrice: String(li.unitPrice ?? 0),
      conditionIssued: li.conditionIssued,
      notes: li.notes ?? '',
    });
    setItemSearch(li.itemName);
    setShowItemDropdown(false);
    setShowItemDialog(true);
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setISaving(true);
    const payload = {
      itemId: iForm.itemId || undefined,
      itemName: iForm.itemName,
      quantity: parseInt(iForm.quantity) || 1,
      unitPrice: parseInt(iForm.unitPrice) || 0,
      conditionIssued: iForm.conditionIssued,
      notes: iForm.notes || undefined,
    };
    try {
      if (editingItem) {
        const updated = await classTemplateService.updateItem(selected.id, editingItem.id, payload);
        const fresh: ClassTemplate = {
          ...selected,
          items: selected.items.map(li => li.id === updated.id ? updated : li),
        };
        setSelected(fresh);
        setTemplates(ts => ts.map(t => t.id === fresh.id ? fresh : t));
      } else {
        const added = await classTemplateService.addItem(selected.id, payload);
        const fresh: ClassTemplate = { ...selected, items: [...selected.items, added] };
        setSelected(fresh);
        setTemplates(ts => ts.map(t => t.id === fresh.id ? fresh : t));
      }
      setShowItemDialog(false);
      toast({ title: t(editingItem ? 'Item updated' : 'Item added') });
    } finally { setISaving(false); }
  }

  async function deleteItem(li: ClassTemplate['items'][0]) {
    if (!selected) return;
    await classTemplateService.deleteItem(selected.id, li.id);
    const fresh: ClassTemplate = { ...selected, items: selected.items.filter(x => x.id !== li.id) };
    setSelected(fresh);
    setTemplates(ts => ts.map(t => t.id === fresh.id ? fresh : t));
    toast({ title: t('Item removed') });
  }

  // ── Inventory search for item picker ──────────────────────────────────
  const filteredItems = items.filter(i =>
    itemSearch.length > 1 && i.name.toLowerCase().includes(itemSearch.toLowerCase())
  ).slice(0, 8);

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader
        title={t('Class Material Templates')}
        description={t('Define what items each class receives. Use Bulk Issue to issue them in one shot.')}
        actions={
          <Button onClick={openNewTemplate}>
            <Plus className="h-4 w-4 mr-1" /> {t('New Template')}
          </Button>
        }
      />

      <div className="grid md:grid-cols-5 gap-6">
        {/* Left: template list */}
        <div className="md:col-span-2 space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">{t('Loading...')}</p>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {t('No templates yet. Create one to get started.')}
              </CardContent>
            </Card>
          ) : (
            templates.map(tmpl => (
              <Card
                key={tmpl.id}
                className={`cursor-pointer transition-all ${selected?.id === tmpl.id ? 'border-primary ring-1 ring-primary/30' : 'hover:border-primary/40'}`}
                onClick={() => setSelected(tmpl)}
              >
                <CardContent className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{tmpl.name}</p>
                    <p className="text-xs text-muted-foreground">{tmpl.group}{tmpl.academicYear ? ` · ${tmpl.academicYear}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{tmpl.items.length} {tmpl.items.length !== 1 ? t('items') : t('item')}</p>
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditTemplate(tmpl)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteTemplate(tmpl)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Right: selected template items */}
        <div className="md:col-span-3">
          {!selected ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                {t('Select a template to manage its items.')}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{selected.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{selected.group}{selected.academicYear ? ` · ${selected.academicYear}` : ''}</p>
                </div>
                <Button size="sm" onClick={openNewItem}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> {t('Add Item')}
                </Button>
              </CardHeader>
              <CardContent>
                {selected.items.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {t('No items yet. Add the materials that should be issued with this template.')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selected.items.map(li => (
                      <div key={li.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/30">
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Package className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{li.itemName}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('Qty')}: {li.quantity}
                            {(li.unitPrice ?? 0) > 0 ? ` · ₹${li.unitPrice} × ${li.quantity} = ₹${(li.unitPrice ?? 0) * li.quantity}` : ''}
                            {` · ${t('Condition')}: ${t(li.conditionIssued)}`}
                            {li.notes ? ` · ${li.notes}` : ''}
                          </p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => openEditItem(li)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" onClick={() => deleteItem(li)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Template create/edit dialog ───────────────────────────────────── */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? t('Edit Template') : t('New Class Template')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveTemplate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('Template Name')} *</Label>
              <Input
                placeholder="e.g. Grade 5A Kit 2025-26"
                value={tForm.name}
                onChange={e => setTForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Class / Group')} *</Label>
              <Input
                placeholder="e.g. Grade 5A"
                value={tForm.group}
                onChange={e => setTForm(f => ({ ...f, group: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Academic Year')}</Label>
              <Input
                placeholder="e.g. 2025-26"
                value={tForm.academicYear}
                onChange={e => setTForm(f => ({ ...f, academicYear: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Notes')}</Label>
              <Input
                placeholder={t('Optional notes')}
                value={tForm.notes}
                onChange={e => setTForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTemplateDialog(false)}>{t('Cancel')}</Button>
              <Button type="submit" disabled={tSaving}>{tSaving ? t('Saving...') : t('Save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Line-item create/edit dialog ──────────────────────────────────── */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? t('Edit Item') : t('Add Item to Template')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveItem} className="space-y-4 py-2">
            <div className="space-y-1.5 relative">
              <Label>{t('Item')} *</Label>
              <Input
                placeholder={t('Search inventory or type a name...')}
                value={itemSearch}
                onChange={e => {
                  setItemSearch(e.target.value);
                  setIForm(f => ({ ...f, itemName: e.target.value, itemId: '' }));
                  setShowItemDropdown(true);
                }}
                required
              />
              {showItemDropdown && filteredItems.length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border rounded-md shadow-lg max-h-44 overflow-y-auto">
                  {filteredItems.map(inv => (
                    <button
                      key={inv.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex justify-between"
                      onClick={() => {
                        setIForm(f => ({ ...f, itemId: inv.id, itemName: inv.name }));
                        setItemSearch(inv.name);
                        setShowItemDropdown(false);
                      }}
                    >
                      <span>{inv.name}</span>
                      <span className="text-muted-foreground text-xs">{inv.available} {t('avail')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{t('Quantity')} *</Label>
                <Input
                  type="number" min={1}
                  value={iForm.quantity}
                  onChange={e => setIForm(f => ({ ...f, quantity: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('Unit Price')}</Label>
                <Input
                  type="number" min={0}
                  value={iForm.unitPrice}
                  onChange={e => setIForm(f => ({ ...f, unitPrice: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('Condition')}</Label>
                <Select value={iForm.conditionIssued} onValueChange={v => setIForm(f => ({ ...f, conditionIssued: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(c => <SelectItem key={c} value={c}>{t(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('Notes')}</Label>
              <Input
                placeholder={t('Optional (e.g. Size 32)')}
                value={iForm.notes}
                onChange={e => setIForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowItemDialog(false)}>{t('Cancel')}</Button>
              <Button type="submit" disabled={iSaving || !iForm.itemName}>{iSaving ? t('Saving...') : t('Save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
