import { useState, useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

interface CsvActionsProps {
  exportUrl: string;       // e.g. "/data/export/inventory"
  importUrl?: string;      // e.g. "/data/import/inventory"
  entityName: string;      // e.g. "Inventory"
  onImportComplete?: () => void;
  sampleHeaders?: string;  // e.g. "name,sku,category,quantity,location"
}

export function CsvActions({ exportUrl, importUrl, entityName, onImportComplete, sampleHeaders }: CsvActionsProps) {
  const { toast } = useToast();
  const [showImport, setShowImport] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; total_rows: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const token = localStorage.getItem('token') ?? '';
    const url = `${BASE_URL}${exportUrl}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${entityName.toLowerCase()}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast({ title: `${entityName} exported` });
      })
      .catch(() => toast({ title: 'Export failed', variant: 'destructive' }));
  }

  async function handleImport() {
    if (!file || !importUrl) return;
    setImporting(true);
    setResult(null);
    try {
      const token = localStorage.getItem('token') ?? '';
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${BASE_URL}${importUrl}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Import failed');
      }
      const data = await res.json();
      setResult(data);
      toast({ title: `${data.imported} ${entityName.toLowerCase()} imported` });
      onImportComplete?.();
    } catch (err: unknown) {
      toast({ title: 'Import failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  }

  function downloadSample() {
    if (!sampleHeaders) return;
    const blob = new Blob([sampleHeaders + '\n'], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${entityName.toLowerCase()}_template.csv`;
    a.click();
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
        {importUrl && (
          <Button variant="outline" size="sm" onClick={() => { setShowImport(true); setFile(null); setResult(null); }}>
            <Upload className="h-4 w-4 mr-1" /> Import
          </Button>
        )}
      </div>

      {importUrl && (
        <Dialog open={showImport} onOpenChange={setShowImport}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import {entityName} from CSV</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {sampleHeaders && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Expected columns:</p>
                  <code className="text-xs">{sampleHeaders}</code>
                  <button onClick={downloadSample} className="block mt-2 text-xs text-primary hover:underline">
                    Download template CSV
                  </button>
                </div>
              )}
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                />
              </div>
              {result && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-700">
                  Imported {result.imported} of {result.total_rows} rows
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowImport(false)}>Close</Button>
              <Button onClick={handleImport} disabled={!file || importing}>
                {importing ? 'Importing...' : 'Import'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
