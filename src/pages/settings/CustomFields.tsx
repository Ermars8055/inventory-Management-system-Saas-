import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Sliders, Pencil, ChevronUp, ChevronDown, Asterisk } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/context/OrganizationContext';
import { customFieldService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import type { CustomField, CustomFieldType, CustomFieldEntity } from '@/types';

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Text',
  number: 'Number',
  dropdown: 'Dropdown',
  date: 'Date',
  boolean: 'Boolean',
};

interface FieldForm {
  name: string;
  type: CustomFieldType;
  entity: CustomFieldEntity;
  optionsText: string;
  required: boolean;
  placeholder: string;
}

const EMPTY_FORM: FieldForm = { name: '', type: 'text', entity: 'item', optionsText: '', required: false, placeholder: '' };

export function CustomFieldsPage() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const ENTITY_TABS: { value: CustomFieldEntity; label: string }[] = [
    { value: 'item', label: t('Items') },
    { value: 'supplier', label: t('Suppliers') },
    { value: 'vendor', label: t('Vendors') },
    { value: 'recipient', label: t('Recipients') },
    { value: 'asset', label: t('Assets') },
    { value: 'transaction', label: t('Transactions') },
    { value: 'purchase_order', label: t('Purchase Orders') },
  ];

  const [fields, setFields] = useState<CustomField[]>([]);
  const [activeTab, setActiveTab] = useState<CustomFieldEntity>('item');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [form, setForm] = useState<FieldForm>(EMPTY_FORM);

  const loadFields = async () => {
    if (!currentOrg) return;
    const data = await customFieldService.getByOrganization(currentOrg.id);
    setFields(data);
  };

  useEffect(() => { loadFields(); }, [currentOrg]);

  const tabFields = fields
    .filter((f) => f.entity === activeTab)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  function openAddDialog() {
    setEditingField(null);
    setForm({ ...EMPTY_FORM, entity: activeTab });
    setDialogOpen(true);
  }

  function openEditDialog(field: CustomField) {
    setEditingField(field);
    setForm({
      name: field.name,
      type: field.type,
      entity: field.entity,
      optionsText: field.options?.join('\n') ?? '',
      required: field.required,
      placeholder: field.placeholder ?? '',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!currentOrg || !form.name) return;
    const options = form.type === 'dropdown'
      ? form.optionsText.split('\n').map((s) => s.trim()).filter(Boolean)
      : undefined;

    if (editingField) {
      await customFieldService.update(editingField.id, {
        name: form.name,
        type: form.type,
        entity: form.entity,
        options,
        required: form.required,
        placeholder: form.placeholder || undefined,
      });
      toast({ title: t('Field "{{name}}" updated', { name: form.name }) });
    } else {
      await customFieldService.create({
        organizationId: currentOrg.id,
        name: form.name,
        type: form.type,
        entity: form.entity,
        options,
        required: form.required,
        sortOrder: tabFields.length,
        placeholder: form.placeholder || undefined,
      });
      toast({ title: t('Field "{{name}}" added', { name: form.name }) });
    }
    await loadFields();
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    await customFieldService.delete(id);
    await loadFields();
    toast({ title: t('Custom field removed') });
  }

  async function handleMove(field: CustomField, direction: 'up' | 'down') {
    const idx = tabFields.findIndex((f) => f.id === field.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= tabFields.length) return;

    const other = tabFields[swapIdx];
    await Promise.all([
      customFieldService.update(field.id, { sortOrder: other.sortOrder }),
      customFieldService.update(other.id, { sortOrder: field.sortOrder }),
    ]);
    await loadFields();
  }

  function entityCount(entity: CustomFieldEntity) {
    return fields.filter((f) => f.entity === entity).length;
  }

  const activeTabLabel = ENTITY_TABS.find((tab) => tab.value === activeTab)?.label ?? activeTab;

  if (!currentOrg) return null;

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate('/settings')} className="-ml-2 mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('Back to Settings')}
      </Button>
      <PageHeader
        title={t('Custom Fields')}
        description={t('Define additional fields for your organization\'s data. Fields are grouped by entity type.')}
        actions={
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t('Add Field')}
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CustomFieldEntity)}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          {ENTITY_TABS.map((tab) => {
            const count = entityCount(tab.value);
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                {tab.label}
                {count > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {ENTITY_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <Card>
              <CardContent className="p-0">
                {tabFields.length === 0 ? (
                  <EmptyState
                    icon={Sliders}
                    title={t('No custom fields for {{entity}}', { entity: tab.label })}
                    description={t('Add custom fields to capture additional data for {{entity}}.', { entity: tab.label.toLowerCase() })}
                  />
                ) : (
                  <div className="divide-y">
                    {tabFields.map((field, idx) => (
                      <div key={field.id} className="flex items-center justify-between px-4 py-3 gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex flex-col gap-0.5">
                            <Button
                              variant="ghost" size="sm" className="h-5 w-5 p-0"
                              disabled={idx === 0}
                              onClick={() => handleMove(field, 'up')}
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-5 w-5 p-0"
                              disabled={idx === tabFields.length - 1}
                              onClick={() => handleMove(field, 'down')}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <Sliders className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-sm truncate">{field.name}</p>
                              {field.required && (
                                <Asterisk className="h-3 w-3 text-destructive shrink-0" />
                              )}
                            </div>
                            {field.options && field.options.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {t('Options')}: {field.options.join(', ')}
                              </p>
                            )}
                            {field.placeholder && (
                              <p className="text-xs text-muted-foreground truncate">
                                {t('Placeholder')}: {field.placeholder}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-xs">{t(FIELD_TYPE_LABELS[field.type])}</Badge>
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => openEditDialog(field)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
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
          </TabsContent>
        ))}
      </Tabs>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? t('Edit Custom Field') : t('Add Custom Field')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('Field Name')}</Label>
              <Input
                placeholder="e.g. Drug License No."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Type')}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as CustomFieldType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIELD_TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{t(label)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('Applies to')}</Label>
                <Select
                  value={form.entity}
                  onValueChange={(v) => setForm({ ...form, entity: v as CustomFieldEntity })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENTITY_TABS.map((tab) => (
                      <SelectItem key={tab.value} value={tab.value}>{tab.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Placeholder (optional)')}</Label>
              <Input
                placeholder="e.g. Enter license number..."
                value={form.placeholder}
                onChange={(e) => setForm({ ...form, placeholder: e.target.value })}
              />
            </div>
            {form.type === 'dropdown' && (
              <div className="space-y-2">
                <Label>{t('Options (one per line)')}</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={"Option 1\nOption 2\nOption 3"}
                  value={form.optionsText}
                  onChange={(e) => setForm({ ...form, optionsText: e.target.value })}
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.required}
                onCheckedChange={(checked) => setForm({ ...form, required: checked })}
              />
              <Label>{t('Required field')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={handleSave} disabled={!form.name}>
              {editingField ? t('Save Changes') : t('Add Field')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
