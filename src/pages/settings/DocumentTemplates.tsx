import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/context/OrganizationContext';
import { templateService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import type { ReceiptTemplate } from '@/types';

const TYPE_LABELS: Record<ReceiptTemplate['type'], string> = {
  uniform_issue: 'Uniform Issue',
  book_issue: 'Book Issue',
  stock_receipt: 'Stock Receipt',
  return_receipt: 'Return Receipt',
  class_issue_report: 'Class Issue Report',
};

export function DocumentTemplatesPage() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [templates, setTemplates] = useState<ReceiptTemplate[]>([]);
  const [editing, setEditing] = useState<ReceiptTemplate | null>(null);
  const [previewing, setPreviewing] = useState<ReceiptTemplate | null>(null);

  const loadTemplates = async () => {
    if (!currentOrg) return;
    const data = await templateService.getByOrganization(currentOrg.id);
    setTemplates(data);
  };

  useEffect(() => { loadTemplates(); }, [currentOrg]);

  const handleSave = async () => {
    if (!editing) return;
    await templateService.update(editing.id, editing);
    await loadTemplates();
    setEditing(null);
    toast({ title: t('Template saved') });
  };

  if (!currentOrg) return null;

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate('/settings')} className="-ml-2 mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('Back to Settings')}
      </Button>
      <PageHeader
        title={t('Document Templates')}
        description={t('Customize receipt and document layouts for your organization')}
      />

      {templates.length === 0 ? (
        <EmptyState icon={FileText} title={t('No templates')} description={t('No templates configured for this organization.')} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {tpl.name}
                  </div>
                  <Badge variant="outline" className="text-xs">{t(TYPE_LABELS[tpl.type])}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><span className="font-medium text-foreground">{t('Title')}:</span> {tpl.title}</p>
                  <p><span className="font-medium text-foreground">{t('Logo')}:</span> {tpl.showLogo ? t('Yes') : t('No')}</p>
                  <p><span className="font-medium text-foreground">{t('Signature')}:</span> {tpl.showSignature ? t('Yes') : t('No')}</p>
                  {tpl.footer && (
                    <p className="truncate"><span className="font-medium text-foreground">{t('Footer')}:</span> {tpl.footer}</p>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setPreviewing(tpl)}>
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    {t('Preview')}
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => setEditing({ ...tpl })}>
                    {t('Edit')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('Edit Template')}: {editing?.name}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{t('Organization Name on Document')}</Label>
                <Input
                  value={editing.orgName}
                  onChange={(e) => setEditing({ ...editing, orgName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Document Title')}</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Organization Address')}</Label>
                <Input
                  value={editing.orgAddress}
                  onChange={(e) => setEditing({ ...editing, orgAddress: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Footer Text')}</Label>
                <Input
                  value={editing.footer}
                  onChange={(e) => setEditing({ ...editing, footer: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Notes')}</Label>
                <Input
                  value={editing.notes}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t('Show Logo')}</Label>
                <Switch
                  checked={editing.showLogo}
                  onCheckedChange={(v) => setEditing({ ...editing, showLogo: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t('Show Signature Line')}</Label>
                <Switch
                  checked={editing.showSignature}
                  onCheckedChange={(v) => setEditing({ ...editing, showSignature: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t('Cancel')}</Button>
            <Button onClick={handleSave}>{t('Save Template')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Preview')}: {previewing?.name}</DialogTitle>
          </DialogHeader>
          {previewing && (
            <div className="border rounded-lg p-6 font-mono text-xs bg-white text-black space-y-3">
              {previewing.showLogo && (
                <div className="flex items-center justify-center">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                    LOGO
                  </div>
                </div>
              )}
              <div className="text-center">
                <p className="font-bold text-sm">{previewing.orgName}</p>
                <p className="text-gray-500 text-xs">{previewing.orgAddress}</p>
              </div>
              <Separator />
              <p className="text-center font-bold text-sm">{previewing.title}</p>
              <Separator />
              <div className="space-y-1">
                {previewing.fields.map((field) => (
                  <div key={field} className="flex justify-between">
                    <span className="text-gray-600">{field}:</span>
                    <span className="text-gray-400">___________</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-gray-600">{t('Items')}:</p>
                <div className="flex justify-between text-gray-400">
                  <span>{t('Item')} 1</span>
                  <span>1</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{t('Item')} 2</span>
                  <span>1</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-gray-600">{t('Issued By')}:</span>
                <span className="text-gray-400">___________</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('Date')}:</span>
                <span className="text-gray-400">11 September 2026</span>
              </div>
              {previewing.showSignature && (
                <div className="mt-2">
                  <p className="text-gray-600">{t('Signature')}:</p>
                  <p className="text-gray-400 mt-1">________________</p>
                </div>
              )}
              {previewing.footer && (
                <>
                  <Separator />
                  <p className="text-center text-gray-500 italic">{previewing.footer}</p>
                </>
              )}
              {previewing.notes && (
                <p className="text-gray-500 text-xs italic">{previewing.notes}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewing(null)}>{t('Close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
