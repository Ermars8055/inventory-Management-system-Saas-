import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, ChevronRight, Check,
  Package, Truck, BarChart3, Shirt, BookOpen, UserCheck, Pill, Layers,
  CalendarClock, QrCode, Briefcase, ShoppingCart, Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { organizationService } from '@/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MODULE_DEFINITIONS, INDUSTRY_RECOMMENDATIONS, INDUSTRY_LABELS } from '@/data/modules';
import { useToast } from '@/hooks/use-toast';
import type { Industry, ModuleId } from '@/types';

const ICON_MAP: Record<string, LucideIcon> = {
  Package, Truck, BarChart3, Shirt, BookOpen, UserCheck, Pill, Layers,
  CalendarClock, QrCode, Briefcase, ShoppingCart, Wrench,
};

const INDUSTRIES: Industry[] = ['school', 'pharmacy', 'retail', 'office', 'warehouse', 'other'];

const STEPS = ['Organization Details', 'Select Modules', 'Finish Setup'];

export function CreateOrganizationPage() {
  const navigate = useNavigate();
  const { refreshOrganizations, setCurrentOrgId } = useOrganization();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState<Industry | ''>('');
  const [selectedModules, setSelectedModules] = useState<ModuleId[]>([]);
  const [saving, setSaving] = useState(false);

  const handleIndustryChange = (val: Industry) => {
    setIndustry(val);
    setSelectedModules(INDUSTRY_RECOMMENDATIONS[val] ?? ['inventory', 'suppliers', 'reports']);
  };

  const toggleModule = (moduleId: ModuleId, isCore: boolean) => {
    if (isCore) return;
    setSelectedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((m) => m !== moduleId) : [...prev, moduleId]
    );
  };

  const handleCreate = async () => {
    if (!name || !industry) return;
    setSaving(true);
    try {
      const org = await organizationService.create({ name, industry, enabledModules: selectedModules });
      await refreshOrganizations();
      setCurrentOrgId(org.id);
      toast({ title: `${org.name} created successfully` });
      navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, idx) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                idx < step
                  ? 'bg-primary text-primary-foreground'
                  : idx === step
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {idx < step ? <Check className="h-3.5 w-3.5" /> : idx + 1}
            </div>
            <span className={`text-sm font-medium ${idx === step ? '' : 'text-muted-foreground'}`}>
              {label}
            </span>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Org details */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input
                placeholder="e.g. ABC International School"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={industry} onValueChange={(v) => handleIndustryChange(v as Industry)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry..." />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>{INDUSTRY_LABELS[ind]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2 flex justify-end">
              <Button
                onClick={() => setStep(1)}
                disabled={!name.trim() || !industry}
              >
                Next: Select Modules
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Modules */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Modules</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Pre-selected based on your industry. Toggle to customize.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-6">
              {MODULE_DEFINITIONS.map((mod) => {
                const Icon = ICON_MAP[mod.icon] ?? Package;
                const enabled = selectedModules.includes(mod.id);
                const isCore = mod.core;
                return (
                  <button
                    key={mod.id}
                    onClick={() => toggleModule(mod.id, isCore)}
                    disabled={isCore}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      enabled
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border bg-background hover:bg-muted/50'
                    } ${isCore ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Icon className={`h-4 w-4 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{mod.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{mod.description}</p>
                    </div>
                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      enabled ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                    }`}>
                      {enabled && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => setStep(2)}>
                Next: Finish Setup
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Finish */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Finish Setup</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Review and create your organization.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Organization</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Industry</span>
                <span className="font-medium">{industry ? INDUSTRY_LABELS[industry] : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">Starter (free trial)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modules enabled</span>
                <span className="font-medium">{selectedModules.length}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Enabled Modules</p>
              <div className="flex flex-wrap gap-2">
                {selectedModules.map((modId) => {
                  const def = MODULE_DEFINITIONS.find((m) => m.id === modId);
                  return def ? (
                    <span key={modId} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {def.name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating...' : 'Create Organization'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
