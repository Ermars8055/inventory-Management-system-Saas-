/**
 * Class Issue Report — Phase 4
 * Printable, template-driven report: lists every student in a class and
 * what items were issued to them. Layout pulled from the org's
 * "class_issue_report" ReceiptTemplate (org name, title, footer, etc).
 *
 * URL: /class-report?group=Grade+5A&date=2025-09-15
 * (or reached via Bulk Issue success page → Print Report)
 */
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Filter } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useOrgConfig } from '@/hooks/useOrgConfig';
import { assignmentService, templateService, recipientService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Assignment, Recipient, ReceiptTemplate } from '@/types';

interface ReportRow {
  recipient: Recipient;
  assignments: Assignment[];
}

export function ClassIssueReportPage() {
  const { currentOrg } = useOrganization();
  const config = useOrgConfig();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [allRecipients, setAllRecipients] = useState<Recipient[]>([]);
  const [template, setTemplate] = useState<ReceiptTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterGroup, setFilterGroup] = useState(searchParams.get('group') ?? '');
  const [filterDate, setFilterDate] = useState(searchParams.get('date') ?? new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!currentOrg) return;
    Promise.all([
      assignmentService.getByOrganization(currentOrg.id),
      recipientService.getByOrganization(currentOrg.id),
      templateService.getByOrganization(currentOrg.id),
    ]).then(([asgns, recs, tpls]) => {
      setAllAssignments(asgns);
      setAllRecipients(recs);
      // Find class_issue_report template; fall back to first template
      const classTemplate = tpls.find(t => t.type === 'class_issue_report') ?? tpls[0] ?? null;
      setTemplate(classTemplate);
    }).finally(() => setLoading(false));
  }, [currentOrg]);

  // Available groups from recipients
  const groups = Array.from(new Set(allRecipients.map(r => r.group).filter(Boolean))).sort() as string[];

  // Filtered assignments: match group + date
  const filtered = allAssignments.filter(a => {
    const groupMatch = filterGroup ? a.recipientGroup?.toLowerCase() === filterGroup.toLowerCase() : true;
    const dateMatch = filterDate ? a.issueDate?.startsWith(filterDate) : true;
    return groupMatch && dateMatch;
  });

  // Group by recipient
  const recipientMap = new Map<string, Recipient>(allRecipients.map(r => [r.id, r]));
  const byRecipient = new Map<string, ReportRow>();
  for (const a of filtered) {
    if (!a.recipientId) continue;
    if (!byRecipient.has(a.recipientId)) {
      const rec = recipientMap.get(a.recipientId);
      if (!rec) continue;
      byRecipient.set(a.recipientId, { recipient: rec, assignments: [] });
    }
    byRecipient.get(a.recipientId)!.assignments.push(a);
  }
  const rows = Array.from(byRecipient.values()).sort((a, b) =>
    (a.recipient.identifier ?? '').localeCompare(b.recipient.identifier ?? '')
  );

  // All unique items across filtered assignments (for the header row)
  const allItemNames = Array.from(new Set(filtered.map(a => a.itemName))).sort();

  function handlePrint() {
    window.print();
  }

  if (!currentOrg) return null;

  return (
    <div>
      {/* Screen-only controls */}
      <div className="print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <PageHeader
          title="Class Issue Report"
          description="Printable class-wise material issue register"
          actions={
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" /> Print / Save PDF
            </Button>
          }
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/40 rounded-xl border">
          <Filter className="h-4 w-4 mt-2 text-muted-foreground shrink-0" />
          <div className="space-y-1">
            <Label className="text-xs">{config.groupLabel}</Label>
            <Select value={filterGroup || '__all__'} onValueChange={v => setFilterGroup(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-44 h-8 text-sm">
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All classes</SelectItem>
                {groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Issue Date</Label>
            <Input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="w-40 h-8 text-sm"
            />
          </div>
          <div className="space-y-1 pt-5">
            <p className="text-xs text-muted-foreground">
              {rows.length} {config.recipientPluralLabel.toLowerCase()} · {filtered.length} assignments
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground print:hidden">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground print:hidden">
          No assignments found for the selected filters.
        </p>
      ) : (
        /* ── Printable report ──────────────────────────────────────────────── */
        <div className="print-report">
          {/* Report header */}
          <div className="text-center mb-4 print:mb-2">
            {template?.showLogo && (
              <div className="flex justify-center mb-2 print:mb-1">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 border">
                  LOGO
                </div>
              </div>
            )}
            <h1 className="text-lg font-bold uppercase">{template?.orgName ?? currentOrg.name}</h1>
            {template?.orgAddress && (
              <p className="text-xs text-gray-500 mt-0.5">{template.orgAddress}</p>
            )}
            <h2 className="text-base font-semibold mt-2 uppercase tracking-wide">
              {template?.title ?? 'Class Material Issue Report'}
            </h2>
            <div className="flex justify-center gap-6 text-xs text-gray-600 mt-1">
              {filterGroup && <span>{config.groupLabel}: <strong>{filterGroup}</strong></span>}
              {filterDate && <span>Date: <strong>{filterDate}</strong></span>}
            </div>
          </div>

          <hr className="border-gray-300 mb-3 print:mb-2" />

          {/* Issue register table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">S.No</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">
                    {config.recipientLabel}
                  </th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">
                    {config.identifierLabel}
                  </th>
                  {allItemNames.map(name => (
                    <th key={name} className="border border-gray-300 px-2 py-1.5 text-center font-semibold max-w-20">
                      {name}
                    </th>
                  ))}
                  <th className="border border-gray-300 px-2 py-1.5 text-center font-semibold">Signature</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  // Build a map: itemName → quantity for this recipient
                  const itemQtyMap = new Map<string, number>();
                  for (const a of row.assignments) {
                    itemQtyMap.set(a.itemName, (itemQtyMap.get(a.itemName) ?? 0) + a.quantity);
                  }
                  return (
                    <tr key={row.recipient.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-2 py-1.5 text-center">{idx + 1}</td>
                      <td className="border border-gray-300 px-2 py-1.5 font-medium">{row.recipient.name}</td>
                      <td className="border border-gray-300 px-2 py-1.5">{row.recipient.identifier}</td>
                      {allItemNames.map(name => (
                        <td key={name} className="border border-gray-300 px-2 py-1.5 text-center">
                          {itemQtyMap.has(name) ? itemQtyMap.get(name) : '—'}
                        </td>
                      ))}
                      <td className="border border-gray-300 px-2 py-1.5 min-w-24"></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-6 print:mt-4">
            {template?.showSignature && (
              <div className="flex justify-between mt-8 text-xs text-gray-600">
                <div>
                  <p>Prepared by: _______________________</p>
                  <p className="mt-1">Date: {filterDate}</p>
                </div>
                <div className="text-right">
                  <p>{template?.footer ?? 'Storekeeper Signature: _______________________'}</p>
                </div>
              </div>
            )}
            {template?.notes && (
              <p className="text-xs text-gray-500 italic mt-3 border-t pt-2">{template.notes}</p>
            )}
          </div>
        </div>
      )}

      {/* Print CSS injected inline so it works without a separate stylesheet */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-report, .print-report * { visibility: visible; }
          .print-report { position: fixed; top: 0; left: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
          @page { size: A4; margin: 15mm; }
          table { font-size: 10px; }
        }
      `}</style>
    </div>
  );
}
