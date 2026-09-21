import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Package, MapPin, Calendar, TrendingUp, Pencil } from 'lucide-react';
import { inventoryService, transactionService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getModuleDef } from '@/data/modules';
import { useTranslation } from '@/hooks/useTranslation';
import type { Item, StockTransaction } from '@/types';

const TRANSACTION_LABELS: Record<string, string> = {
  received: 'Received', issued: 'Issued', returned: 'Returned', adjusted: 'Adjusted', damaged: 'Damaged', transferred: 'Transferred',
};

export function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [item, setItem] = useState<Item | null>(null);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);

  // Edit dialog state
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', sku: '', location: '', minQuantity: '', reorderQty: '' });
  const [editSaving, setEditSaving] = useState(false);

  function refreshItem() {
    if (!id) return;
    inventoryService.getById(id).then((i) => setItem(i || null));
    transactionService.getByItem(id).then(setTransactions);
  }

  useEffect(() => {
    refreshItem();
  }, [id]);

  function openEdit() {
    if (!item) return;
    setEditForm({
      name: item.name,
      sku: item.sku,
      location: item.location,
      minQuantity: item.minQuantity != null ? String(item.minQuantity) : '',
      reorderQty: item.reorderQty != null ? String(item.reorderQty) : '',
    });
    setShowEdit(true);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setEditSaving(true);
    try {
      await inventoryService.update(id, {
        name: editForm.name,
        sku: editForm.sku,
        location: editForm.location,
        minQuantity: editForm.minQuantity ? parseInt(editForm.minQuantity) : undefined,
        reorderQty: editForm.reorderQty ? parseInt(editForm.reorderQty) : undefined,
      });
      toast({ title: t('Item updated successfully') });
      setShowEdit(false);
      refreshItem();
    } catch {
      toast({ title: t('Failed to update item'), variant: 'destructive' });
    } finally {
      setEditSaving(false);
    }
  }

  if (!item) return <div className="p-8 text-muted-foreground">{t('Loading...')}</div>;

  const moduleDef = item.module !== 'general' ? getModuleDef(item.module) : null;

  // Build module-specific attributes
  const moduleAttributes: { label: string; value: string }[] = [];
  if (item.uniform) {
    moduleAttributes.push(
      { label: t('Class'), value: item.uniform.classGrade },
      { label: t('Gender'), value: item.uniform.gender },
      { label: t('Size'), value: item.uniform.size },
      { label: t('Academic Year'), value: item.uniform.academicYear },
      { label: t('Uniform Type'), value: item.uniform.uniformType },
    );
  }
  if (item.book) {
    moduleAttributes.push(
      { label: t('ISBN'), value: item.book.isbn },
      { label: t('Subject'), value: item.book.subject },
      { label: t('Class'), value: item.book.classGrade },
      { label: t('Academic Year'), value: item.book.academicYear },
      { label: t('Edition'), value: item.book.edition },
      { label: t('Publisher'), value: item.book.publisher },
    );
  }
  if (item.medicine) {
    moduleAttributes.push(
      { label: t('Generic Name'), value: item.medicine.genericName },
      { label: t('Manufacturer'), value: item.medicine.manufacturer },
      { label: t('Batch Number'), value: item.medicine.batchNumber },
      { label: t('Expiry Date'), value: item.medicine.expiryDate },
      { label: t('Manufacturing Date'), value: item.medicine.manufacturingDate },
      { label: t('MRP'), value: `₹${item.medicine.mrp}` },
      { label: t('Purchase Price'), value: `₹${item.medicine.purchasePrice}` },
      { label: t('Prescription Required'), value: item.medicine.prescriptionRequired ? t('Yes') : t('No') },
    );
  }

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> {t('Back to Inventory')}
      </Button>

      <PageHeader
        title={item.name}
        description={`${t('SKU')}: ${item.sku}`}
        actions={
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Pencil className="h-4 w-4 mr-1" /> {t('Edit')}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Stock Summary */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('Current Stock')}</p>
              <p className="text-2xl font-bold mt-1">{item.quantity}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('Available')}</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{item.available}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('Reserved')}</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{item.reserved}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('Status')}</p>
              <div className="mt-2"><StatusBadge status={item.status} /></div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
          <TabsTrigger value="stock">{t('Stock')}</TabsTrigger>
          <TabsTrigger value="transactions">{t('Transactions')}</TabsTrigger>
          {item.module === 'uniforms' && <TabsTrigger value="issue-history">{t('Issue History')}</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('Item Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={Package} label={t("Category")} value={item.categoryName} />
                {moduleDef && <InfoRow icon={Package} label={t("Module")} value={moduleDef.name} />}
                <InfoRow icon={MapPin} label={t("Location")} value={item.location} />
                <InfoRow icon={Calendar} label={t("Last Updated")} value={item.lastUpdated} />
              </CardContent>
            </Card>

            {moduleAttributes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {moduleDef?.name.replace(' Management', '') || t('Module')} {t('Attributes')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {moduleAttributes.map((attr) => (
                    <div key={attr.label} className="flex justify-between items-center py-1.5 border-b last:border-0">
                      <span className="text-sm text-muted-foreground">{attr.label}</span>
                      <span className="text-sm font-medium">{attr.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {item.attributes && Object.keys(item.attributes).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('Custom Fields')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(item.attributes).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center py-1.5 border-b last:border-0">
                      <span className="text-sm text-muted-foreground">{key}</span>
                      <span className="text-sm font-medium">{typeof val === 'boolean' ? (val ? t('Yes') : t('No')) : String(val)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Stock Tab */}
        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('Stock Levels')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{t('Total Quantity')}</span>
                    <span className="font-medium">{item.quantity} {t('units')}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{t('Available')}</span>
                    <span className="font-medium text-emerald-600">{item.available} {t('units')}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.quantity > 0 ? (item.available / item.quantity) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{t('Reserved')}</span>
                    <span className="font-medium text-amber-600">{item.reserved} {t('units')}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${item.quantity > 0 ? (item.reserved / item.quantity) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('Stock Transaction Timeline')}</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('No transactions recorded for this item.')}</p>
              ) : (
                <div className="space-y-0">
                  {transactions.map((tx, idx) => (
                    <div key={tx.id} className="flex gap-4 pb-6 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${tx.quantity > 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                          <TrendingUp className={`h-4 w-4 ${tx.quantity > 0 ? 'text-emerald-600' : 'text-red-600 rotate-180'}`} />
                        </div>
                        {idx < transactions.length - 1 && <div className="w-px h-full bg-border mt-1" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            {tx.quantity > 0 ? '+' : ''}{tx.quantity} {t(TRANSACTION_LABELS[tx.type] || tx.type)}
                          </p>
                          <span className="text-xs text-muted-foreground">{tx.date}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('by')} {tx.user} · {tx.reference}
                          {tx.recipient && ` · ${tx.recipient}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {item.module === 'uniforms' && (
          <TabsContent value="issue-history">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('Issue History')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Student')}</TableHead>
                      <TableHead>{t('Class')}</TableHead>
                      <TableHead className="text-right">{t('Quantity')}</TableHead>
                      <TableHead>{t('Issue Date')}</TableHead>
                      <TableHead>{t('Status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.filter((t) => t.type === 'issued').map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">{tx.recipient || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{tx.recipientClass || '—'}</TableCell>
                        <TableCell className="text-right">{Math.abs(tx.quantity)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{tx.date.split(' ')[0]}</TableCell>
                        <TableCell><StatusBadge status="issued" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Edit Item')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('Name')}</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>{t('SKU')}</Label>
              <Input value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Location')}</Label>
              <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('Min Quantity')}</Label>
                <Input type="number" min={0} value={editForm.minQuantity} onChange={(e) => setEditForm({ ...editForm, minQuantity: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('Reorder Qty')}</Label>
                <Input type="number" min={0} value={editForm.reorderQty} onChange={(e) => setEditForm({ ...editForm, reorderQty: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>{t('Cancel')}</Button>
              <Button type="submit" disabled={editSaving}>{editSaving ? t('Saving...') : t('Save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export { Link };
