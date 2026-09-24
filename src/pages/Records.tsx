import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Filter } from 'lucide-react';
import { recordsService, type AuditEntry } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';

// ── Entity type config ───────────────────────────────────────────────────────

const ENTITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  item:           { label: 'Inventory',     color: 'bg-blue-100 text-blue-800',    dot: 'bg-blue-500' },
  recipient:      { label: 'Recipient',     color: 'bg-green-100 text-green-800',  dot: 'bg-green-500' },
  assignment:     { label: 'Assignment',    color: 'bg-orange-100 text-orange-800',dot: 'bg-orange-500' },
  fee_record:     { label: 'Fee',           color: 'bg-amber-100 text-amber-800',  dot: 'bg-amber-500' },
  purchase_order: { label: 'Purchase Order',color: 'bg-purple-100 text-purple-800',dot: 'bg-purple-500' },
  vendor:         { label: 'Vendor',        color: 'bg-cyan-100 text-cyan-800',    dot: 'bg-cyan-500' },
  user:           { label: 'User',          color: 'bg-pink-100 text-pink-800',    dot: 'bg-pink-500' },
  organization:   { label: 'Organization',  color: 'bg-indigo-100 text-indigo-800',dot: 'bg-indigo-500' },
  template:       { label: 'Template',      color: 'bg-teal-100 text-teal-800',    dot: 'bg-teal-500' },
  auth:           { label: 'Auth',          color: 'bg-gray-100 text-gray-700',    dot: 'bg-gray-400' },
};

const DEFAULT_CONFIG = { label: 'Event', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' };

function entityCfg(type: string) {
  return ENTITY_CONFIG[type] ?? DEFAULT_CONFIG;
}

// ── Calendar helpers ─────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number) {
  // 0=Sun → convert to Mon-based (0=Mon…6=Sun)
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const ALL_ENTITY_TYPES = Object.keys(ENTITY_CONFIG);

// ── Component ────────────────────────────────────────────────────────────────

export function RecordsPage() {
  const { t } = useTranslation();
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(
    toDateStr(today.getFullYear(), today.getMonth(), today.getDate())
  );
  const [filterType, setFilterType] = useState('__all__');

  // date range for the current month view
  const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const dateTo   = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth(year, month)).padStart(2, '0')}`;

  const fetchMonth = useCallback(async () => {
    setLoading(true);
    try {
      const data = await recordsService.getTimeline({ dateFrom, dateTo, limit: 500 });
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  }

  // Group entries by date (YYYY-MM-DD prefix of createdAt)
  const byDay: Record<string, AuditEntry[]> = {};
  for (const e of entries) {
    const day = e.createdAt?.slice(0, 10);
    if (!day) continue;
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(e);
  }

  // Filtered list for the selected day
  const dayEntries = selectedDay
    ? (byDay[selectedDay] ?? []).filter(e => filterType === '__all__' || e.entityType === filterType)
    : [];

  // All entries for the month filtered by type (for summary counts on calendar dots)
  const totalFiltered = filterType === '__all__'
    ? entries
    : entries.filter(e => e.entityType === filterType);

  // Rebuild byDay using filtered
  const byDayFiltered: Record<string, AuditEntry[]> = {};
  for (const e of totalFiltered) {
    const day = e.createdAt?.slice(0, 10);
    if (!day) continue;
    if (!byDayFiltered[day]) byDayFiltered[day] = [];
    byDayFiltered[day].push(e);
  }

  const numDays = daysInMonth(year, month);
  const startOffset = firstDayOfWeek(year, month);
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  // Collect distinct entity types present this month
  const presentTypes = [...new Set(entries.map(e => e.entityType))].sort();

  return (
    <div>
      <PageHeader
        title={t('Records')}
        description={t('Organisation activity calendar — every change, tracked.')}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Calendar ── */}
        <div className="lg:w-96 shrink-0">
          <Card>
            <CardContent className="p-4">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-semibold text-sm">{MONTH_NAMES[month]} {year}</span>
                <button onClick={nextMonth} className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {/* leading empty cells */}
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`e${i}`} />
                ))}
                {Array.from({ length: numDays }).map((_, i) => {
                  const day = i + 1;
                  const ds = toDateStr(year, month, day);
                  const dayData = byDayFiltered[ds] ?? [];
                  const isToday = ds === todayStr;
                  const isSelected = ds === selectedDay;
                  const hasEvents = dayData.length > 0;

                  // Collect up to 3 distinct dot colors for this day
                  const dotTypes = [...new Set(dayData.map(e => e.entityType))].slice(0, 3);

                  return (
                    <button
                      key={ds}
                      onClick={() => setSelectedDay(isSelected ? null : ds)}
                      className={[
                        'relative flex flex-col items-center justify-start rounded-lg py-1.5 px-0.5 transition-colors text-sm',
                        isSelected ? 'bg-primary text-primary-foreground' : isToday ? 'bg-primary/10 font-semibold' : 'hover:bg-muted',
                      ].join(' ')}
                    >
                      <span>{day}</span>
                      {hasEvents && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dotTypes.map(type => (
                            <span
                              key={type}
                              className={`inline-block h-1 w-1 rounded-full ${isSelected ? 'bg-primary-foreground/70' : entityCfg(type).dot}`}
                            />
                          ))}
                          {dayData.length > 3 && (
                            <span className={`text-[9px] leading-none ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              +{dayData.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Month summary */}
              <div className="mt-4 pt-3 border-t text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>{t('Total events this month')}</span>
                  <span className="font-medium text-foreground">{totalFiltered.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('Active days')}</span>
                  <span className="font-medium text-foreground">{Object.keys(byDayFiltered).length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          {presentTypes.length > 0 && (
            <Card className="mt-3">
              <CardContent className="p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">{t('Legend')}</p>
                <div className="space-y-1.5">
                  {presentTypes.map(type => {
                    const cfg = entityCfg(type);
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                        <span className="text-xs capitalize">{cfg.label}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {(byDay[type] ? 0 : 0) || entries.filter(e => e.entityType === type).length}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Timeline panel ── */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('All types')}</SelectItem>
                {ALL_ENTITY_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{entityCfg(type).label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDay && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedDay(null)}>
                {t('Clear selection')}
              </Button>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">{t('Loading…')}</p>
          ) : selectedDay ? (
            <>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {formatDate(selectedDay)}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ({dayEntries.length} {t('events')})
                </span>
              </h3>
              {dayEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('No events on this day.')}</p>
              ) : (
                <div className="space-y-2">
                  {dayEntries.map(entry => (
                    <EntryRow key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold mb-3">
                {t('All events')} — {MONTH_NAMES[month]} {year}
              </h3>
              {totalFiltered.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    {t('No records found for this month.')}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {totalFiltered.map(entry => (
                    <EntryRow key={entry.id} entry={entry} showDate />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Entry row ────────────────────────────────────────────────────────────────

function EntryRow({ entry, showDate }: { entry: AuditEntry; showDate?: boolean }) {
  const cfg = entityCfg(entry.entityType);
  const firstLine = entry.detail?.split('\n')[0] ?? '';

  return (
    <div className="flex gap-3 items-start p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors">
      <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.color} border-0`}>
            {cfg.label}
          </Badge>
          <span className="text-xs font-medium capitalize">{entry.action.replace(/_/g, ' ')}</span>
          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {showDate
              ? entry.createdAt?.slice(0, 10)
              : formatTime(entry.createdAt)}
          </span>
        </div>
        {firstLine && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{firstLine}</p>
        )}
        <p className="text-[11px] text-muted-foreground/60 mt-0.5">{entry.userName}</p>
      </div>
    </div>
  );
}
