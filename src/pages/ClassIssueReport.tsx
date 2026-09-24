/**
 * Class Issue Report — Phase 4
 * Printable, template-driven report: lists every student in a class and
 * what items were issued to them. Layout pulled from the org's
 * "class_issue_report" ReceiptTemplate (org name, title, footer, etc).
 *
 * URL: /class-report?group=Grade+5A&date=2025-09-15
 * (or reached via Bulk Issue success page → Print Report)
 */
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Filter } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useOrgConfig } from '@/hooks/useOrgConfig';
import { useTranslation } from '@/hooks/useTranslation';
import { assignmentService, templateService, recipientService, classService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Assignment, Recipient, ReceiptTemplate, OrgClass } from '@/types';

interface ReportRow {
  recipient: Recipient;
  assignments: Assignment[];
}

export function ClassIssueReportPage() {
  const { currentOrg } = useOrganization();
  const config = useOrgConfig();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [allRecipients, setAllRecipients] = useState<Recipient[]>([]);
  const [receiptTemplate, setReceiptTemplate] = useState<ReceiptTemplate | null>(null);
  const [classes, setClasses] = useState<OrgClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters — filter by class, template name, optional date
  const [filterClass, setFilterClass] = useState(searchParams.get('class') ?? '');
  const [filterTemplate, setFilterTemplate] = useState(searchParams.get('group') ?? '');
  const [filterDate, setFilterDate] = useState(searchParams.get('date') ?? '');

  useEffect(() => {
    if (!currentOrg) return;
    Promise.all([
      assignmentService.getByOrganization(currentOrg.id),
      recipientService.getByOrganization(currentOrg.id),
      templateService.getByOrganization(currentOrg.id),
      classService.getAll(),
    ]).then(([asgns, recs, tpls, clss]) => {
      setAllAssignments(asgns);
      setAllRecipients(recs);
      setClasses(clss);
      const classTemplate = tpls.find(t => t.type === 'class_issue_report') ?? tpls[0] ?? null;
      setReceiptTemplate(classTemplate);
    }).finally(() => setLoading(false));
  }, [currentOrg]);

  // Template names from assignment data
  const templateNames = Array.from(new Set(
    allAssignments.map(a => a.templateName).filter(Boolean)
  )).sort() as string[];

  // Recipient → classId map
  const recipientClassMap = new Map(allRecipients.map(r => [r.id, r.classId]));
  const classIdMap = new Map(classes.map(c => [c.id, c.name]));

  // Filtered assignments: match class + template + optional date
  const filtered = allAssignments.filter(a => {
    const classMatch = filterClass
      ? (a.recipientId ? recipientClassMap.get(a.recipientId) === filterClass : false)
      : true;
    const templateMatch = filterTemplate ? a.templateName === filterTemplate : true;
    const dateMatch = filterDate ? a.issueDate?.startsWith(filterDate) : true;
    return classMatch && templateMatch && dateMatch;
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

  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Class Issue Report — ${currentOrg?.name || ''}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 30px; color: #1a1a1a; }
        @media print { body { padding: 15px; } @page { size: A4 landscape; margin: 10mm; } }
      </style>
    </head><body>${content}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
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
          {classes.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">{t('Class')}</Label>
              <Select value={filterClass || '__all__'} onValueChange={v => setFilterClass(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-44 h-8 text-sm">
                  <SelectValue placeholder={t('All classes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('All classes')}</SelectItem>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.academicYear ? ` (${c.academicYear})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">{t('Template')}</Label>
            <Select value={filterTemplate || '__all__'} onValueChange={v => setFilterTemplate(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-52 h-8 text-sm">
                <SelectValue placeholder={t('All templates')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('All templates')}</SelectItem>
                {templateNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Issue Date</Label>
            <div className="flex gap-1">
              <Input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="w-40 h-8 text-sm"
              />
              {filterDate && (
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setFilterDate('')}>
                  Clear
                </Button>
              )}
            </div>
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
        <div ref={printRef}>
          {/* Report header */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            {receiptTemplate?.showLogo && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <div style={{ height: 48, width: 48, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280', border: '1px solid #d1d5db' }}>
                  LOGO
                </div>
              </div>
            )}
            <h1 style={{ fontSize: 18, fontWeight: 700, textTransform: 'uppercase' }}>{receiptTemplate?.orgName ?? currentOrg.name}</h1>
            {receiptTemplate?.orgAddress && (
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{receiptTemplate.orgAddress}</p>
            )}
            <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
              {receiptTemplate?.title ?? 'Class Material Issue Report'}
            </h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 12, color: '#4b5563', marginTop: 4 }}>
              {filterClass && <span>{t('Class')}: <strong>{classIdMap.get(filterClass) ?? filterClass}</strong></span>}
              {filterTemplate && <span>{t('Template')}: <strong>{filterTemplate}</strong></span>}
              {filterDate && <span>Date: <strong>{filterDate}</strong></span>}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #d1d5db', marginBottom: 12 }} />

          {/* Issue register table */}
          <div>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', border: '1px solid #d1d5db' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>S.No</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>
                    {config.recipientLabel}
                  </th>
                  <th style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>
                    {config.identifierLabel}
                  </th>
                  {allItemNames.map(name => (
                    <th key={name} style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'center', fontWeight: 600, maxWidth: 80 }}>
                      {name}
                    </th>
                  ))}
                  <th style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>Signature</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const itemQtyMap = new Map<string, number>();
                  for (const a of row.assignments) {
                    itemQtyMap.set(a.itemName, (itemQtyMap.get(a.itemName) ?? 0) + a.quantity);
                  }
                  return (
                    <tr key={row.recipient.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                      <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', fontWeight: 500 }}>{row.recipient.name}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '6px 8px' }}>{row.recipient.identifier}</td>
                      {allItemNames.map(name => (
                        <td key={name} style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'center' }}>
                          {itemQtyMap.has(name) ? itemQtyMap.get(name) : '—'}
                        </td>
                      ))}
                      <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', minWidth: 96 }}></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 24 }}>
            {receiptTemplate?.showSignature && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, fontSize: 12, color: '#4b5563' }}>
                <div>
                  <p>Prepared by: _______________________</p>
                  <p style={{ marginTop: 4 }}>Date: {filterDate}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p>{receiptTemplate?.footer ?? 'Storekeeper Signature: _______________________'}</p>
                </div>
              </div>
            )}
            {receiptTemplate?.notes && (
              <p style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>{receiptTemplate.notes}</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
