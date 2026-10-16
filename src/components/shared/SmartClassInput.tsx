import { useState, useMemo } from 'react';
import {
  School, Check, ChevronsUpDown, X, Plus,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import type { OrgClass } from '@/types';

interface SmartClassInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  selectedYear?: string;
  classes?: OrgClass[];
  className?: string;
}

export function SmartClassInput({
  value,
  onChange,
  required = false,
  placeholder,
  selectedYear,
  classes = [],
  className,
}: SmartClassInputProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Extract distinct registered class names
  const registeredClasses = useMemo(() => {
    // If an academic year is selected, prioritize classes registered for that year
    const targetClasses = selectedYear && selectedYear.trim()
      ? classes.filter((c) => c.academicYear && c.academicYear.trim().toLowerCase() === selectedYear.trim().toLowerCase())
      : classes;

    const listToUse = targetClasses.length > 0 ? targetClasses : classes;

    const uniqueMap = new Map<string, { name: string; academicYear?: string; studentCount: number }>();
    listToUse.forEach((c) => {
      const n = c.name.trim();
      if (!uniqueMap.has(n.toLowerCase())) {
        uniqueMap.set(n.toLowerCase(), { name: n, academicYear: c.academicYear, studentCount: c.studentCount || 0 });
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [classes, selectedYear]);

  // Filtered by search
  const filtered = useMemo(() => {
    if (!search.trim()) return registeredClasses;
    const q = search.trim().toLowerCase();
    return registeredClasses.filter((c) => c.name.toLowerCase().includes(q));
  }, [registeredClasses, search]);

  const exactMatch = registeredClasses.find(
    (c) => c.name.toLowerCase() === (search.trim().toLowerCase() || value.toLowerCase())
  );

  function handleSelect(val: string) {
    onChange(val);
    setSearch('');
    setOpen(false);
  }

  // Also extract common base grade numbers (e.g. "1", "2", "3" if class is "Class 1-A") for fast 1-click pills
  const quickGrades = useMemo(() => {
    const grades = new Set<string>();
    registeredClasses.forEach((c) => {
      const match = c.name.match(/\b(\d+)\b/);
      if (match) {
        grades.add(match[1]);
      } else {
        grades.add(c.name);
      }
    });
    return Array.from(grades).slice(0, 6);
  }, [registeredClasses]);

  return (
    <div className={cn('space-y-1.5 w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            role="combobox"
            aria-expanded={open}
            tabIndex={0}
            className={cn(
              'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors hover:bg-accent/40 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer select-none',
              !value && 'text-muted-foreground'
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <School className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate font-medium text-foreground">
                {value || t(placeholder || 'Select or enter class…')}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-70">
              {value && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange('');
                  }}
                  className="p-0.5 hover:text-destructive rounded transition-colors"
                  title={t('Clear')}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
            </div>
          </div>
        </PopoverTrigger>

        <PopoverContent className="w-[300px] sm:w-[340px] p-0 shadow-lg border rounded-lg overflow-hidden" align="start">
          {/* Header search bar */}
          <div className="flex items-center border-b px-3 py-2 bg-muted/30">
            <School className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <Input
              className="h-7 text-xs border-0 shadow-none focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground"
              placeholder={t('Search or type class (e.g. 1, Class 1-A)…')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (search.trim()) {
                    handleSelect(search.trim());
                  } else if (filtered.length > 0) {
                    handleSelect(filtered[0].name);
                  }
                }
              }}
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-muted-foreground hover:text-foreground text-xs p-1"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="max-h-[260px] overflow-y-auto p-1 text-sm divide-y divide-border/40">
            {registeredClasses.length > 0 && (
              <div className="py-1">
                <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>{t('Registered Classes')}</span>
                  {selectedYear && (
                    <span className="text-[10px] text-primary lowercase">
                      {selectedYear}
                    </span>
                  )}
                </div>

                <div className="space-y-0.5 mt-1">
                  {filtered.map((item) => {
                    const isSelected = value.trim().toLowerCase() === item.name.toLowerCase();

                    return (
                      <div
                        key={item.name}
                        onClick={() => handleSelect(item.name)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center justify-between text-xs text-left select-none',
                          isSelected
                            ? 'bg-primary/10 border border-primary/30 text-primary font-semibold'
                            : 'hover:bg-muted/70 text-foreground'
                        )}
                      >
                        <span className="truncate">{item.name}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Class Entry if typed */}
            {search.trim() && !exactMatch && (
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={() => handleSelect(search.trim())}
                  className="w-full text-left px-2.5 py-1.5 rounded-md bg-primary/5 hover:bg-primary/10 border border-dashed border-primary/30 text-xs text-primary font-medium flex items-center gap-2 transition-all"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {t('Use')} <strong className="text-foreground font-semibold">"{search.trim()}"</strong>
                  </span>
                </button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Quick 1-Click Suggestion Pills (Fast class/grade entry) */}
      {quickGrades.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground/80">
            {t('Quick')}:
          </span>
          {quickGrades.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onChange(g)}
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer font-medium',
                value === g
                  ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                  : 'bg-muted/40 hover:bg-muted text-foreground border-border/60'
              )}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Hidden input to satisfy required form validation */}
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{ opacity: 0, height: 0, width: 0, position: 'absolute', pointerEvents: 'none' }}
          value={value}
          required
          onChange={() => {}}
        />
      )}
    </div>
  );
}
