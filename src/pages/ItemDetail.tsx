import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Package, MapPin, Calendar, TrendingUp } from 'lucide-react';
import { inventoryService, transactionService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { getModuleDef } from '@/data/modules';
import type { Item, StockTransaction } from '@/types';

const TRANSACTION_LABELS: Record<string, string> = {
  received: 'Received', issued: 'Issued', returned: 'Returned', adjusted: 'Adjusted', damaged: 'Damaged', transferred: 'Transferred',
};

export function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);

  useEffect(() => {
    if (!id) return;
    inventoryService.getById(id).then((i) => setItem(i || null));
    transactionService.getByItem(id).then(setTransactions);
  }, [id]);

  if (!item) return <div className="p-8 text-muted-foreground">Loading...</div>;

  const moduleDef = item.module !== 'general' ? getModuleDef(item.module) : null;

  // Build module-specific attributes
  const moduleAttributes: { label: string; value: string }[] = [];
  if (item.uniform) {
    moduleAttributes.push(
      { label: 'Class', value: item.uniform.classGrade },
      { label: 'Gender', value: item.uniform.gender },
      { label: 'Size', value: item.uniform.size },
      { label: 'Academic Year', value: item.uniform.academicYear },
      { label: 'Uniform Type', value: item.uniform.uniformType },
    );
  }
  if (item.book) {
    moduleAttributes.push(
      { label: 'ISBN', value: item.book.isbn },
      { label: 'Subject', value: item.book.subject },
      { label: 'Class', value: item.book.classGrade },
      { label: 'Academic Year', value: item.book.academicYear },
      { label: 'Edition', value: item.book.edition },
      { label: 'Publisher', value: item.book.publisher },
    );
  }
  if (item.medicine) {
    moduleAttributes.push(
      { label: 'Generic Name', value: item.medicine.genericName },
      { label: 'Manufacturer', value: item.medicine.manufacturer },
      { label: 'Batch Number', value: item.medicine.batchNumber },
      { label: 'Expiry Date', value: item.medicine.expiryDate },
      { label: 'Manufacturing Date', value: item.medicine.manufacturingDate },
      { label: 'MRP', value: `₹${item.medicine.mrp}` },
      { label: 'Purchase Price', value: `₹${item.medicine.purchasePrice}` },
      { label: 'Prescription Required', value: item.medicine.prescriptionRequired ? 'Yes' : 'No' },
    );
  }

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Inventory
      </Button>

      <PageHeader title={item.name} description={`SKU: ${item.sku}`} />

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Stock Summary */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="text-2xl font-bold mt-1">{item.quantity}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{item.available}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Reserved</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{item.reserved}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-2"><StatusBadge status={item.status} /></div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          {item.module === 'uniforms' && <TabsTrigger value="issue-history">Issue History</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Item Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={Package} label="Category" value={item.categoryName} />
                {moduleDef && <InfoRow icon={Package} label="Module" value={moduleDef.name} />}
                <InfoRow icon={MapPin} label="Location" value={item.location} />
                <InfoRow icon={Calendar} label="Last Updated" value={item.lastUpdated} />
              </CardContent>
            </Card>

            {moduleAttributes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {moduleDef?.name.replace(' Management', '') || 'Module'} Attributes
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
                  <CardTitle className="text-base">Custom Fields</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(item.attributes).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center py-1.5 border-b last:border-0">
                      <span className="text-sm text-muted-foreground">{key}</span>
                      <span className="text-sm font-medium">{typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}</span>
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
              <CardTitle className="text-base">Stock Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Total Quantity</span>
                    <span className="font-medium">{item.quantity} units</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Available</span>
                    <span className="font-medium text-emerald-600">{item.available} units</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.quantity > 0 ? (item.available / item.quantity) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Reserved</span>
                    <span className="font-medium text-amber-600">{item.reserved} units</span>
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
              <CardTitle className="text-base">Stock Transaction Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No transactions recorded for this item.</p>
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
                            {tx.quantity > 0 ? '+' : ''}{tx.quantity} {TRANSACTION_LABELS[tx.type] || tx.type}
                          </p>
                          <span className="text-xs text-muted-foreground">{tx.date}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          by {tx.user} · {tx.reference}
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
                <CardTitle className="text-base">Issue History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Status</TableHead>
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
