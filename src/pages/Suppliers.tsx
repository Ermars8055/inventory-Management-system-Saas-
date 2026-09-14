import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Truck, Mail, Phone, MapPin } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { supplierService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Supplier } from '@/types';

export function SuppliersPage() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!currentOrg) return;
    supplierService.getByOrganization(currentOrg.id).then(setSuppliers);
  }, [currentOrg]);

  const filtered = suppliers.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.itemsSupplied.toLowerCase().includes(search.toLowerCase()),
  );

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description={`${suppliers.length} suppliers`}
        actions={<Button><Plus className="h-4 w-4 mr-1" />Add Supplier</Button>}
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={Truck} title="No suppliers found" description="Add a supplier to start tracking purchases." />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((supplier) => (
            <Card
              key={supplier.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/suppliers/${supplier.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{supplier.name}</p>
                      <p className="text-xs text-muted-foreground">{supplier.itemsSupplied}</p>
                    </div>
                  </div>
                  <StatusBadge status={supplier.status} />
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{supplier.email}</p>
                  <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{supplier.phone}</p>
                  <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{supplier.address}</p>
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                  <span className="text-muted-foreground">Contact</span>
                  <span className="font-medium">{supplier.contactPerson}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
