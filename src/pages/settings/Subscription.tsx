import { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Check, Zap, Users, Package, Boxes, Tag, Receipt, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/context/OrganizationContext';
import { subscriptionService } from '@/services';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import type { Subscription } from '@/types';

interface UsageData {
  limits: { max_users: number; max_items: number; max_modules: number };
  usage: { users: number; items: number; modules: number };
}

function UsageBar({ label, icon: Icon, used, max, t }: { label: string; icon: typeof Users; used: number; max: number; t: (key: string, vars?: Record<string, string | number>) => string }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const isNearLimit = pct >= 80;
  const isAtLimit = pct >= 100;
  const barColor = isAtLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : '#10b981';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </span>
        <span className="font-semibold">
          {used} <span className="text-muted-foreground font-normal">/ {max}</span>
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      {isAtLimit && (
        <p className="text-xs text-destructive font-medium">{t('Limit reached — upgrade to add more')}</p>
      )}
      {isNearLimit && !isAtLimit && (
        <p className="text-xs text-amber-600 font-medium">{t('Approaching limit') + ' (' + pct + '% ' + t('used') + ')'}</p>
      )}
    </div>
  );
}

export function SubscriptionPage() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [plans, setPlans] = useState<Subscription[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [invoices, setInvoices] = useState<{ id: string; plan: string; baseAmount: number; discountCode?: string; discountAmount: number; finalAmount: number; status: string; billingPeriod: string; dueDate: string; paidDate?: string }[]>([]);
  const [paying, setPaying] = useState('');

  useEffect(() => {
    subscriptionService.getPlans().then(setPlans);
    if (currentOrg) {
      subscriptionService.getCurrent(currentOrg.id).then((p) => setCurrentPlan(p ?? null));
      subscriptionService.getUsage().then(setUsage);
      subscriptionService.getInvoices().then(setInvoices);
    }
  }, [currentOrg]);

  const handleUpgrade = (tier: string) => {
    toast({ title: t('Contact sales to upgrade to') + ' ' + tier });
  };

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim() || !currentOrg) return;
    setRedeeming(true);
    try {
      const data = await api.post<{ applied: boolean; code: string; discountType: string; discountValue: number }>('/subscriptions/redeem-coupon', { code: couponCode });
      toast({ title: t('Coupon applied!'), description: `${data.discountType === 'percent' ? data.discountValue + '%' : '\u20B9' + data.discountValue} ${t('discount applied')}` });
      setCouponCode('');
    } catch (err: unknown) {
      toast({ title: t('Invalid coupon'), description: err instanceof Error ? err.message : t('Failed'), variant: 'destructive' });
    } finally { setRedeeming(false); }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    setPaying(invoiceId);
    try {
      await subscriptionService.payInvoice(invoiceId);
      setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, status: 'paid', paidDate: new Date().toISOString() } : i));
      toast({ title: t('Payment successful'), description: t('Invoice marked as paid') });
    } catch (err: unknown) {
      toast({ title: t('Payment failed'), description: err instanceof Error ? err.message : t('Error'), variant: 'destructive' });
    } finally { setPaying(''); }
  };

  if (!currentOrg) return null;

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate('/settings')} className="-ml-2 mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('Back to Settings')}
      </Button>
      <PageHeader
        title={t('Subscription')}
        description={t('Manage your plan and billing')}
      />

      {/* Current plan summary */}
      {currentPlan && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('Current Plan')}</p>
                  <p className="font-bold text-lg">{currentPlan.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{'\u20B9'}{currentPlan.price.toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground">{t('per') + ' ' + currentPlan.pricePeriod}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage bars */}
      {usage && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('Plan Usage')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageBar label={t('Users')} icon={Users} used={usage.usage.users} max={usage.limits.max_users} t={t} />
            <UsageBar label={t('Inventory Items')} icon={Package} used={usage.usage.items} max={usage.limits.max_items} t={t} />
            <UsageBar label={t('Modules')} icon={Boxes} used={usage.usage.modules} max={usage.limits.max_modules} t={t} />
          </CardContent>
        </Card>
      )}

      {/* Coupon redemption */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4" /> {t('Have a coupon?')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder={t('Enter coupon code')}
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="max-w-xs font-mono"
            />
            <Button onClick={handleRedeemCoupon} disabled={redeeming || !couponCode.trim()}>
              {redeeming ? t('Applying...') : t('Apply')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.tier === currentOrg.plan;
          return (
            <Card
              key={plan.tier}
              className={`relative ${isCurrent ? 'border-primary shadow-sm' : ''}`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground text-xs px-2.5">{t('Current Plan')}</Badge>
                </div>
              )}
              <CardHeader className="pb-3 pt-6">
                <CardTitle className="text-base">{plan.name}</CardTitle>
                <div className="mt-1">
                  <span className="text-3xl font-bold">{'\u20B9'}{plan.price.toLocaleString('en-IN')}</span>
                  <span className="text-muted-foreground text-sm ml-1">/ {plan.pricePeriod}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    {t('Current Plan')}
                  </Button>
                ) : plan.tier === 'enterprise' ? (
                  <Button variant="outline" className="w-full" onClick={() => handleUpgrade(plan.name)}>
                    {t('Contact Sales')}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.tier === 'professional' ? 'default' : 'outline'}
                    onClick={() => handleUpgrade(plan.name)}
                  >
                    <Zap className="h-3.5 w-3.5 mr-1.5" />
                    {t('Upgrade to') + ' ' + plan.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Invoices */}
      {invoices.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" /> {t('Billing History')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {inv.status === 'paid' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    ) : inv.status === 'overdue' ? (
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                    ) : (
                      <Clock className="h-5 w-5 text-amber-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{inv.billingPeriod} — <span className="capitalize">{inv.plan}</span></p>
                      <p className="text-xs text-muted-foreground">
                        {'\u20B9'}{inv.baseAmount.toLocaleString('en-IN')}
                        {inv.discountAmount > 0 && (
                          <span className="text-emerald-600"> − {'\u20B9'}{inv.discountAmount.toLocaleString('en-IN')} ({inv.discountCode})</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold">{'\u20B9'}{inv.finalAmount.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-muted-foreground">{t('Due')} {inv.dueDate?.slice(0, 10)}</p>
                    </div>
                    {inv.status === 'paid' ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{t('Paid')}</Badge>
                    ) : inv.status === 'overdue' ? (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{t('Overdue')}</Badge>
                    ) : (
                      <Button size="sm" onClick={() => handlePayInvoice(inv.id)} disabled={paying === inv.id}>
                        {paying === inv.id ? t('Paying...') : t('Pay Now')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="mt-6 text-xs text-muted-foreground text-center">
        {t('All plans include a 14-day free trial. No credit card required to start. For enterprise pricing and custom requirements, contact our sales team.')}
      </p>
    </div>
  );
}
