import { useNavigate } from 'react-router-dom';
import { Building2, Sliders, FileText, CreditCard, BookOpen, ChevronRight, Activity, Gauge, Timer, AlertCircle } from 'lucide-react';
import * as Sentry from '@sentry/react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/hooks/use-toast';

export function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();

  const SETTINGS_ITEMS = [
    {
      path: '/settings/organization',
      icon: Building2,
      label: t('Organization'),
      description: t('Manage organization name, address, and contact information.'),
    },
    {
      path: '/settings/custom-fields',
      icon: Sliders,
      label: t('Custom Fields'),
      description: t('Define additional fields for inventory items and other entities.'),
    },
    {
      path: '/settings/document-templates',
      icon: FileText,
      label: t('Document Templates'),
      description: t('Configure receipt and document templates for your organization.'),
    },
    {
      path: '/settings/class-templates',
      icon: BookOpen,
      label: t('Class Material Templates'),
      description: t('Define item kits per class/group for one-click bulk issue.'),
    },
    {
      path: '/settings/subscription',
      icon: CreditCard,
      label: t('Subscription'),
      description: t('View your current plan and upgrade to access more features.'),
    },
  ];

  return (
    <div>
      <PageHeader title={t('Settings')} description={t('Manage your organization configuration')} />

      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
        {SETTINGS_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.path}
              className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
              onClick={() => navigate(item.path)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          );
        })}

        {/* GlitchTip Observability & Telemetry */}
        <Card className="sm:col-span-2 border border-emerald-500/30 bg-emerald-50/30 shadow-xs">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <Activity className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    <span>{t('GlitchTip Observability & Monitoring')}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {t('Connected')}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('Project: stockpilot-frontend (app.glitchtip.com/28791)')}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-emerald-300 text-emerald-800 hover:bg-emerald-100/60 text-xs"
                  onClick={() => {
                    Sentry.captureException(new Error(`Test GlitchTip Error [${new Date().toLocaleTimeString()}]`));
                    toast({
                      title: t('Test Issue Sent!'),
                      description: t('Check GlitchTip → Issues to see this exception.'),
                    });
                  }}
                >
                  <AlertCircle className="h-3.5 w-3.5 mr-1" />
                  {t('Test Issue')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-emerald-300 text-emerald-800 hover:bg-emerald-100/60 text-xs"
                  onClick={() => {
                    Sentry.startSpan({ name: 'StockPilot Settings Transaction', op: 'ui.interaction' }, (span) => {
                      span.setAttribute('test.category', 'observability');
                      span.setAttribute('page', 'settings');
                    });
                    toast({
                      title: t('Test Transaction Sent!'),
                      description: t('Check GlitchTip → Performance to see this transaction.'),
                    });
                  }}
                >
                  <Gauge className="h-3.5 w-3.5 mr-1" />
                  {t('Test Performance')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-emerald-300 text-emerald-800 hover:bg-emerald-100/60 text-xs"
                  onClick={() => {
                    const msg = `StockPilot Telemetry Log [${new Date().toLocaleTimeString()}]`;
                    console.info(msg);
                    Sentry.logger.info(msg, { module: 'Settings', triggeredBy: 'User' });
                    toast({
                      title: t('Test Log Sent!'),
                      description: t('Check GlitchTip → Logs to see this entry.'),
                    });
                  }}
                >
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  {t('Test Log')}
                </Button>
              </div>
            </div>

            <div className="pt-2 border-t border-emerald-500/20 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-white/70 p-2 rounded border border-emerald-100">
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-emerald-600" /> {t('Issues')}
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t('Errors & crashes sent automatically via SDK.')}</p>
              </div>
              <div className="bg-white/70 p-2 rounded border border-emerald-100">
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Gauge className="h-3 w-3 text-emerald-600" /> {t('Performance')}
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t('Page loads & route navigation (100% sample rate enabled).')}</p>
              </div>
              <div className="bg-white/70 p-2 rounded border border-emerald-100">
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Timer className="h-3 w-3 text-emerald-600" /> {t('Uptime Monitors')}
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t('Configured in GlitchTip UI (Add Monitor → enter your app URL).')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
