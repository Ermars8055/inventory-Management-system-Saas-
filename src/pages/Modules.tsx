import { useState, useEffect } from 'react';
import {
  Package, Truck, BarChart3, Shirt, BookOpen, UserCheck, Pill, Layers,
  CalendarClock, QrCode, Briefcase, ShoppingCart, Wrench, Users,
  type LucideIcon,
} from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MODULE_DEFINITIONS } from '@/data/modules';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import type { ModuleId } from '@/types';

const ICON_MAP: Record<string, LucideIcon> = {
  Package, Truck, BarChart3, Shirt, BookOpen, UserCheck, Pill, Layers,
  CalendarClock, QrCode, Briefcase, ShoppingCart, Wrench, Users,
};

export function ModulesPage() {
  const { currentOrg, updateModules, isModuleEnabled } = useOrganization();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [pending, setPending] = useState<ModuleId[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      setPending([...currentOrg.enabledModules]);
      setDirty(false);
    }
  }, [currentOrg]);

  const toggle = (moduleId: ModuleId, isCore: boolean) => {
    if (isCore) return;
    setPending((prev) => {
      const next = prev.includes(moduleId)
        ? prev.filter((m) => m !== moduleId)
        : [...prev, moduleId];
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    await updateModules(pending);
    setDirty(false);
    toast({ title: t('Module configuration saved') });
  };

  const handleDiscard = () => {
    if (currentOrg) {
      setPending([...currentOrg.enabledModules]);
      setDirty(false);
    }
  };

  if (!currentOrg) return null;

  const coreModules = MODULE_DEFINITIONS.filter((m) => m.core);
  const optionalModules = MODULE_DEFINITIONS.filter((m) => !m.core);

  return (
    <div>
      <PageHeader
        title={t("Modules")}
        description={t("Enable or disable modules for this organization")}
        actions={
          dirty ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDiscard}>{t('Discard')}</Button>
              <Button size="sm" onClick={handleSave}>{t('Save Changes')}</Button>
            </div>
          ) : undefined
        }
      />

      <div className="space-y-6">
        {/* Core modules */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t('Core Modules')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coreModules.map((mod) => {
              const Icon = ICON_MAP[mod.icon] ?? Package;
              return (
                <Card key={mod.id} className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{mod.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{mod.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs bg-primary/10 text-primary border-primary/20">
                        {t('Core')}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {t('Always enabled')}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Optional modules */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t('Optional Modules')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {optionalModules.map((mod) => {
              const Icon = ICON_MAP[mod.icon] ?? Package;
              const enabled = pending.includes(mod.id);
              return (
                <Card
                  key={mod.id}
                  className={`transition-colors ${enabled ? 'border-primary/30' : 'opacity-80'}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                          <Icon className={`h-5 w-5 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{mod.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{mod.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => toggle(mod.id, mod.core)}
                        className="shrink-0"
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`text-xs font-medium ${enabled ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {enabled ? t('Enabled') : t('Disabled')}
                      </span>
                      {enabled && mod.configurable && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                          {t('Configure')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
