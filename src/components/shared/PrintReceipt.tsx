import { useRef } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ReceiptField {
  label: string;
  value: string;
}

interface PrintReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgName: string;
  orgAddress?: string;
  orgLogoUrl?: string;
  title: string;
  fields: ReceiptField[];
  items?: { name: string; qty: number; details?: string }[];
  footer?: string;
  notes?: string;
  showSignature?: boolean;
  date?: string;
}

export function PrintReceipt({
  open, onOpenChange, orgName, orgAddress, orgLogoUrl,
  title, fields, items, footer, notes, showSignature, date,
}: PrintReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

  function handlePrint() {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) {
      // Fallback: use window.print() with iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-10000px';
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(buildHtml(content));
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => document.body.removeChild(iframe), 1000);
        }, 300);
      }
      return;
    }
    win.document.write(buildHtml(content));
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  }

  function buildHtml(content: string) {
    return `<!DOCTYPE html>
<html>
<head>
  <title>${title} — ${orgName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
    @media print { body { padding: 20px; } @page { margin: 15mm; } }
  </style>
</head>
<body>${content}</body>
</html>`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>Receipt Preview</DialogTitle>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1.5" /> Print
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border rounded-lg p-6 bg-white text-black" ref={printRef}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
            {orgLogoUrl ? (
              <img src={`${BASE_URL}${orgLogoUrl}`} alt="" style={{ height: 48, width: 48, borderRadius: 8, objectFit: 'cover' }} />
            ) : (
              <div style={{ height: 48, width: 48, borderRadius: 8, background: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>
                {orgName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{orgName}</div>
              {orgAddress && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{orgAddress}</div>}
            </div>
          </div>

          {/* Title + Date */}
          <div style={{ fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20, color: '#374151' }}>{title}</div>
          {date && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Date: {date}</div>}

          {/* Fields */}
          <div style={{ marginBottom: 20 }}>
            {fields.map(f => (
              <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 14 }}>
                <span style={{ color: '#6b7280' }}>{f.label}</span>
                <span style={{ fontWeight: 600 }}>{f.value}</span>
              </div>
            ))}
          </div>

          {/* Items Table */}
          {items && items.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0' }}>
              <thead>
                <tr>
                  <th style={{ background: '#f9fafb', padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>#</th>
                  <th style={{ background: '#f9fafb', padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Item</th>
                  <th style={{ background: '#f9fafb', padding: '10px 12px', textAlign: 'center', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Qty</th>
                  <th style={{ background: '#f9fafb', padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280', borderBottom: '2px solid #e5e7eb' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', fontSize: 14 }}>{idx + 1}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', fontSize: 14, fontWeight: 500 }}>{item.name}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', fontSize: 14, textAlign: 'center', fontWeight: 600 }}>{item.qty}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', fontSize: 14 }}>{item.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
              {/* Total row */}
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ padding: '10px 12px', fontSize: 14, fontWeight: 700, textAlign: 'right', borderTop: '2px solid #e5e7eb' }}>Total</td>
                  <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 700, borderTop: '2px solid #e5e7eb' }}>
                    {items.reduce((sum, i) => sum + i.qty, 0)} items
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* Notes */}
          {notes && (
            <div style={{ marginTop: 20, padding: 12, background: '#f9fafb', borderRadius: 8, fontSize: 12, color: '#6b7280' }}>
              <strong>Notes:</strong> {notes}
            </div>
          )}

          {/* Signature */}
          {showSignature && (
            <div style={{ marginTop: 48, display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 160, borderTop: '1px solid #d1d5db', marginBottom: 4 }} />
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Issued By</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 160, borderTop: '1px solid #d1d5db', marginBottom: 4 }} />
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Received By</div>
              </div>
            </div>
          )}

          {/* Footer */}
          {footer && (
            <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e5e7eb', fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
              {footer}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
