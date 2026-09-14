import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Sliders } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/context/OrganizationContext';
import { customFieldService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { CustomField, CustomFieldType } from '@/types';

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Text',
  number: 'Number',
  dropdown: 'Dropdown',
  date: 'Date',
  boolean: 'Boolean',
};

const ENTITY_LABELS = {
  item: 'Item',
  supplier: 'Supplier',
  transaction: 'Transaction',
};

export function CustomFieldsPage() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fields, setFields] = useState<CustomField[]>([]);
  const [addDialog, setAddDialog] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    type: CustomFieldType;
    entity: CustomField['entity'];
    optionsText: string;
  }>({ name: '', type: 'text', entity: 'item', optionsText: '' });

  const loadFields = async () => {
    if (!currentOrg) return;
    const data = await customFieldService.getByOrganization(currentOrg.id);
    setFields(data);
  };

  useEffect(() => { loadFields(); }, [currentOrg]);

  const handleAdd = async () => {
    if (!currentOrg || !form.name) return;
    const options = form.type === 'dropdown'
      ? form.optionsText.split('\n').map((s) => s.trim()).filter(Boolean)
      : undefined;
    await customFieldService.create({
      organizationId: currentOrg.id,
      name: form.name,
      type: form.type,
      entity: form.entity,
      options,
    });
    await loadFields();
    setAddDialog(false);
    setForm({ name: '', type: 'text', entity: 'item', optionsText: '' });
    toast({ title: `Field "${form.name}" added` });
  };

  const handleDelete = async (id: string) => {
    await customFieldService.delete(id);
    await loadFields();
    toast({ title: 'Custom field removed' });
  };

  if (!currentOrg) return null;

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate('/settings')} className="-ml-2 mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Settings
      </Button>
      <PageHeader
        title="Custom Fields"
        description="Define additional fields for your organization's data"
        actions={
          <Button size="sm" onClick={() => setAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item Custom Fields</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {fields.length === 0 ? (
            <EmptyState
              icon={Sliders}
              title="No custom fields yet"
              description="Add custom fields to capture additional data for your organization."
            />
          ) : (
            <div className="divide-y">
              {fields.map((field) => (
                <div key={field.id} className="flex items-center justify-between px-4 py-3 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                      <Sliders className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{field.name}</p>
                      {field.options && field.options.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Options: {field.options.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{FIELD_TYPE_LABELS[field.type]}</Badge>
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {ENTITY_LABELS[field.entity]}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(field.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Field</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Field Name</Label>
              <Input
                placeholder="e.g. Academic Year"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as CustomFieldType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIELD_TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Applies to</Label>
                <Select
                  value={form.entity}
                  onValueChange={(v) => setForm({ ...form, entity: v as CustomField['entity'] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="item">Item</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="transaction">Transaction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.type === 'dropdown' && (
              <div className="space-y-2">
                <Label>Options (one per line)</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="2025-26&#10;2026-27&#10;2027-28"
                  value={form.optionsText}
                  onChange={(e) => setForm({ ...form, optionsText: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.name}>Add Field</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
