import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Phone, Mail, MapPin } from 'lucide-react';
import { supplierService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Supplier } from '@/types';

export function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    if (!id) return;
    supplierService.getById(id).then((s) => setSupplier(s || null));
  }, [id]);

  if (!supplier) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {supplier === null ? 'Supplier not found.' : 'Loading...'}
      </div>
    );
  }

  const totalPurchased = supplier.purchaseHistory.reduce((a, p) => a + p.amount, 0);

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 mb-3">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Suppliers
        </Button>
        <PageHeader
          title={supplier.name}
          description={`${supplier.itemsSupplied} · ${supplier.contactPerson}`}
          actions={<StatusBadge status={supplier.status} />}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Contact info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="h-5 w-5 mt-0.5 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-muted-foreground">CP</span>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Contact Person</p>
                <p className="font-medium">{supplier.contactPerson}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-muted-foreground text-xs">Phone</p>
                <p className="font-medium">{supplier.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium">{supplier.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-muted-foreground text-xs">Address</p>
                <p className="font-medium leading-relaxed">{supplier.address}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Items Supplied', value: supplier.itemsSupplied },
                { label: 'Total Purchases', value: `₹${totalPurchased.toLocaleString('en-IN')}` },
                { label: 'Outstanding Orders', value: supplier.outstandingOrders.length },
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

      <Tabs defaultValue="purchases">
        <TabsList className="mb-4">
          <TabsTrigger value="purchases">Purchase History ({supplier.purchaseHistory.length})</TabsTrigger>
          <TabsTrigger value="orders">Outstanding Orders ({supplier.outstandingOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases">
          <Card>
            <CardContent className="p-0">
              {supplier.purchaseHistory.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No purchase history</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplier.purchaseHistory.map((ph, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-muted-foreground text-sm">{ph.date}</TableCell>
                        <TableCell className="font-medium">{ph.item}</TableCell>
                        <TableCell className="text-right">{ph.quantity}</TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{ph.amount.toLocaleString('en-IN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardContent className="p-0">
              {supplier.outstandingOrders.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No outstanding orders</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Expected Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplier.outstandingOrders.map((order, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{order.item}</TableCell>
                        <TableCell className="text-right">{order.quantity}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{order.expectedDate}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              order.status === 'Shipped'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
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
