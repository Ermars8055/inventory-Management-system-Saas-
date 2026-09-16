/**
 * Quotation Detail — 4-tab wizard
 *
 * Tab 1: Items    — what needs to be purchased
 * Tab 2: Vendors  — invite vendors, enter their quoted prices
 * Tab 3: Compare  — price grid, pick cheapest per item
 * Tab 4: Orders   — generated POs with mailto: Send buttons
 *
 * Status flow: draft → sent → comparing → converted | cancelled
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Mail, CheckCircle2,
  XCircle, Package, ShoppingCart, Send, ExternalLink,
} from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { quotationService, supplierService, inventoryService, procurementService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Quotation, VendorQuote, Supplier, Item, PurchaseOrder } from '@/types';

const STATUS_CONFIG = {
  draft:      { label: 'Draft',      color: 'bg-muted text-muted-foreground' },
  sent:       { label: 'Quote Requests Sent', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  comparing:  { label: 'Comparing Prices', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  converted:  { label: 'POs Generated', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:  { label: 'Cancelled',  color: 'bg-red-50 text-red-700 border-red-200' },
} as const;

const PO_STATUS: Record<string, { label: string; color: string }> = {
  ordered:            { label: 'Ordered',          color: 'bg-purple-50 text-purple-700 border-purple-200' },
  partially_received: { label: 'Part. Received',   color: 'bg-orange-50 text-orange-700 border-orange-200' },
  received:           { label: 'Received',          color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:          { label: 'Cancelled',         color: 'bg-red-50 text-red-700 border-red-200' },
};

function buildMailtoRFQ(orgName: string, rfqRef: string, vq: VendorQuote, items: Quotation['items']): string {
  const subject = encodeURIComponent(`Quote Request — ${rfqRef} | ${orgName}`);
  const lines = items.map((it, i) => `${i + 1}. ${it.itemName} — ${it.qtyNeeded} units`).join('\n');
  const body = encodeURIComponent(
    `Dear ${vq.supplierName},\n\nWe request your best quotation for the following items:\n\n${lines}\n\nPlease reply with your unit prices and estimated lead time for each item.\n\nQuotation Reference: ${rfqRef}\nDate: ${new Date().toLocaleDateString('en-IN')}\n\nThank you,\n${orgName}`
  );
  return `mailto:${vq.supplierEmail || ''}?subject=${subject}&body=${body}`;
}

function buildMailtoPO(orgName: string, po: PurchaseOrder): string {
  const subject = encodeURIComponent(`Purchase Order ${po.poNumber} | ${orgName}`);
  const lines = (po.lineItems ?? [])
    .map((li, i) => `${i + 1}. ${li.itemName} × ${li.quantityOrdered} units @ ₹${li.unitPrice} = ₹${li.unitPrice * li.quantityOrdered}`)
    .join('\n');
  const body = encodeURIComponent(
    `Dear ${po.supplier},\n\nPlease find our Purchase Order details below:\n\nPO Number: ${po.poNumber}\nDate: ${po.createdAt || new Date().toLocaleDateString('en-IN')}\n\nItems Ordered:\n${lines}\n\nTotal Amount: ₹${po.amount.toLocaleString('en-IN')}${po.expectedDate ? `\nExpected Delivery: ${po.expectedDate}` : ''}\n\nKindly confirm receipt and advise on delivery schedule.\n\nThank you,\n${orgName}`
  );
  // Find vendor email from vendor quotes
  return `mailto:?subject=${subject}&body=${body}`;
}

export function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();
  const { toast } = useToast();

  const [q, setQ] = useState<Quotation | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryItems, setInventoryItems] = useState<Item[]>([]);
  const [generatedPOs, setGeneratedPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items');

  // Item add form
  const [showAddItem, setShowAddItem] = useState(false);
  const [addItemSearch, setAddItemSearch] = useState('');
  const [addItemQty, setAddItemQty] = useState(1);
  const [addItemFreeText, setAddItemFreeText] = useState('');
  const [useInventoryItem, setUseInventoryItem] = useState(true);

  // Vendor invite form
  const [showInviteVendor, setShowInviteVendor] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  // Quote entry: which vendor is being entered
  const [enteringQuoteFor, setEnteringQuoteFor] = useState<string | null>(null);
  const [quoteEntryPrices, setQuoteEntryPrices] = useState<Record<string, { price: string; leadDays: string }>>({});

  // Compare: selections (quotation_item_id → vendor_quote_id)
  const [selections, setSelections] = useState<Record<string, string>>({});

  // Generate POs form
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [genExpectedDate, setGenExpectedDate] = useState('');
  const [genNotes, setGenNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!id || !currentOrg) return;
    const [quotation, sups, items] = await Promise.all([
      quotationService.getById(id),
      supplierService.getByOrganization(currentOrg.id),
      inventoryService.getByOrganization(currentOrg.id),
    ]);
    setQ(quotation);
    setSuppliers(sups);
    setInventoryItems(items);
    // If already converted, load POs
    if (quotation.status === 'converted') {
      const allPOs = await procurementService.getByOrganization(currentOrg.id);
      setGeneratedPOs(allPOs.filter(po => (po as any).quotationId === id));
    }
    setLoading(false);
  }, [id, currentOrg]);

  useEffect(() => { load(); }, [load]);

  // Auto-init selections with cheapest vendor per item when entering compare tab
  useEffect(() => {
    if (activeTab !== 'compare' || !q) return;
    const init: Record<string, string> = {};
    for (const item of q.items) {
      let best: { price: number; vqId: string } | null = null;
      for (const vq of q.vendorQuotes) {
        if (vq.status === 'rejected') continue;
        const qi = vq.quoteItems.find(x => x.quotationItemId === item.id);
        if (qi?.unitPrice != null && (best === null || qi.unitPrice < best.price)) {
          best = { price: qi.unitPrice, vqId: vq.id };
        }
      }
      if (best) init[item.id] = best.vqId;
    }
    setSelections(prev => ({ ...init, ...prev }));
  }, [activeTab, q]);

  if (!currentOrg) return null;
  if (loading) return <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>;
  if (!q) return <div className="p-8 text-center text-muted-foreground text-sm">Quotation not found.</div>;

  const cfg = STATUS_CONFIG[q.status] ?? STATUS_CONFIG.draft;
  const rfqRef = `RFQ-${q.id.slice(-6).toUpperCase()}`;
  const isEditable = q.status === 'draft' || q.status === 'sent';
  const quotedVendors = q.vendorQuotes.filter(v => v.status === 'quoted');

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleAddItem() {
    if (!q) return;
    const itemName = useInventoryItem
      ? inventoryItems.find(i => i.id === addItemSearch)?.name || addItemSearch
      : addItemFreeText;
    if (!itemName.trim()) return;
    const updated = await quotationService.addItem(q.id, {
      itemId: useInventoryItem ? addItemSearch || undefined : undefined,
      itemName,
      qtyNeeded: addItemQty,
    });
    setQ(updated);
    setShowAddItem(false);
    setAddItemSearch(''); setAddItemQty(1); setAddItemFreeText('');
  }

  async function handleRemoveItem(itemId: string) {
    const updated = await quotationService.removeItem(q.id, itemId);
    setQ(updated);
  }

  async function handleInviteVendor() {
    if (!selectedSupplierId) return;
    const sup = suppliers.find(s => s.id === selectedSupplierId);
    if (!sup) return;
    const updated = await quotationService.inviteVendor(q.id, {
      supplierId: sup.id,
      supplierName: sup.name,
      supplierEmail: sup.email || undefined,
    });
    setQ(updated);
    setShowInviteVendor(false);
    setSelectedSupplierId('');
  }

  async function handleRemoveVendor(vqId: string) {
    const updated = await quotationService.removeVendor(q.id, vqId);
    setQ(updated);
  }

  async function handleMarkSent() {
    const updated = await quotationService.update(q.id, { status: 'sent' });
    setQ(updated);
    toast({ title: 'Marked as Sent', description: 'Vendors have been notified (via email).' });
  }

  async function handleStartComparing() {
    const updated = await quotationService.update(q.id, { status: 'comparing' });
    setQ(updated);
    setActiveTab('compare');
  }

  function openQuoteEntry(vqId: string) {
    const vq = q.vendorQuotes.find(v => v.id === vqId);
    if (!vq) return;
    const initial: Record<string, { price: string; leadDays: string }> = {};
    for (const item of q.items) {
      const existing = vq.quoteItems.find(x => x.quotationItemId === item.id);
      initial[item.id] = {
        price: existing?.unitPrice != null ? String(existing.unitPrice) : '',
        leadDays: existing?.leadTimeDays != null ? String(existing.leadTimeDays) : '',
      };
    }
    setQuoteEntryPrices(initial);
    setEnteringQuoteFor(vqId);
  }

  async function handleSubmitQuote() {
    if (!enteringQuoteFor) return;
    const items = Object.entries(quoteEntryPrices)
      .filter(([, v]) => v.price !== '')
      .map(([itemId, v]) => ({
        quotationItemId: itemId,
        unitPrice: Number(v.price),
        leadTimeDays: v.leadDays ? Number(v.leadDays) : undefined,
      }));
    const updated = await quotationService.submitVendorQuote(q.id, enteringQuoteFor, { items });
    setQ(updated);
    setEnteringQuoteFor(null);
    toast({ title: 'Quote saved' });
  }

  async function handleRejectVendor(vqId: string) {
    const updated = await quotationService.rejectVendor(q.id, vqId);
    setQ(updated);
  }

  async function handleGeneratePOs() {
    setGenerating(true);
    try {
      const pos = await quotationService.generatePOs(q.id, {
        selections,
        expectedDate: genExpectedDate || undefined,
        notes: genNotes || undefined,
      });
      setGeneratedPOs(pos);
      const updated = await quotationService.getById(q.id);
      setQ(updated);
      setShowGenerateForm(false);
      setActiveTab('orders');
      toast({ title: `${pos.length} Purchase Order${pos.length !== 1 ? 's' : ''} generated!`, description: 'Send them to vendors via email.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate POs', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const invitedVendorIds = new Set(q.vendorQuotes.map(v => v.supplierId).filter(Boolean));
  const filteredInventoryItems = inventoryItems.filter(i =>
    !addItemSearch || i.name.toLowerCase().includes(addItemSearch.toLowerCase())
  );

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate('/quotations')} className="-ml-2 mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Quotations
      </Button>

      <PageHeader
        title={q.title}
        description={`${rfqRef} · ${q.items.length} item${q.items.length !== 1 ? 's' : ''} · ${q.vendorQuotes.length} vendor${q.vendorQuotes.length !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
            {q.status === 'sent' && quotedVendors.length > 0 && (
              <Button size="sm" onClick={handleStartComparing}>
                Compare Prices →
              </Button>
            )}
            {q.status === 'comparing' && Object.keys(selections).length > 0 && (
              <Button size="sm" onClick={() => setShowGenerateForm(true)}>
                <ShoppingCart className="h-4 w-4 mr-1" /> Generate POs
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="items">
            <Package className="h-3.5 w-3.5 mr-1.5" />
            Items ({q.items.length})
          </TabsTrigger>
          <TabsTrigger value="vendors">
            <Mail className="h-3.5 w-3.5 mr-1.5" />
            Vendors & Quotes ({q.vendorQuotes.length})
          </TabsTrigger>
          <TabsTrigger value="compare" disabled={quotedVendors.length === 0}>
            Compare
            {quotedVendors.length > 0 && <span className="ml-1.5 text-xs bg-primary text-primary-foreground rounded-full px-1.5">{quotedVendors.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="orders" disabled={q.status !== 'converted'}>
            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
            POs ({generatedPOs.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Items ─────────────────────────────────────────────────── */}
        <TabsContent value="items">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Items to Purchase</CardTitle>
              {isEditable && (
                <Button size="sm" variant="outline" onClick={() => setShowAddItem(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {q.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No items yet. Add the items you need to purchase.</p>
              ) : (
                <div className="divide-y">
                  {q.items.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 py-3">
                      <span className="text-sm text-muted-foreground w-6 text-right">{idx + 1}.</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.itemName}</p>
                        {item.itemId && <p className="text-xs text-muted-foreground">Linked to inventory</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{item.qtyNeeded} units</span>
                        {isEditable && (
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {q.status === 'draft' && q.items.length > 0 && q.vendorQuotes.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Button onClick={handleMarkSent} className="w-full sm:w-auto">
                    <Send className="h-4 w-4 mr-2" /> Mark Quote Requests as Sent
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Use the "Send Request" buttons in the Vendors tab to email each vendor, then mark as sent here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Vendors & Quotes ──────────────────────────────────────── */}
        <TabsContent value="vendors">
          <div className="space-y-4">
            {isEditable && (
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setShowInviteVendor(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Invite Vendor
                </Button>
              </div>
            )}

            {q.vendorQuotes.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No vendors invited yet. Add vendors to request quotes from them.
                </CardContent>
              </Card>
            ) : (
              q.vendorQuotes.map(vq => {
                const vqCfg = {
                  invited:  { label: 'Invited',  color: 'bg-blue-50 text-blue-700 border-blue-200' },
                  quoted:   { label: 'Quoted',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200' },
                }[vq.status] ?? { label: vq.status, color: '' };

                return (
                  <Card key={vq.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{vq.supplierName}</p>
                            <Badge variant="outline" className={`text-xs ${vqCfg.color}`}>{vqCfg.label}</Badge>
                          </div>
                          {vq.supplierEmail && (
                            <p className="text-xs text-muted-foreground mt-0.5">{vq.supplierEmail}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Send quote request via mailto */}
                          {q.items.length > 0 && (
                            <a
                              href={buildMailtoRFQ(currentOrg.name, rfqRef, vq, q.items)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded border hover:bg-muted transition-colors"
                            >
                              <Mail className="h-3 w-3" /> Send Request
                            </a>
                          )}
                          {isEditable && vq.status === 'invited' && (
                            <button
                              onClick={() => handleRejectVendor(vq.id)}
                              className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {isEditable && (
                            <button
                              onClick={() => handleRemoveVendor(vq.id)}
                              className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quoted prices summary */}
                      {vq.quoteItems.length > 0 && (
                        <div className="mb-3 rounded-lg bg-muted/40 p-3 space-y-1.5">
                          {vq.quoteItems.map(qi => {
                            const item = q.items.find(i => i.id === qi.quotationItemId);
                            return (
                              <div key={qi.id} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{item?.itemName}</span>
                                <span className="font-semibold">
                                  {qi.unitPrice != null ? `₹${qi.unitPrice}` : '—'}
                                  {qi.leadTimeDays != null && <span className="text-muted-foreground ml-1">· {qi.leadTimeDays}d</span>}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Enter / update quote button */}
                      {vq.status !== 'rejected' && q.items.length > 0 && (
                        <Button
                          size="sm"
                          variant={vq.status === 'quoted' ? 'outline' : 'default'}
                          onClick={() => openQuoteEntry(vq.id)}
                          className="text-xs h-7"
                        >
                          {vq.status === 'quoted' ? 'Update Prices' : 'Enter Quoted Prices'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ── Tab 3: Compare ───────────────────────────────────────────────── */}
        <TabsContent value="compare">
          {quotedVendors.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No vendor quotes yet.</CardContent></Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Price Comparison</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Select the best vendor for each item. Cheapest price per item is highlighted in green.
                </p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-3 py-2 text-xs font-semibold border-b">Item</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold border-b">Qty</th>
                      {quotedVendors.map(vq => (
                        <th key={vq.id} className="text-center px-3 py-2 text-xs font-semibold border-b min-w-28">
                          {vq.supplierName}
                        </th>
                      ))}
                      <th className="text-center px-3 py-2 text-xs font-semibold border-b">Selected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.items.map(item => {
                      // Find min price for this item across vendors
                      const prices = quotedVendors.map(vq => ({
                        vq,
                        price: vq.quoteItems.find(x => x.quotationItemId === item.id)?.unitPrice ?? null,
                        lead: vq.quoteItems.find(x => x.quotationItemId === item.id)?.leadTimeDays ?? null,
                      }));
                      const validPrices = prices.filter(p => p.price !== null).map(p => p.price as number);
                      const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

                      return (
                        <tr key={item.id} className="border-b hover:bg-muted/30">
                          <td className="px-3 py-2.5 font-medium">{item.itemName}</td>
                          <td className="px-3 py-2.5 text-center text-muted-foreground">{item.qtyNeeded}</td>
                          {prices.map(({ vq, price, lead }) => {
                            const isBest = price !== null && price === minPrice;
                            return (
                              <td key={vq.id} className="px-3 py-2.5 text-center">
                                {price !== null ? (
                                  <span className={`inline-flex flex-col items-center gap-0.5 ${isBest ? 'text-emerald-700 font-bold' : ''}`}>
                                    <span>₹{price}</span>
                                    {lead !== null && <span className="text-xs text-muted-foreground font-normal">{lead}d</span>}
                                    {isBest && <span className="text-xs">✓ Best</span>}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2.5 text-center">
                            <Select
                              value={selections[item.id] ?? '__none__'}
                              onValueChange={v => setSelections(prev => ({ ...prev, [item.id]: v === '__none__' ? '' : v }))}
                            >
                              <SelectTrigger className="h-7 w-36 text-xs mx-auto">
                                <SelectValue placeholder="Pick vendor" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">— Skip —</SelectItem>
                                {prices.filter(p => p.price !== null).map(({ vq, price }) => (
                                  <SelectItem key={vq.id} value={vq.id}>
                                    {vq.supplierName} · ₹{price}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Summary */}
                <div className="mt-4 p-3 bg-muted/40 rounded-lg text-sm">
                  <p className="font-semibold mb-1">Selection Summary</p>
                  {Object.entries(selections).filter(([, vId]) => vId).map(([itemId, vqId]) => {
                    const item = q.items.find(i => i.id === itemId);
                    const vq = quotedVendors.find(v => v.id === vqId);
                    const price = vq?.quoteItems.find(x => x.quotationItemId === itemId)?.unitPrice;
                    if (!item || !vq) return null;
                    return (
                      <div key={itemId} className="flex justify-between text-xs py-0.5">
                        <span>{item.itemName} ×{item.qtyNeeded}</span>
                        <span className="text-muted-foreground">{vq.supplierName}{price != null ? ` — ₹${(price * item.qtyNeeded).toLocaleString('en-IN')}` : ''}</span>
                      </div>
                    );
                  })}
                  <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                    <span>Est. Total</span>
                    <span>
                      ₹{Object.entries(selections)
                        .filter(([, vId]) => vId)
                        .reduce((sum, [itemId, vqId]) => {
                          const item = q.items.find(i => i.id === itemId);
                          const vq = quotedVendors.find(v => v.id === vqId);
                          const price = vq?.quoteItems.find(x => x.quotationItemId === itemId)?.unitPrice ?? 0;
                          return sum + (price * (item?.qtyNeeded ?? 0));
                        }, 0)
                        .toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {q.status === 'comparing' && (
                  <Button className="mt-4" onClick={() => setShowGenerateForm(true)}
                    disabled={Object.values(selections).every(v => !v)}>
                    <ShoppingCart className="h-4 w-4 mr-2" /> Generate Purchase Orders
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab 4: Purchase Orders ───────────────────────────────────────── */}
        <TabsContent value="orders">
          {generatedPOs.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No POs generated yet.</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {generatedPOs.map(po => {
                const poCfg = PO_STATUS[po.status] ?? { label: po.status, color: 'bg-muted text-muted-foreground' };
                // Find vendor email from vendor quotes
                const vq = q.vendorQuotes.find(v => v.supplierName === po.supplier);
                const mailtoHref = `mailto:${vq?.supplierEmail ?? ''}?subject=${encodeURIComponent(`Purchase Order ${po.poNumber} | ${currentOrg.name}`)}&body=${encodeURIComponent(
                  `Dear ${po.supplier},\n\nPurchase Order: ${po.poNumber}\nDate: ${po.createdAt || ''}\n\nItems:\n${(po.lineItems ?? []).map((li, i) => `${i + 1}. ${li.itemName} × ${li.quantityOrdered} units @ ₹${li.unitPrice}`).join('\n')}\n\nTotal: ₹${po.amount.toLocaleString('en-IN')}${po.expectedDate ? `\nExpected Delivery: ${po.expectedDate}` : ''}\n\nPlease confirm receipt.\n\n${currentOrg.name}`
                )}`;

                return (
                  <Card key={po.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{po.poNumber}</code>
                            <Badge variant="outline" className={`text-xs ${poCfg.color}`}>{poCfg.label}</Badge>
                          </div>
                          <p className="font-semibold mt-1">{po.supplier}</p>
                          {vq?.supplierEmail && (
                            <p className="text-xs text-muted-foreground">{vq.supplierEmail}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">₹{po.amount.toLocaleString('en-IN')}</p>
                          {po.expectedDate && <p className="text-xs text-muted-foreground">Expected: {po.expectedDate}</p>}
                        </div>
                      </div>

                      <div className="mb-3 rounded-lg bg-muted/40 p-3 space-y-1">
                        {(po.lineItems ?? []).map(li => (
                          <div key={li.id} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{li.itemName} × {li.quantityOrdered}</span>
                            <span className="font-medium">@ ₹{li.unitPrice} = ₹{(li.unitPrice * li.quantityOrdered).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>

                      <a
                        href={mailtoHref}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5" /> Send PO Email to {po.supplier}
                      </a>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Item</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="flex gap-2">
              <Button size="sm" variant={useInventoryItem ? 'default' : 'outline'} onClick={() => setUseInventoryItem(true)} className="text-xs h-7">From Inventory</Button>
              <Button size="sm" variant={!useInventoryItem ? 'default' : 'outline'} onClick={() => setUseInventoryItem(false)} className="text-xs h-7">Free Text</Button>
            </div>
            {useInventoryItem ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Search Item</Label>
                <Input
                  placeholder="Type to search..."
                  value={addItemSearch}
                  onChange={e => setAddItemSearch(e.target.value)}
                  className="text-sm"
                />
                {addItemSearch && (
                  <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                    {filteredInventoryItems.slice(0, 8).map(item => (
                      <button
                        key={item.id}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
                        onClick={() => setAddItemSearch(item.id)}
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground ml-2">{item.sku}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">Item Name</Label>
                <Input
                  placeholder="e.g. A4 Paper Ream"
                  value={addItemFreeText}
                  onChange={e => setAddItemFreeText(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Quantity Needed</Label>
              <Input type="number" min={1} value={addItemQty} onChange={e => setAddItemQty(Number(e.target.value))} className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddItem(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddItem}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Vendor Dialog */}
      <Dialog open={showInviteVendor} onOpenChange={setShowInviteVendor}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Invite Vendor</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Select Supplier</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger><SelectValue placeholder="Choose a supplier…" /></SelectTrigger>
                <SelectContent>
                  {suppliers.filter(s => s.status === 'active').map(s => (
                    <SelectItem key={s.id} value={s.id} disabled={invitedVendorIds.has(s.id)}>
                      {s.name}{invitedVendorIds.has(s.id) ? ' (already invited)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedSupplierId && (
              <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                {(() => {
                  const s = suppliers.find(x => x.id === selectedSupplierId);
                  return s ? `${s.email || 'No email on file'} · ${s.phone || ''}` : '';
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowInviteVendor(false)}>Cancel</Button>
            <Button size="sm" onClick={handleInviteVendor} disabled={!selectedSupplierId}>Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enter Quote Prices Dialog */}
      <Dialog open={!!enteringQuoteFor} onOpenChange={v => { if (!v) setEnteringQuoteFor(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Enter Prices — {q.vendorQuotes.find(v => v.id === enteringQuoteFor)?.supplierName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-[1fr_100px_80px] gap-2 text-xs font-semibold text-muted-foreground px-1">
              <span>Item</span><span>Unit Price (₹)</span><span>Lead (days)</span>
            </div>
            {q.items.map(item => (
              <div key={item.id} className="grid grid-cols-[1fr_100px_80px] gap-2 items-center">
                <span className="text-sm truncate">{item.itemName}</span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={quoteEntryPrices[item.id]?.price ?? ''}
                  onChange={e => setQuoteEntryPrices(p => ({
                    ...p,
                    [item.id]: { ...p[item.id], price: e.target.value }
                  }))}
                  className="h-8 text-sm"
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="—"
                  value={quoteEntryPrices[item.id]?.leadDays ?? ''}
                  onChange={e => setQuoteEntryPrices(p => ({
                    ...p,
                    [item.id]: { ...p[item.id], leadDays: e.target.value }
                  }))}
                  className="h-8 text-sm"
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Leave price blank if vendor didn't quote that item.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEnteringQuoteFor(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmitQuote}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Save Quote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate POs Dialog */}
      <Dialog open={showGenerateForm} onOpenChange={setShowGenerateForm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Generate Purchase Orders</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-xs text-muted-foreground">
              This will create {new Set(Object.values(selections).filter(Boolean)).size} PO(s) — one per selected vendor.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Expected Delivery Date</Label>
              <Input type="date" value={genExpectedDate} onChange={e => setGenExpectedDate(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={genNotes} onChange={e => setGenNotes(e.target.value)} rows={2} className="text-sm" placeholder="Any delivery instructions…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowGenerateForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleGeneratePOs} disabled={generating}>
              {generating ? 'Generating…' : 'Generate POs'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
