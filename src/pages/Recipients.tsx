import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, UserCircle2, ChevronRight, Settings2 } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useOrgConfig } from '@/hooks/useOrgConfig';
import { recipientService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { CustomFieldsSheet } from '@/components/shared/CustomFieldsSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { Recipient } from '@/types';

export function RecipientsPage() {
  const { currentOrg } = useOrganization();
  const config = useOrgConfig();
  const navigate = useNavigate();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', identifier: '', group: '', contact: '' });
  const [saving, setSaving] = useState(false);
  const [fieldsSheetOpen, setFieldsSheetOpen] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    recipientService.getByOrganization(currentOrg.id).then(setRecipients);
  }, [currentOrg]);

  const filtered = useMemo(() => {
    if (!search) return recipients;
    const q = search.toLowerCase();
    return recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.identifier?.toLowerCase().includes(q) ||
        r.group?.toLowerCase().includes(q),
    );
  }, [recipients, search]);

  // Group by group field
  const grouped = useMemo(() => {
    const map = new Map<string, Recipient[]>();
    filtered.forEach((r) => {
      const key = r.group || 'Ungrouped';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg) return;
    setSaving(true);
    try {
      const created = await recipientService.create({
        organizationId: currentOrg.id,
        name: form.name,
        identifier: form.identifier,
        group: form.group,
        contact: form.contact || undefined,
      });
      setRecipients((prev) => [...prev, created]);
      setShowAdd(false);
      setForm({ name: '', identifier: '', group: '', contact: '' });
    } finally {
      setSaving(false);
    }
  }

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader
        title={config.recipientPluralLabel}
        description={`${recipients.length} ${config.recipientPluralLabel.toLowerCase()} in ${currentOrg.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setFieldsSheetOpen(true)}>
              <Settings2 className="h-4 w-4 mr-1" />Custom Fields
            </Button>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add {config.recipientLabel}
            </Button>
          </div>
        }
      />

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Search by name or ${config.identifierLabel.toLowerCase()}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={UserCircle2}
          title={`No ${config.recipientPluralLabel.toLowerCase()} found`}
          description={`Add ${config.recipientPluralLabel.toLowerCase()} to start tracking assignments.`}
          action={
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add {config.recipientLabel}
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([groupName, members]) => (
            <div key={groupName}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                {config.groupLabel}: {groupName}
                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] normal-case font-medium">
                  {members.length}
                </span>
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {members.map((r) => (
                  <Card
                    key={r.id}
                    className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
                    onClick={() => navigate(`/recipients/${r.id}`)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                        {r.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {config.identifierLabel}: {r.identifier || '—'}
                        </p>
                        {r.contact && (
                          <p className="text-xs text-muted-foreground truncate">{r.contact}</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add {config.recipientLabel}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Arjun Kumar" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{config.identifierLabel}</Label>
                <Input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} placeholder="e.g. STU-001" />
              </div>
              <div className="space-y-1.5">
                <Label>{config.groupLabel}</Label>
                <Input value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} placeholder="e.g. Grade 5-A" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Contact (optional)</Label>
              <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Phone or email" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : `Add ${config.recipientLabel}`}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CustomFieldsSheet
        entity="recipient"
        entityLabel={config.recipientPluralLabel}
        open={fieldsSheetOpen}
        onOpenChange={setFieldsSheetOpen}
      />
    </div>
  );
}
