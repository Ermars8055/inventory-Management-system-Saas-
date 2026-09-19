import { useState, useEffect } from 'react';
import { QrCode, Search, Package, ArrowLeftRight, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/context/OrganizationContext';
import { inventoryService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';
import type { Item } from '@/types';

export function BarcodePage() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState('');
  const [scannedItem, setScannedItem] = useState<Item | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    inventoryService.getByOrganization(currentOrg.id).then(setItems);
  }, [currentOrg]);

  const handleScan = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const found = items.find(
      (i) => i.sku.toLowerCase() === q || i.name.toLowerCase().includes(q)
    );
    if (found) {
      setScannedItem(found);
      setNotFound(false);
    } else {
      setScannedItem(null);
      setNotFound(true);
    }
  };

  if (!currentOrg) return null;

  const filteredItems = query
    ? items.filter(
        (i) =>
          i.sku.toLowerCase().includes(query.toLowerCase()) ||
          i.name.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  return (
    <div>
      <PageHeader
        title={t("Barcode & QR Scanner")}
        description={t("Look up inventory items by SKU or barcode")}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Scanner panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="h-4 w-4 text-muted-foreground" />
                {t('Scan / Lookup')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={t("Enter SKU or scan barcode...")}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setScannedItem(null);
                    setNotFound(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                />
              </div>
              <Button className="w-full" onClick={handleScan} disabled={!query.trim()}>
                <QrCode className="h-4 w-4 mr-2" />
                {t('Lookup Item')}
              </Button>

              {/* Result */}
              {scannedItem && (
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{scannedItem.name}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{scannedItem.sku}</p>
                    </div>
                    <StatusBadge status={scannedItem.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">{t('Category')}</p>
                      <p className="font-medium">{scannedItem.categoryName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('Available')}</p>
                      <p className="font-semibold text-emerald-600">{scannedItem.available}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('Location')}</p>
                      <p className="font-medium">{scannedItem.location}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('Total Stock')}</p>
                      <p className="font-medium">{scannedItem.quantity}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => navigate(`/inventory/${scannedItem.id}`)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      {t('Details')}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => navigate('/transactions')}
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />
                      {t('Transact')}
                    </Button>
                  </div>
                </div>
              )}

              {notFound && (
                <div className="border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                  {t('No item found for')} <span className="font-mono font-medium">"{query}"</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground text-sm">{t('How to use')}</p>
              <p>{t('Type a SKU code (e.g.')} <span className="font-mono">UNI-SH-001</span>{t(') and press Enter or click Lookup.')}</p>
              <p>{t('In a real deployment, a connected barcode scanner would auto-fill this field on scan.')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Item list */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t('Inventory Items')}
                <span className="text-muted-foreground font-normal text-sm ml-2">({filteredItems.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Item')}</TableHead>
                    <TableHead>{t('SKU / Barcode')}</TableHead>
                    <TableHead>{t('Category')}</TableHead>
                    <TableHead className="text-right">{t('Available')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium text-sm">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          {item.sku}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.categoryName}</TableCell>
                      <TableCell className="text-right font-semibold text-sm">{item.available}</TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/inventory/${item.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                        {t('No items found')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
