import { useState, useEffect } from 'react';
import { CalendarClock, AlertTriangle, XOctagon, CheckCircle2 } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { batchService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Batch } from '@/types';

function BatchCard({ batch, variant }: { batch: Batch; variant: 'expired' | 'warning' | 'active' }) {
  const styles = {
    expired: {
      wrap: 'bg-red-50 border-red-200',
      badge: 'bg-red-100 text-red-700 border-red-200',
      badgeLabel: 'Expired',
    },
    warning: {
      wrap: 'bg-amber-50 border-amber-200',
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
      badgeLabel: 'Expiring Soon',
    },
    active: {
      wrap: 'bg-background border-border',
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      badgeLabel: 'Active',
    },
  };
  const s = styles[variant];

  return (
    <div className={`p-3 rounded-lg border ${s.wrap} flex items-start justify-between gap-3`}>
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{batch.medicineName}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Batch: {batch.batchNumber}
        </p>
        <p className="text-xs text-muted-foreground">
          Qty: {batch.quantity}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-medium">Expires</p>
        <p className="text-xs font-semibold mt-0.5">{batch.expiryDate}</p>
        <Badge variant="outline" className={`text-xs mt-1.5 ${s.badge}`}>
          {s.badgeLabel}
        </Badge>
      </div>
    </div>
  );
}

export function ExpiryTrackingPage() {
  const { currentOrg } = useOrganization();
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    if (!currentOrg) return;
    batchService.getByOrganization(currentOrg.id).then(setBatches);
  }, [currentOrg]);

  const expired = batches.filter((b) => b.status === 'expired');
  const expiringSoon = batches.filter((b) => b.status === 'expiring_soon');
  const active = batches.filter((b) => b.status === 'active');

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader
        title="Expiry Tracking"
        description="Monitor medicine batches by expiry status"
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Expired */}
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <div className="h-7 w-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <XOctagon className="h-4 w-4 text-red-600" />
              </div>
              <span className="text-red-700">Expired</span>
              <Badge
                variant="outline"
                className="ml-auto bg-red-100 text-red-700 border-red-200 text-xs"
              >
                {expired.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {expired.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                No expired batches
              </div>
            ) : (
              expired.map((b) => <BatchCard key={b.id} batch={b} variant="expired" />)
            )}
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-amber-700">Expiring Soon</span>
              <Badge
                variant="outline"
                className="ml-auto bg-amber-100 text-amber-700 border-amber-200 text-xs"
              >
                {expiringSoon.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {expiringSoon.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                No batches expiring soon
              </div>
            ) : (
              expiringSoon.map((b) => <BatchCard key={b.id} batch={b} variant="warning" />)
            )}
          </CardContent>
        </Card>

        {/* Active */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <CalendarClock className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-emerald-700">Active Batches</span>
              <Badge
                variant="outline"
                className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 text-xs"
              >
                {active.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {active.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No active batches</div>
            ) : (
              active.map((b) => <BatchCard key={b.id} batch={b} variant="active" />)
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
