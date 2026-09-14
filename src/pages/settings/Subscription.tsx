import { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Check, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/context/OrganizationContext';
import { subscriptionService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Subscription } from '@/types';

export function SubscriptionPage() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Subscription[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Subscription | null>(null);

  useEffect(() => {
    subscriptionService.getPlans().then(setPlans);
    if (currentOrg) {
      subscriptionService.getCurrent(currentOrg.id).then((p) => setCurrentPlan(p ?? null));
    }
  }, [currentOrg]);

  const handleUpgrade = (tier: string) => {
    toast({ title: `Contact sales to upgrade to ${tier}` });
  };

  if (!currentOrg) return null;

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate('/settings')} className="-ml-2 mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Settings
      </Button>
      <PageHeader
        title="Subscription"
        description="Manage your plan and billing"
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
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="font-bold text-lg">{currentPlan.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">₹{currentPlan.price.toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground">per {currentPlan.pricePeriod}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <Badge className="bg-primary text-primary-foreground text-xs px-2.5">Current Plan</Badge>
                </div>
              )}
              <CardHeader className="pb-3 pt-6">
                <CardTitle className="text-base">{plan.name}</CardTitle>
                <div className="mt-1">
                  <span className="text-3xl font-bold">₹{plan.price.toLocaleString('en-IN')}</span>
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
                    Current Plan
                  </Button>
                ) : plan.tier === 'enterprise' ? (
                  <Button variant="outline" className="w-full" onClick={() => handleUpgrade(plan.name)}>
                    Contact Sales
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.tier === 'professional' ? 'default' : 'outline'}
                    onClick={() => handleUpgrade(plan.name)}
                  >
                    <Zap className="h-3.5 w-3.5 mr-1.5" />
                    Upgrade to {plan.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        All plans include a 14-day free trial. No credit card required to start.
        For enterprise pricing and custom requirements, contact our sales team.
      </p>
    </div>
  );
}
