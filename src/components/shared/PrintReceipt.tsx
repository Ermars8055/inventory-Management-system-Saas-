import { useRef } from 'react';
import { Printer, X } from 'lucide-react';
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

  function handlePrint() {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} — ${orgName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
          .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
          .logo { height: 48px; width: 48px; border-radius: 8px; object-fit: cover; }
          .logo-text { height: 48px; width: 48px; border-radius: 8px; background: #1e293b; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; }
          .org-name { font-size: 20px; font-weight: 700; }
          .org-address { font-size: 12px; color: #6b7280; margin-top: 2px; }
          .title { font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; color: #374151; }
          .date { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
          .fields { margin-bottom: 20px; }
          .field { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
          .field-label { color: #6b7280; }
          .field-value { font-weight: 600; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th { background: #f9fafb; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
          .items-table td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
          .items-table td.qty { text-align: center; font-weight: 600; }
          .notes { margin-top: 20px; padding: 12px; background: #f9fafb; border-radius: 8px; font-size: 12px; color: #6b7280; }
          .signature { margin-top: 48px; display: flex; justify-content: space-between; }
          .sig-block { text-align: center; }
          .sig-line { width: 160px; border-top: 1px solid #d1d5db; margin-bottom: 4px; }
          .sig-label { font-size: 11px; color: #9ca3af; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  }

  const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>Receipt Preview</DialogTitle>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1.5" /> Print
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border rounded-lg p-6 bg-white" ref={printRef}>
          {/* Header */}
          <div className="header">
            {orgLogoUrl ? (
              <img src={`${BASE_URL}${orgLogoUrl}`} alt="" className="logo" />
            ) : (
              <div className="logo-text">{orgName.slice(0, 2).toUpperCase()}</div>
            )}
            <div>
              <div className="org-name">{orgName}</div>
              {orgAddress && <div className="org-address">{orgAddress}</div>}
            </div>
          </div>

          {/* Title + Date */}
          <div className="title">{title}</div>
          {date && <div className="date">Date: {date}</div>}

          {/* Fields */}
          <div className="fields">
            {fields.map(f => (
              <div key={f.label} className="field">
                <span className="field-label">{f.label}</span>
                <span className="field-value">{f.value}</span>
              </div>
            ))}
          </div>

          {/* Items Table */}
          {items && items.length > 0 && (
            <table className="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{item.name}</td>
                    <td className="qty">{item.qty}</td>
                    <td>{item.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Notes */}
          {notes && <div className="notes"><strong>Notes:</strong> {notes}</div>}

          {/* Signature */}
          {showSignature && (
            <div className="signature">
              <div className="sig-block">
                <div className="sig-line" />
                <div className="sig-label">Issued By</div>
              </div>
              <div className="sig-block">
                <div className="sig-line" />
                <div className="sig-label">Received By</div>
              </div>
            </div>
          )}

          {/* Footer */}
          {footer && <div className="footer">{footer}</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
