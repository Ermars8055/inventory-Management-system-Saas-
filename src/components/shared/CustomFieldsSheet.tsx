import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Sliders, Asterisk } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { customFieldService } from '@/services';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { useToast } from '@/hooks/use-toast';
import type { CustomField, CustomFieldType, CustomFieldEntity } from '@/types';

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Text', number: 'Number', dropdown: 'Dropdown', date: 'Date', boolean: 'Boolean',
};

interface Props {
  entity: CustomFieldEntity;
  entityLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FieldForm {
  name: string;
  type: CustomFieldType;
  optionsText: string;
  required: boolean;
  placeholder: string;
}

const EMPTY_FORM: FieldForm = { name: '', type: 'text', optionsText: '', required: false, placeholder: '' };

export function CustomFieldsSheet({ entity, entityLabel, open, onOpenChange }: Props) {
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [form, setForm] = useState<FieldForm>(EMPTY_FORM);

  async function loadFields() {
    if (!currentOrg) return;
    const all = await customFieldService.getByOrganization(currentOrg.id);
    setFields(all.filter(f => f.entity === entity).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
  }

  useEffect(() => { if (open) loadFields(); }, [open, currentOrg, entity]);

  function openAdd() {
    setEditingField(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(field: CustomField) {
    setEditingField(field);
    setForm({
      name: field.name,
      type: field.type,
      optionsText: field.options?.join('\n') ?? '',
      required: field.required,
      placeholder: field.placeholder ?? '',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!currentOrg || !form.name) return;
    const options = form.type === 'dropdown'
      ? form.optionsText.split('\n').map(s => s.trim()).filter(Boolean)
      : undefined;

    if (editingField) {
      await customFieldService.update(editingField.id, {
        name: form.name, type: form.type, options,
        required: form.required, placeholder: form.placeholder || undefined,
      });
      toast({ title: `Field "${form.name}" updated` });
    } else {
      await customFieldService.create({
        organizationId: currentOrg.id,
        name: form.name, type: form.type, entity,
        options, required: form.required, sortOrder: fields.length,
        placeholder: form.placeholder || undefined,
      });
      toast({ title: `Field "${form.name}" added` });
    }
    await loadFields();
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    await customFieldService.delete(id);
    await loadFields();
    toast({ title: 'Field removed' });
  }

  async function handleMove(field: CustomField, direction: 'up' | 'down') {
    const idx = fields.findIndex(f => f.id === field.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= fields.length) return;
    const other = fields[swapIdx];
    await Promise.all([
      customFieldService.update(field.id, { sortOrder: other.sortOrder }),
      customFieldService.update(other.id, { sortOrder: field.sortOrder }),
    ]);
    await loadFields();
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Custom Fields — {entityLabel}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Button size="sm" onClick={openAdd} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Add Field
            </Button>

            {fields.length === 0 ? (
              <EmptyState
                icon={Sliders}
                title="No custom fields"
                description={`Add custom fields to capture extra data for ${entityLabel.toLowerCase()}.`}
              />
            ) : (
              <div className="divide-y rounded-md border">
                {fields.map((field, idx) => (
                  <div key={field.id} className="flex items-center justify-between px-3 py-2.5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex flex-col gap-0.5">
                        <Button variant="ghost" size="sm" className="h-4 w-4 p-0" disabled={idx === 0}
                          onClick={() => handleMove(field, 'up')}>
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-4 w-4 p-0" disabled={idx === fields.length - 1}
                          onClick={() => handleMove(field, 'down')}>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium truncate">{field.name}</span>
                          {field.required && <Asterisk className="h-3 w-3 text-destructive shrink-0" />}
                        </div>
                        <Badge variant="outline" className="text-[10px] mt-0.5">{FIELD_TYPE_LABELS[field.type]}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(field)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(field.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? 'Edit Field' : 'Add Field'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Field Name</Label>
              <Input placeholder="e.g. Drug License No." value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as CustomFieldType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FIELD_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Placeholder (optional)</Label>
              <Input placeholder="e.g. Enter license number..." value={form.placeholder}
                onChange={e => setForm({ ...form, placeholder: e.target.value })} />
            </div>
            {form.type === 'dropdown' && (
              <div className="space-y-2">
                <Label>Options (one per line)</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={"Option 1\nOption 2\nOption 3"}
                  value={form.optionsText}
                  onChange={e => setForm({ ...form, optionsText: e.target.value })}
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={form.required} onCheckedChange={checked => setForm({ ...form, required: checked })} />
              <Label>Required field</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name}>
              {editingField ? 'Save' : 'Add Field'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
