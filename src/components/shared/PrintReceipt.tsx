import { useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export interface ReceiptLineItem {
  name: string;
  qty: number;
  unitPrice?: number;   // if provided, shows pricing columns
  amount?: number;      // precomputed; falls back to qty * unitPrice
  details?: string;     // shown instead of pricing (e.g. condition)
}

interface ReceiptField {
  label: string;
  value: string;
}

export interface PrintReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Org
  orgName: string;
  orgAddress?: string;
  orgLogoUrl?: string;
  // Meta
  title: string;
  receiptNo?: string;
  date?: string;
  // Info rows
  fields?: ReceiptField[];
  // Line items
  items?: ReceiptLineItem[];
  // Financial summary (shown only when provided)
  totalAmount?: number;
  paidAmount?: number;
  currencySymbol?: string;
  // Status stamp
  statusLabel?: string;
  statusColor?: 'green' | 'amber' | 'purple' | 'blue';
  // Extras
  notes?: string;
  showSignature?: boolean;
  issuedBy?: string;
  footer?: string;
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  green:  { bg: '#f0fdf4', border: '#16a34a', text: '#15803d' },
  amber:  { bg: '#fffbeb', border: '#d97706', text: '#b45309' },
  purple: { bg: '#faf5ff', border: '#9333ea', text: '#7e22ce' },
  blue:   { bg: '#eff6ff', border: '#2563eb', text: '#1d4ed8' },
};

export function PrintReceipt({
  open, onOpenChange,
  orgName, orgAddress, orgLogoUrl,
  title, receiptNo, date,
  fields, items,
  totalAmount, paidAmount, currencySymbol = '₹',
  statusLabel, statusColor = 'green',
  notes, showSignature, issuedBy, footer,
}: PrintReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

  const hasPricing = items?.some(i => i.unitPrice !== undefined);
  const balance = totalAmount !== undefined && paidAmount !== undefined
    ? totalAmount - paidAmount : undefined;
  const sc = STATUS_COLORS[statusColor] ?? STATUS_COLORS.green;

  function handlePrint() {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=820,height=700');
    if (!win) {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;';
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(buildHtml(content));
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => document.body.removeChild(iframe), 1200);
        }, 350);
      }
      return;
    }
    win.document.write(buildHtml(content));
    win.document.close();
    setTimeout(() => win.print(), 350);
  }

  function buildHtml(content: string) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title} — ${orgName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;background:#fff}
    @media screen{body{max-width:680px;margin:0 auto;padding:32px}}
    @media print{body{padding:0}@page{margin:12mm;size:A5}}
  </style>
</head>
<body>${content}</body>
</html>`;
  }

  const logoSrc = orgLogoUrl
    ? (orgLogoUrl.startsWith('http') ? orgLogoUrl : `${BASE_URL}${orgLogoUrl}`)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col p-0 gap-0">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40 rounded-t-lg shrink-0">
          <span className="text-sm font-semibold">Receipt Preview</span>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" /> Print
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Receipt body — scrollable */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div
            ref={printRef}
            style={{
              background: '#fff',
              maxWidth: 580,
              margin: '0 auto',
              padding: '32px 36px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              color: '#111827',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
            }}
          >

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 20, borderBottom: '2px solid #111827' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {logoSrc ? (
                  <img src={logoSrc} alt="" style={{ height: 52, width: 52, borderRadius: 8, objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                ) : (
                  <div style={{ height: 52, width: 52, borderRadius: 8, background: '#1e293b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                    {orgName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{orgName}</div>
                  {orgAddress && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3, maxWidth: 260, lineHeight: 1.4 }}>{orgAddress}</div>}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {receiptNo && (
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>
                    Receipt No: <strong style={{ color: '#111827' }}>{receiptNo}</strong>
                  </div>
                )}
                {date && (
                  <div style={{ fontSize: 11, color: '#6b7280' }}>
                    Date: <strong style={{ color: '#111827' }}>{date}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* ── Title ── */}
            <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151', marginBottom: 20 }}>
              {title}
            </div>

            {/* ── Info fields ── */}
            {fields && fields.length > 0 && (
              <div style={{ marginBottom: 20, background: '#f9fafb', borderRadius: 8, padding: '12px 16px' }}>
                {fields.map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < fields.length - 1 ? '1px solid #f3f4f6' : 'none', fontSize: 13 }}>
                    <span style={{ color: '#6b7280' }}>{f.label}</span>
                    <span style={{ fontWeight: 600, color: '#111827', textAlign: 'right', maxWidth: '60%' }}>{f.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Items table ── */}
            {items && items.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0, fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#1e293b', color: '#fff' }}>
                    <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: 0, width: 28 }}>#</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Item</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', width: 50 }}>Qty</th>
                    {hasPricing ? (
                      <>
                        <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', width: 80 }}>Price</th>
                        <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', width: 80 }}>Amount</th>
                      </>
                    ) : (
                      <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Details</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const amt = item.amount ?? ((item.unitPrice ?? 0) * item.qty);
                    return (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '9px 10px', color: '#9ca3af' }}>{idx + 1}</td>
                        <td style={{ padding: '9px 10px', fontWeight: 500 }}>{item.name}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600 }}>{item.qty}</td>
                        {hasPricing ? (
                          <>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: '#374151' }}>
                              {item.unitPrice !== undefined ? `${currencySymbol}${item.unitPrice}` : '—'}
                            </td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600 }}>
                              {item.unitPrice !== undefined ? `${currencySymbol}${amt}` : '—'}
                            </td>
                          </>
                        ) : (
                          <td style={{ padding: '9px 10px', color: '#6b7280' }}>{item.details || '—'}</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* ── Financial summary ── */}
            {totalAmount !== undefined && paidAmount !== undefined && (
              <div style={{ marginTop: 0, border: '1px solid #e5e7eb', borderTop: 'none', background: '#f9fafb', padding: '12px 16px', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 40 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                      <span>Total Fee</span>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{currencySymbol}{totalAmount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                      <span>Amount Paid</span>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{currencySymbol}{paidAmount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, fontSize: 14, borderTop: '1.5px solid #d1d5db', paddingTop: 6, marginTop: 4 }}>
                      <span style={{ fontWeight: 700 }}>Balance</span>
                      <span style={{ fontWeight: 700, color: balance === 0 ? '#16a34a' : '#dc2626' }}>{currencySymbol}{balance}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Status stamp ── */}
            {statusLabel && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20, marginTop: totalAmount !== undefined ? 0 : 16 }}>
                <div style={{
                  padding: '6px 18px',
                  border: `2px solid ${sc.border}`,
                  borderRadius: 6,
                  background: sc.bg,
                  color: sc.text,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}>
                  {statusLabel}
                </div>
              </div>
            )}

            {/* ── Notes ── */}
            {notes && (
              <div style={{ marginBottom: 20, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
                <strong>Notes: </strong>{notes}
              </div>
            )}

            {/* ── Signature ── */}
            {showSignature && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 36, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                <div>
                  <div style={{ width: 180, borderBottom: '1px solid #9ca3af', marginBottom: 6 }} />
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Received By (Student / Parent)</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ width: 180, borderBottom: '1px solid #9ca3af', marginBottom: 6, marginLeft: 'auto' }} />
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>
                    Authorized Signature{issuedBy ? ` — ${issuedBy}` : ''}
                  </div>
                </div>
              </div>
            )}

            {/* ── Footer ── */}
            {footer && (
              <div style={{ marginTop: 24, paddingTop: 14, borderTop: '1px solid #f3f4f6', fontSize: 11, color: '#9ca3af', textAlign: 'center', letterSpacing: '0.03em' }}>
                {footer}
              </div>
            )}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
