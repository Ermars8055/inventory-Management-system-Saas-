import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Building2, SlidersHorizontal, Globe, Upload, ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/context/OrganizationContext';
import { useOrgConfig } from '@/hooks/useOrgConfig';
import { organizationService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { INDUSTRY_LABELS } from '@/data/modules';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LANGUAGES, CURRENCIES, TIMEZONES } from '@/i18n';
import type { OrgConfig } from '@/types';

export function OrganizationSettingsPage() {
  const { currentOrg, refreshOrganizations, updateConfig } = useOrganization();
  const config = useOrgConfig();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  const [cfg, setCfg] = useState<OrgConfig>(config);
  const [savingCfg, setSavingCfg] = useState(false);
  const justSaved = useRef(false);

  useEffect(() => {
    if (!currentOrg) return;
    // Skip resetting after we just saved — the cfg state already has the right values
    if (justSaved.current) {
      justSaved.current = false;
      return;
    }
    setForm({ name: currentOrg.name, email: currentOrg.email ?? '', phone: currentOrg.phone ?? '', address: currentOrg.address ?? '' });
    const stored = currentOrg.config || {};
    setCfg({ ...config, ...stored } as OrgConfig);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg]);

  const handleSave = async () => {
    if (!currentOrg) return;
    setSaving(true);
    await organizationService.update({ id: currentOrg.id, ...form });
    await refreshOrganizations();
    setSaving(false);
    toast({ title: 'Organization profile saved' });
  };

  const handleSaveConfig = async () => {
    if (!currentOrg) return;
    setSavingCfg(true);
    justSaved.current = true;
    await updateConfig(cfg);
    setSavingCfg(false);
    toast({ title: 'Configuration saved', description: 'Labels and features updated across the app.' });
  };

  if (!currentOrg) return null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/settings')} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Settings
      </Button>
      <PageHeader title="Organization" description="Manage profile, labels, and feature configuration" />

      {/* ── Profile ── */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-muted-foreground" /> Organization Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo Upload */}
          <div className="flex items-center gap-5">
            <div className="relative group">
              {currentOrg.logoUrl ? (
                <img
                  src={`${(import.meta.env.VITE_API_URL as string) || 'http://localhost:8000'}${currentOrg.logoUrl}`}
                  alt={currentOrg.name}
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-muted"
                />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold border-2 border-muted">
                  {currentOrg.logoText || currentOrg.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Upload className="h-5 w-5 text-white" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/svg+xml"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      toast({ title: 'Logo must be under 2MB', variant: 'destructive' });
                      return;
                    }
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      const token = localStorage.getItem('token') ?? '';
                      const base = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';
                      const res = await fetch(`${base}/organizations/${currentOrg.id}/logo`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                        body: formData,
                      });
                      if (!res.ok) throw new Error('Upload failed');
                      await refreshOrganizations();
                      toast({ title: 'Logo updated' });
                    } catch {
                      toast({ title: 'Failed to upload logo', variant: 'destructive' });
                    }
                  }}
                />
              </label>
            </div>
            <div>
              <p className="text-sm font-medium">Organization Logo</p>
              <p className="text-xs text-muted-foreground mt-0.5">Click to upload. JPG, PNG, or SVG. Max 2MB.</p>
              <p className="text-xs text-muted-foreground">Shown in sidebar, receipts, and login page.</p>
            </div>
          </div>

          <Separator />

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input value={INDUSTRY_LABELS[currentOrg.industry]} disabled className="bg-muted" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="pt-2 flex justify-end">
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Profile'}</Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Configure ── */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" /> Configure Labels & Features
          </CardTitle>
          <CardDescription>
            Customize how the app refers to your recipients and assignments. These labels appear everywhere in the UI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Recipient labels */}
          <div>
            <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide text-xs">Recipient Labels</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Recipient Label
                  <span className="text-muted-foreground font-normal ml-1 text-xs">(singular)</span>
                </Label>
                <Input
                  value={cfg.recipientLabel}
                  onChange={(e) => setCfg({ ...cfg, recipientLabel: e.target.value })}
                  placeholder="Student / Patient / Employee…"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Recipient Label
                  <span className="text-muted-foreground font-normal ml-1 text-xs">(plural)</span>
                </Label>
                <Input
                  value={cfg.recipientPluralLabel}
                  onChange={(e) => setCfg({ ...cfg, recipientPluralLabel: e.target.value })}
                  placeholder="Students / Patients / Employees…"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Identifier Label
                  <span className="text-muted-foreground font-normal ml-1 text-xs">(ID field name)</span>
                </Label>
                <Input
                  value={cfg.identifierLabel}
                  onChange={(e) => setCfg({ ...cfg, identifierLabel: e.target.value })}
                  placeholder="Roll Number / Patient ID / Employee ID…"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Group Label
                  <span className="text-muted-foreground font-normal ml-1 text-xs">(group/section field name)</span>
                </Label>
                <Input
                  value={cfg.groupLabel}
                  onChange={(e) => setCfg({ ...cfg, groupLabel: e.target.value })}
                  placeholder="Class / Ward / Department…"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Assignment & item labels */}
          <div>
            <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide text-xs">Assignment & Inventory Labels</p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Assignment Label</Label>
                <Input
                  value={cfg.assignmentLabel}
                  onChange={(e) => setCfg({ ...cfg, assignmentLabel: e.target.value })}
                  placeholder="Issue / Loan / Checkout…"
                />
              </div>
              <div className="space-y-2">
                <Label>Item Unit</Label>
                <Input
                  value={cfg.itemUnit}
                  onChange={(e) => setCfg({ ...cfg, itemUnit: e.target.value })}
                  placeholder="units / pieces / strips…"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency Symbol</Label>
                <Input
                  value={cfg.currencySymbol}
                  onChange={(e) => setCfg({ ...cfg, currencySymbol: e.target.value })}
                  placeholder="₹ / $ / €…"
                  maxLength={3}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Language, Currency, Timezone */}
          <div>
            <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide text-xs flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Localization
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={cfg.language || 'en'} onValueChange={(v) => setCfg({ ...cfg, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => (
                      <SelectItem key={l.code} value={l.code}>{l.nativeName} ({l.name})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={cfg.currencyCode || 'INR'} onValueChange={(v) => {
                  const cur = CURRENCIES.find(c => c.code === v);
                  setCfg({ ...cfg, currencyCode: v, currencySymbol: cur?.symbol || '₹' });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={cfg.timezone || 'Asia/Kolkata'} onValueChange={(v) => setCfg({ ...cfg, timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Feature toggles */}
          <div>
            <p className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide text-xs">Feature Toggles</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Condition Tracking</p>
                  <p className="text-xs text-muted-foreground">Record condition of items when issued and returned (New / Good / Fair / Poor)</p>
                </div>
                <Switch
                  checked={cfg.enableConditionTracking}
                  onCheckedChange={(v) => setCfg({ ...cfg, enableConditionTracking: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Damage Fines</p>
                  <p className="text-xs text-muted-foreground">Allow raising fines when items are returned damaged or reported lost</p>
                </div>
                <Switch
                  checked={cfg.enableFines}
                  onCheckedChange={(v) => setCfg({ ...cfg, enableFines: v })}
                />
              </div>
              {cfg.enableFines && (
                <div className="space-y-2 pl-4 border-l-2 border-border">
                  <Label>Fine / Penalty Label</Label>
                  <Input
                    value={cfg.fineLabel}
                    onChange={(e) => setCfg({ ...cfg, fineLabel: e.target.value })}
                    placeholder="Damage Fine / Penalty / Fee…"
                    className="max-w-xs"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button onClick={handleSaveConfig} disabled={savingCfg}>
              {savingCfg ? 'Saving…' : 'Save Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
