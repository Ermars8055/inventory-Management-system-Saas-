import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, FileText, Clock, CheckCircle2, XCircle, ArrowRight, Trash2 } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { quotationService, inventoryService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import type { Quotation, Item } from '@/types';

const STATUS_CONFIG = {
  draft:      { label: 'Draft',      color: 'bg-muted text-muted-foreground' },
  sent:       { label: 'Sent',       color: 'bg-blue-50 text-blue-700 border-blue-200' },
  comparing:  { label: 'Comparing',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
  converted:  { label: 'Converted',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:  { label: 'Cancelled',  color: 'bg-red-50 text-red-700 border-red-200' },
} as const;

interface NewForm {
  title: string;
  notes: string;
  selectedItems: { itemId: string; itemName: string; qtyNeeded: number }[];
}

export function QuotationsPage() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Item[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<NewForm>({ title: '', notes: '', selectedItems: [] });
  const [saving, setSaving] = useState(false);

  // Auto-open create dialog when coming from dashboard reorder button
  const reorder = searchParams.get('reorder');
  const preItems = searchParams.get('items'); // comma-separated item IDs

  useEffect(() => {
    if (!currentOrg) return;
    quotationService.getByOrganization(currentOrg.id).then(setQuotations);
    inventoryService.getByOrganization(currentOrg.id).then(items => {
      const low = items.filter(i => i.status === 'low_stock' || i.status === 'out_of_stock');
      setLowStockItems(low);
    });
  }, [currentOrg]);

  useEffect(() => {
    if (reorder && lowStockItems.length > 0) {
      const preselected = preItems
        ? lowStockItems.filter(i => preItems.split(',').includes(i.id))
        : lowStockItems;
      setForm({
        title: `Reorder — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        notes: '',
        selectedItems: preselected.map(i => ({
          itemId: i.id,
          itemName: i.name,
          qtyNeeded: i.reorderQty ?? 50,
        })),
      });
      setShowCreate(true);
    }
  }, [reorder, lowStockItems, preItems]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !form.title.trim()) return;
    setSaving(true);
    try {
      const q = await quotationService.create({
        organizationId: currentOrg.id,
        title: form.title,
        notes: form.notes || undefined,
        items: form.selectedItems,
      });
      setQuotations(prev => [q, ...prev]);
      setShowCreate(false);
      setForm({ title: '', notes: '', selectedItems: [] });
      navigate(`/quotations/${q.id}`);
    } catch {
      toast({ title: t('Error'), description: t('Failed to create quotation'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(q: Quotation, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete quotation "${q.title}"?`)) return;
    try {
      await quotationService.delete(q.id);
      setQuotations(prev => prev.filter(x => x.id !== q.id));
      toast({ title: t('Deleted') });
    } catch {
      toast({ title: t('Error'), description: t('Failed to delete'), variant: 'destructive' });
    }
  }

  function toggleLowStockItem(item: Item) {
    setForm(f => {
      const exists = f.selectedItems.find(i => i.itemId === item.id);
      if (exists) {
        return { ...f, selectedItems: f.selectedItems.filter(i => i.itemId !== item.id) };
      }
      return {
        ...f,
        selectedItems: [...f.selectedItems, { itemId: item.id, itemName: item.name, qtyNeeded: item.reorderQty ?? 50 }],
      };
    });
  }

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader
        title={t("Vendor Quotations")}
        description={t("Compare vendor prices and send purchase orders via email")}
        actions={
          <Button onClick={() => { setForm({ title: '', notes: '', selectedItems: [] }); setShowCreate(true); }}>
            <Plus className="h-4 w-4 mr-1" /> {t("New Quotation")}
          </Button>
        }
      />

      {quotations.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={FileText}
              title={t("No quotations yet")}
              description={t("Create a quotation to compare vendor prices and generate purchase orders.")}
              action={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />{t("New Quotation")}</Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quotations.map(q => {
            const cfg = STATUS_CONFIG[q.status] ?? STATUS_CONFIG.draft;
            const vendorCount = q.vendorQuotes.length;
            const quotedCount = q.vendorQuotes.filter(v => v.status === 'quoted').length;
            return (
              <Card
                key={q.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/quotations/${q.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{q.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {q.items.length} item{q.items.length !== 1 ? 's' : ''} · {vendorCount} vendor{vendorCount !== 1 ? 's' : ''}
                      {vendorCount > 0 && ` (${quotedCount} quoted)`}
                      {q.createdAt && ` · ${q.createdAt}`}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${cfg.color}`}>
                    {t(cfg.label)}
                  </Badge>
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => handleDelete(q, e)}
                      className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("New Quotation")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>{t("Title")} *</Label>
              <Input
                required
                placeholder={t("e.g. Term 2 Stationery Reorder")}
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>

            {lowStockItems.length > 0 && (
              <div className="space-y-2">
                <Label>{t("Pre-select low-stock items")}</Label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border p-3">
                  {lowStockItems.map(item => {
                    const sel = form.selectedItems.find(i => i.itemId === item.id);
                    return (
                      <label key={item.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded p-1.5">
                        <input
                          type="checkbox"
                          checked={!!sel}
                          onChange={() => toggleLowStockItem(item)}
                          className="h-4 w-4"
                        />
                        <span className="flex-1 text-sm">{item.name}</span>
                        {sel && (
                          <Input
                            type="number"
                            min={1}
                            value={sel.qtyNeeded}
                            onClick={e => e.preventDefault()}
                            onChange={e => setForm(f => ({
                              ...f,
                              selectedItems: f.selectedItems.map(i =>
                                i.itemId === item.id ? { ...i, qtyNeeded: Number(e.target.value) } : i
                              ),
                            }))}
                            className="w-20 h-7 text-xs"
                          />
                        )}
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          {item.available} avail
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">{form.selectedItems.length} {t("item(s) selected — you can add more on the next screen")}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>{t("Notes")}</Label>
              <Textarea
                placeholder={t("Any special requirements...")}
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="text-sm"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>{t("Cancel")}</Button>
              <Button type="submit" disabled={saving}>
                {saving ? t('Creating…') : t('Create & Continue →')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
