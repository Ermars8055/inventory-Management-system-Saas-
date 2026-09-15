/**
 * Bulk Issue Page — Phase 3
 * Select a class template → pick recipients in that group → confirm → issue all items in one shot.
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Check, Users, Package, ClipboardCheck, Loader2, ChevronLeft, Printer } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useOrgConfig } from '@/hooks/useOrgConfig';
import { classTemplateService, recipientService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { ClassTemplate, Recipient } from '@/types';

type Step = 1 | 2 | 3 | 4;

export function BulkIssuePage() {
  const { currentOrg } = useOrganization();
  const config = useOrgConfig();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);

  // Selections
  const [selectedTemplate, setSelectedTemplate] = useState<ClassTemplate | null>(null);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expectedReturn, setExpectedReturn] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');

  useEffect(() => {
    if (!currentOrg) return;
    Promise.all([
      classTemplateService.getByOrganization(currentOrg.id),
      recipientService.getByOrganization(currentOrg.id),
    ]).then(([ts, rs]) => {
      setTemplates(ts);
      setRecipients(rs);
    }).finally(() => setLoading(false));
  }, [currentOrg]);

  // Filter recipients by the selected template's group, then by search
  const groupRecipients = useMemo(() => {
    if (!selectedTemplate) return [];
    return recipients.filter(r =>
      r.group?.toLowerCase() === selectedTemplate.group.toLowerCase()
    );
  }, [recipients, selectedTemplate]);

  const filteredRecipients = useMemo(() => {
    if (!recipientSearch.trim()) return groupRecipients;
    const q = recipientSearch.toLowerCase();
    return groupRecipients.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.identifier?.toLowerCase().includes(q)
    );
  }, [groupRecipients, recipientSearch]);

  function toggleRecipient(id: string) {
    setSelectedRecipientIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedRecipientIds(new Set(filteredRecipients.map(r => r.id)));
  }

  function clearAll() {
    setSelectedRecipientIds(new Set());
  }

  async function handleConfirm() {
    if (!selectedTemplate || selectedRecipientIds.size === 0) return;
    setIssuing(true);
    try {
      const assignments = await classTemplateService.bulkIssue(selectedTemplate.id, {
        recipientIds: Array.from(selectedRecipientIds),
        issueDate,
        issuedBy: issuedBy || undefined,
        expectedReturn: expectedReturn || undefined,
        notes: notes || undefined,
      });
      toast({
        title: 'Bulk issue complete',
        description: `${assignments.length} assignments created for ${selectedRecipientIds.size} ${config.recipientPluralLabel.toLowerCase()}.`,
      });
      setStep(4);
    } catch (err: unknown) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setIssuing(false);
    }
  }

  const totalAssignments = selectedRecipientIds.size * (selectedTemplate?.items.length ?? 0);

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader
        title="Bulk Issue"
        description="Issue a class template to multiple recipients in one shot"
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        {(['Select Template', 'Select Recipients', 'Confirm', ''].slice(0, 3) as string[]).map((label, i) => {
          const s = (i + 1) as Step;
          const active = step === s;
          const done = step > s;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold
                ${done ? 'bg-primary text-white' : active ? 'bg-primary/10 text-primary border border-primary' : 'bg-muted text-muted-foreground'}`}>
                {done ? <Check className="h-3 w-3" /> : s}
              </div>
              <span className={active ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
              {i < 2 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Select Template ─────────────────────────────────────── */}
      {step === 1 && (
        <div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground mb-4">No class templates found.</p>
                <Button variant="outline" onClick={() => navigate('/settings/class-templates')}>
                  Create Templates in Settings
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {templates.map(t => (
                <Card
                  key={t.id}
                  className={`cursor-pointer transition-all ${selectedTemplate?.id === t.id ? 'border-primary ring-1 ring-primary/30' : 'hover:border-primary/40'}`}
                  onClick={() => {
                    setSelectedTemplate(t);
                    setSelectedRecipientIds(new Set());
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-semibold text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.group}{t.academicYear ? ` · ${t.academicYear}` : ''}</p>
                      </div>
                      {selectedTemplate?.id === t.id && (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 flex-wrap mt-2">
                      {t.items.slice(0, 4).map(li => (
                        <Badge key={li.id} variant="secondary" className="text-[10px]">{li.itemName}</Badge>
                      ))}
                      {t.items.length > 4 && (
                        <Badge variant="outline" className="text-[10px]">+{t.items.length - 4} more</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{t.items.length} items total</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {selectedTemplate && (
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setStep(2)}>
                Next: Select {config.recipientPluralLabel} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Select Recipients ───────────────────────────────────── */}
      {step === 2 && selectedTemplate && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: recipient list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                {config.recipientPluralLabel} in "{selectedTemplate.group}"
                <Badge variant="secondary">{groupRecipients.length} total</Badge>
              </CardTitle>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder={`Search ${config.recipientPluralLabel.toLowerCase()}…`}
                  value={recipientSearch}
                  onChange={e => setRecipientSearch(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="outline" onClick={selectAll}>All</Button>
                <Button size="sm" variant="outline" onClick={clearAll}>None</Button>
              </div>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto space-y-1 pr-3">
              {filteredRecipients.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No {config.recipientPluralLabel.toLowerCase()} found in this group.
                  <br />
                  <span className="text-xs">Make sure recipients have "{selectedTemplate.group}" as their group.</span>
                </p>
              ) : filteredRecipients.map(r => {
                const checked = selectedRecipientIds.has(r.id);
                return (
                  <div
                    key={r.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-primary/8 border border-primary/20' : 'hover:bg-muted'}`}
                    onClick={() => toggleRecipient(r.id)}
                  >
                    <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0
                      ${checked ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                      {checked && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.identifier}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Right: template preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Items in "{selectedTemplate.name}"
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedTemplate.items.map(li => (
                <div key={li.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-sm">
                  <span className="font-medium">{li.itemName}</span>
                  <span className="text-muted-foreground text-xs">×{li.quantity} · {li.conditionIssued}</span>
                </div>
              ))}
              <div className="pt-3 border-t text-xs text-muted-foreground space-y-1">
                <p>Selected: <strong>{selectedRecipientIds.size}</strong> {config.recipientPluralLabel.toLowerCase()}</p>
                <p>Will create: <strong>{totalAssignments}</strong> assignments</p>
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2 flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={selectedRecipientIds.size === 0}
            >
              Next: Confirm <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Confirm & Options ───────────────────────────────────── */}
      {step === 3 && selectedTemplate && (
        <div className="max-w-lg space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Issue Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Issue Date *</Label>
                  <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Expected Return</Label>
                  <Input type="date" value={expectedReturn} onChange={e => setExpectedReturn(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Issued By</Label>
                <Input placeholder="Store Manager" value={issuedBy} onChange={e => setIssuedBy(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input placeholder="Optional notes" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 space-y-2 text-sm">
              <p className="font-semibold">Summary</p>
              <p>Template: <strong>{selectedTemplate.name}</strong></p>
              <p>Class: <strong>{selectedTemplate.group}</strong></p>
              <p>{config.recipientPluralLabel}: <strong>{selectedRecipientIds.size}</strong></p>
              <p>Items per recipient: <strong>{selectedTemplate.items.length}</strong></p>
              <p className="text-primary font-semibold">Total assignments: {totalAssignments}</p>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={handleConfirm} disabled={issuing}>
              {issuing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Issuing…</>
              ) : (
                <>Issue {totalAssignments} Items <ClipboardCheck className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Done ─────────────────────────────────────────────────── */}
      {step === 4 && (
        <Card className="max-w-md">
          <CardContent className="py-10 text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="h-7 w-7 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-lg">Bulk Issue Complete</p>
              <p className="text-sm text-muted-foreground mt-1">
                {totalAssignments} assignments created successfully.
              </p>
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button variant="outline" onClick={() => navigate('/assignments')}>
                View Assignments
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/class-report?group=${encodeURIComponent(selectedTemplate?.group ?? '')}&date=${issueDate}`)}
              >
                <Printer className="h-4 w-4 mr-1" /> Print Report
              </Button>
              <Button onClick={() => {
                setStep(1);
                setSelectedTemplate(null);
                setSelectedRecipientIds(new Set());
              }}>
                New Bulk Issue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
