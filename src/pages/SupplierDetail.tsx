import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Phone, Mail, MapPin, ShoppingCart } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { supplierService, procurementService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Supplier, PurchaseOrder, POStatus } from '@/types';

const STATUS_CONFIG: Record<POStatus, { label: string; className: string }> = {
  draft:               { label: 'Draft',              className: 'bg-muted text-muted-foreground' },
  pending:             { label: 'Pending Approval',   className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved:            { label: 'Approved',           className: 'bg-blue-50 text-blue-700 border-blue-200' },
  ordered:             { label: 'Ordered',            className: 'bg-purple-50 text-purple-700 border-purple-200' },
  partially_received:  { label: 'Part. Received',     className: 'bg-orange-50 text-orange-700 border-orange-200' },
  received:            { label: 'Received',           className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:           { label: 'Cancelled',          className: 'bg-red-50 text-red-700 border-red-200' },
};

export function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    if (!id) return;
    supplierService.getById(id).then((s) => setSupplier(s || null));
  }, [id]);

  useEffect(() => {
    if (!currentOrg || !id) return;
    procurementService.getByOrganization(currentOrg.id).then((all) =>
      setOrders(all.filter((po) => po.supplierId === id)),
    );
  }, [currentOrg, id]);

  if (supplier === null) {
    return <div className="p-8 text-center text-muted-foreground">Supplier not found.</div>;
  }
  if (!supplier) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }

  const totalSpend = orders
    .filter((po) => po.status === 'received' || po.status === 'partially_received')
    .reduce((a, po) => a + po.amount, 0);
  const pendingOrders = orders.filter((po) => po.status === 'ordered' || po.status === 'partially_received' || po.status === 'approved');

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 mb-3">
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Suppliers
        </Button>
        <PageHeader
          title={supplier.name}
          description={`${supplier.itemsSupplied || 'General Supplier'} · ${supplier.contactPerson || ''}`}
          actions={<StatusBadge status={supplier.status} />}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {supplier.contactPerson && (
              <div className="flex items-start gap-2">
                <span className="text-xs font-semibold text-muted-foreground mt-0.5 w-5 shrink-0">CP</span>
                <div>
                  <p className="text-muted-foreground text-xs">Contact Person</p>
                  <p className="font-medium">{supplier.contactPerson}</p>
                </div>
              </div>
            )}
            {supplier.phone && (
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <p className="font-medium">{supplier.phone}</p>
                </div>
              </div>
            )}
            {supplier.email && (
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-muted-foreground text-xs">Email</p>
                  <p className="font-medium">{supplier.email}</p>
                </div>
              </div>
            )}
            {supplier.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-muted-foreground text-xs">Address</p>
                  <p className="font-medium leading-relaxed">{supplier.address}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Orders', value: orders.length },
                { label: 'Total Spend', value: `₹${totalSpend.toLocaleString('en-IN')}` },
                { label: 'Pending Orders', value: pendingOrders.length },
              ].map((stat) => (
                <div key={stat.label} className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold mt-1">{stat.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {supplier.attributes && Object.keys(supplier.attributes).length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Custom Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
              {Object.entries(supplier.attributes).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center py-1.5 border-b last:border-0">
                  <span className="text-sm text-muted-foreground">{key}</span>
                  <span className="text-sm font-medium">{typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="orders">
        <TabsList className="mb-4">
          <TabsTrigger value="orders">
            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
            Purchase Orders ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardContent className="p-0">
              {orders.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No purchase orders for this supplier yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((po) => {
                      const cfg = STATUS_CONFIG[po.status] ?? STATUS_CONFIG.draft;
                      return (
                        <TableRow key={po.id}>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{po.poNumber}</code>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{po.orderedDate || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{po.expectedDate || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                            {po.lineItems && po.lineItems.length > 0
                              ? `${po.lineItems.length} item${po.lineItems.length !== 1 ? 's' : ''}`
                              : po.itemsDesc || '—'}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm">
                            ₹{po.amount.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${cfg.className}`}>
                              {cfg.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              {pendingOrders.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No pending orders.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Expected By</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingOrders.map((po) => {
                      const cfg = STATUS_CONFIG[po.status] ?? STATUS_CONFIG.draft;
                      return (
                        <TableRow key={po.id}>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{po.poNumber}</code>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {po.itemsDesc || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{po.expectedDate || '—'}</TableCell>
                          <TableCell className="text-right font-semibold text-sm">
                            ₹{po.amount.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${cfg.className}`}>
                              {cfg.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
