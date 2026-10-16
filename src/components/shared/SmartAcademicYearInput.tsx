import { useState, useMemo } from 'react';
import {
  CalendarRange, Check, ChevronsUpDown, School, Sparkles, X, Plus,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import type { OrgClass } from '@/types';

interface SmartAcademicYearInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  selectedClass?: string;
  classes?: OrgClass[];
  className?: string;
}

function classMatches(className: string, query?: string): boolean {
  if (!query || !query.trim()) return false;
  const q = query.trim().toLowerCase();
  const c = className.trim().toLowerCase();
  if (c === q) return true;
  if (c.includes(`class ${q}`) || c.includes(`grade ${q}`) || c.startsWith(`${q}-`) || c.includes(` ${q}-`)) return true;
  return c.includes(q);
}

export function SmartAcademicYearInput({
  value,
  onChange,
  required = false,
  placeholder,
  selectedClass,
  classes = [],
  className,
}: SmartAcademicYearInputProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Group classes by academic year
  const registeredYears = useMemo(() => {
    const map = new Map<string, { year: string; classes: OrgClass[]; hasActive: boolean; matchingClasses: OrgClass[] }>();

    classes.forEach((c) => {
      if (!c.academicYear || !c.academicYear.trim()) return;
      const y = c.academicYear.trim();
      if (!map.has(y)) {
        map.set(y, { year: y, classes: [], hasActive: false, matchingClasses: [] });
      }
      const entry = map.get(y)!;
      entry.classes.push(c);
      if (c.status === 'active') entry.hasActive = true;
      if (selectedClass && classMatches(c.name, selectedClass)) {
        entry.matchingClasses.push(c);
      }
    });

    const list = Array.from(map.values());

    // Sort: Years with matching selectedClass first, then newest academic year first
    list.sort((a, b) => {
      if (a.matchingClasses.length > 0 && b.matchingClasses.length === 0) return -1;
      if (b.matchingClasses.length > 0 && a.matchingClasses.length === 0) return 1;
      return b.year.localeCompare(a.year);
    });

    return list;
  }, [classes, selectedClass]);

  // Filtered by search query
  const filteredYears = useMemo(() => {
    if (!search.trim()) return registeredYears;
    const q = search.trim().toLowerCase();
    return registeredYears.filter(
      (y) =>
        y.year.toLowerCase().includes(q) ||
        y.classes.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [registeredYears, search]);

  const exactMatch = registeredYears.find(
    (y) => y.year.toLowerCase() === (search.trim().toLowerCase() || value.toLowerCase())
  );

  const isCurrentValueRegistered = registeredYears.some(
    (y) => y.year.toLowerCase() === (value || '').trim().toLowerCase()
  );

  function handleSelectYear(yr: string) {
    onChange(yr);
    setSearch('');
    setOpen(false);
  }

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
              <CalendarRange className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate font-medium text-foreground">
                {value || t(placeholder || 'Select or enter academic year…')}
              </span>
              {value && isCurrentValueRegistered && (
                <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal text-emerald-600 border-emerald-200 bg-emerald-50 shrink-0">
                  {t('Registered')}
                </Badge>
              )}
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

        <PopoverContent className="w-[340px] sm:w-[380px] p-0 shadow-lg border rounded-lg overflow-hidden" align="start">
          {/* Header search bar */}
          <div className="flex items-center border-b px-3 py-2 bg-muted/30">
            <CalendarRange className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <Input
              className="h-7 text-xs border-0 shadow-none focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground"
              placeholder={t('Search or type new academic year (e.g. 2026-2027)…')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (search.trim()) {
                    handleSelectYear(search.trim());
                  } else if (filteredYears.length > 0) {
                    handleSelectYear(filteredYears[0].year);
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

          <div className="max-h-[300px] overflow-y-auto p-1 text-sm divide-y divide-border/40">
            {/* Registered Academic Years Section */}
            {registeredYears.length > 0 && (
              <div className="py-1">
                <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <School className="h-3.5 w-3.5 text-primary" />
                    {t('Registered School Sessions')}
                  </span>
                  <span className="text-[10px] lowercase text-muted-foreground/80">
                    {registeredYears.length} {t('registered')}
                  </span>
                </div>

                <div className="space-y-1 mt-1">
                  {filteredYears.map((item) => {
                    const isSelected = value.trim() === item.year;
                    const hasMatch = item.matchingClasses.length > 0;

                    return (
                      <div
                        key={item.year}
                        onClick={() => handleSelectYear(item.year)}
                        className={cn(
                          'px-2.5 py-2 rounded-md transition-all cursor-pointer flex flex-col gap-0.5 text-left select-none',
                          isSelected
                            ? 'bg-primary/10 border border-primary/30 text-primary'
                            : 'hover:bg-muted/70'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold text-xs tracking-tight text-foreground">
                              {item.year}
                            </span>
                            {item.hasActive && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-200 text-emerald-700 bg-emerald-50">
                                {t('Active')}
                              </Badge>
                            )}
                            {hasMatch && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-200 text-amber-700 bg-amber-50 flex items-center gap-0.5">
                                <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                                {t('Class')} {selectedClass}
                              </Badge>
                            )}
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </div>

                        {/* Subtitle with classes preview */}
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.classes.length} {t('classes')}:{' '}
                          {item.classes.slice(0, 4).map((c) => c.name).join(', ')}
                          {item.classes.length > 4 ? ` +${item.classes.length - 4} more` : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Year Entry if typed */}
            {search.trim() && !exactMatch && (
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectYear(search.trim())}
                  className="w-full text-left px-2.5 py-2 rounded-md bg-primary/5 hover:bg-primary/10 border border-dashed border-primary/30 text-xs text-primary font-medium flex items-center gap-2 transition-all"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {t('Use custom academic year')} <strong className="text-foreground font-semibold">"{search.trim()}"</strong>
                  </span>
                </button>
              </div>
            )}

            {registeredYears.length === 0 && !search.trim() && (
              <div className="py-6 px-4 text-center text-xs text-muted-foreground">
                <School className="h-6 w-6 text-muted-foreground/50 mx-auto mb-1.5" />
                <p>{t('No classes with academic years registered yet.')}</p>
                <p className="text-[11px] text-muted-foreground/80 mt-1">
                  {t('Type an academic year above (e.g. 2026-2027) to set it.')}
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Quick 1-Click Suggestion Pills (Fast entry without opening popup) */}
      {registeredYears.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground/80 flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5 text-amber-500" />
            {t('Quick Years')}:
          </span>
          {registeredYears.slice(0, 3).map((y) => (
            <button
              key={y.year}
              type="button"
              onClick={() => onChange(y.year)}
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer font-medium',
                value === y.year
                  ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                  : 'bg-muted/40 hover:bg-muted text-foreground border-border/60'
              )}
            >
              {y.year}
              {selectedClass && y.matchingClasses.length > 0 && ' ⭐'}
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
