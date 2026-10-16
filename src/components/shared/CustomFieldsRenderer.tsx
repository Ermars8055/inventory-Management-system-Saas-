import { useState, useEffect } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { customFieldService, classService } from '@/services';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SmartAcademicYearInput } from '@/components/shared/SmartAcademicYearInput';
import { SmartClassInput } from '@/components/shared/SmartClassInput';
import type { CustomField, CustomFieldEntity, OrgClass } from '@/types';

interface CustomFieldsRendererProps {
  entity: CustomFieldEntity;
  values: Record<string, string | number | boolean>;
  onChange: (values: Record<string, string | number | boolean>) => void;
  moduleFilter?: string;  // If set, only show fields tagged to this module
}

function isAcademicYearField(name: string): boolean {
  const n = name.trim().toLowerCase();
  return (
    ['academic year', 'academic_year', 'academicyear', 'school year', 'academic session', 'session', 'batch year'].includes(n) ||
    (n.includes('academic') && n.includes('year'))
  );
}

function isClassField(name: string): boolean {
  const n = name.trim().toLowerCase();
  return (
    ['class', 'class / grade', 'grade', 'class/grade', 'standard'].includes(n) ||
    (n.startsWith('class') && !n.includes('room') && !n.includes('template'))
  );
}

function getSiblingClassValue(values: Record<string, string | number | boolean>): string {
  for (const [k, v] of Object.entries(values)) {
    if (isClassField(k) && typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return '';
}

function getSiblingYearValue(values: Record<string, string | number | boolean>): string {
  for (const [k, v] of Object.entries(values)) {
    if (isAcademicYearField(k) && typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return '';
}

export function CustomFieldsRenderer({ entity, values, onChange, moduleFilter }: CustomFieldsRendererProps) {
  const { currentOrg } = useOrganization();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [classes, setClasses] = useState<OrgClass[]>([]);

  useEffect(() => {
    if (!currentOrg) return;
    customFieldService.getByOrganization(currentOrg.id).then((all) => {
      setFields(
        all
          .filter((f) => f.entity === entity)
          .filter((f) => moduleFilter ? f.module === moduleFilter : !f.module)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
      );
    });
  }, [currentOrg, entity, moduleFilter]);

  useEffect(() => {
    if (!currentOrg) return;
    classService.getAll().then(setClasses).catch(() => setClasses([]));
  }, [currentOrg]);

  if (fields.length === 0) return null;

  function setValue(fieldName: string, value: string | number | boolean) {
    onChange({ ...values, [fieldName]: value });
  }

  const selectedClass = getSiblingClassValue(values);
  const selectedYear = getSiblingYearValue(values);

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Custom Fields
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => {
          const key = field.name;
          const val = values[key];

          return (
            <div key={field.id} className="space-y-2">
              <Label className="flex items-center gap-1">
                {field.name}
                {field.required && <span className="text-destructive">*</span>}
              </Label>

              {isAcademicYearField(field.name) ? (
                <SmartAcademicYearInput
                  value={(val as string) ?? ''}
                  onChange={(v) => setValue(key, v)}
                  required={field.required}
                  placeholder={field.placeholder}
                  selectedClass={selectedClass}
                  classes={classes}
                />
              ) : isClassField(field.name) ? (
                <SmartClassInput
                  value={(val as string) ?? ''}
                  onChange={(v) => setValue(key, v)}
                  required={field.required}
                  placeholder={field.placeholder}
                  selectedYear={selectedYear}
                  classes={classes}
                />
              ) : field.type === 'text' ? (
                <Input
                  placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}`}
                  value={(val as string) ?? ''}
                  onChange={(e) => setValue(key, e.target.value)}
                  required={field.required}
                />
              ) : field.type === 'number' ? (
                <Input
                  type="number"
                  placeholder={field.placeholder || '0'}
                  value={val !== undefined && val !== '' ? String(val) : ''}
                  onChange={(e) => setValue(key, e.target.value ? Number(e.target.value) : '')}
                  required={field.required}
                />
              ) : field.type === 'date' ? (
                <Input
                  type="date"
                  value={(val as string) ?? ''}
                  onChange={(e) => setValue(key, e.target.value)}
                  required={field.required}
                />
              ) : field.type === 'dropdown' ? (
                <Select
                  value={(val as string) ?? ''}
                  onValueChange={(v) => setValue(key, v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder || `Select ${field.name.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === 'boolean' ? (
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    checked={!!val}
                    onCheckedChange={(checked) => setValue(key, checked)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {val ? 'Yes' : 'No'}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
