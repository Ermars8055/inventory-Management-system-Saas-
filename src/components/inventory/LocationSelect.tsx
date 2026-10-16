import { useState, useEffect, useMemo } from 'react';
import { StorageLocation, LocationRecommendation } from '@/types';
import { locationService } from '@/services';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  MapPin, Sparkles, Plus, Check, ChevronsUpDown, Building2,
  Box, Loader2, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { generateLocationCode } from '@/lib/locationCode';
import { capitalizeWords } from '@/lib/formatters';

interface LocationSelectProps {
  value: string;
  onChange: (locationName: string, locationId?: string) => void;
  categoryName?: string;
  module?: string;
  quantity?: number | string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function LocationSelect({
  value,
  onChange,
  categoryName,
  module,
  quantity,
  placeholder = 'Select or create location…',
  required = false,
  className,
}: LocationSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [recommendations, setRecommendations] = useState<LocationRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [recLoading, setRecLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Inline Quick Add state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocBuilding, setNewLocBuilding] = useState('');
  const [newLocFloor, setNewLocFloor] = useState('');
  const [newLocType, setNewLocType] = useState('classroom');
  const [addingLoc, setAddingLoc] = useState(false);

  // Load all locations
  const fetchLocations = async () => {
    try {
      setLoading(true);
      const data = await locationService.getAll();
      setLocations(data);
    } catch (e) {
      console.error('Failed to load locations', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // Fetch recommendations whenever category, module, or quantity change
  useEffect(() => {
    let cancelled = false;
    const fetchRecs = async () => {
      if (!categoryName && !module) {
        setRecommendations([]);
        return;
      }
      try {
        setRecLoading(true);
        const qtyNum = typeof quantity === 'string' ? parseInt(quantity, 10) || 1 : (quantity || 1);
        const recs = await locationService.getRecommendations({
          categoryName: categoryName || undefined,
          module: module || undefined,
          quantity: qtyNum,
        });
        if (!cancelled) {
          setRecommendations(recs);
        }
      } catch (e) {
        console.error('Failed to load location recommendations', e);
      } finally {
        if (!cancelled) setRecLoading(false);
      }
    };

    fetchRecs();
    return () => { cancelled = true; };
  }, [categoryName, module, quantity]);

  // Filtered locations
  const filtered = useMemo(() => {
    if (!search.trim()) return locations;
    const q = search.toLowerCase();
    return locations.filter(l =>
      l.name.toLowerCase().includes(q) ||
      (l.building && l.building.toLowerCase().includes(q)) ||
      (l.code && l.code.toLowerCase().includes(q))
    );
  }, [locations, search]);

  // Recommended location IDs for fast lookup
  const recMap = useMemo(() => {
    const map = new Map<string, LocationRecommendation>();
    recommendations.forEach(r => map.set(r.id, r));
    return map;
  }, [recommendations]);

  const handleSelect = (loc: StorageLocation) => {
    onChange(loc.name, loc.id);
    setOpen(false);
  };

  const handleSelectName = (name: string, id?: string) => {
    onChange(name, id);
    setOpen(false);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;
    try {
      setAddingLoc(true);
      const existingCodes = locations.map(l => l.code).filter((c): c is string => !!c);
      const autoCode = generateLocationCode(newLocName.trim(), existingCodes);
      const created = await locationService.create({
        name: newLocName.trim(),
        code: autoCode,
        building: newLocBuilding.trim() || undefined,
        floor: newLocFloor.trim() || undefined,
        type: newLocType,
      });
      setLocations(prev => [created, ...prev]);
      onChange(created.name, created.id);
      setNewLocName('');
      setNewLocBuilding('');
      setNewLocFloor('');
      setShowQuickAdd(false);
      setOpen(false);
    } catch (err) {
      console.error('Failed to quick add location', err);
    } finally {
      setAddingLoc(false);
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent/40 focus:outline-none focus:ring-1 focus:ring-ring text-left',
              !value && 'text-muted-foreground'
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <MapPin className={cn('h-4 w-4 shrink-0', value ? 'text-primary' : 'text-muted-foreground')} />
              <span className="truncate">{value || t(placeholder)}</span>
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-[380px] p-0 shadow-lg border rounded-lg overflow-hidden" align="start">
          {/* Header search bar */}
          <div className="flex items-center border-b px-3 py-2 bg-muted/30">
            <MapPin className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder={t('Search or create location…')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-1" />}
          </div>

          <div className="max-h-[340px] overflow-y-auto p-1 text-sm divide-y divide-border/40">
            {/* Recommendations Section */}
            {recommendations.length > 0 && !search && (
              <div className="py-1.5 px-1">
                <div className="flex items-center justify-between px-2 py-1 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    {t('Smart Recommendations')}
                  </span>
                  {recLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
                <div className="space-y-1">
                  {recommendations.slice(0, 3).map(rec => {
                    const isSelected = value === rec.name;
                    return (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => handleSelectName(rec.name, rec.id)}
                        className={cn(
                          'w-full flex flex-col items-start gap-1 p-2 rounded-md transition-colors text-left border border-transparent',
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                            : 'hover:bg-amber-50/60 dark:hover:bg-amber-950/20'
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium text-xs flex items-center gap-1.5">
                            <span className="text-amber-500">★</span>
                            {rec.name}
                          </span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-amber-600" />}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
                          {rec.building && (
                            <span className="inline-flex items-center gap-0.5 text-gray-500">
                              <Building2 className="h-2.5 w-2.5" />
                              {rec.building}
                            </span>
                          )}
                          {rec.recommendationReason && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-amber-50/50 dark:bg-amber-900/20 border-amber-300 text-amber-700 dark:text-amber-300">
                              {rec.recommendationReason}
                            </Badge>
                          )}
                          <span className="text-[10px] text-emerald-600 font-medium">
                            {rec.availableCapacity} {t('capacity free')}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Locations Section */}
            <div className="py-1 px-1">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>{search ? t('Search Results') : t('All Locations')}</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {filtered.length} {t('locations')}
                </span>
              </div>

              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  <p>{t('No locations found matching')} &ldquo;{search}&rdquo;</p>
                  {search.trim() && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2 text-xs h-7 gap-1"
                      onClick={() => {
                        setNewLocName(search.trim());
                        setShowQuickAdd(true);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      {t('Create location')} &ldquo;{search.trim()}&rdquo;
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map(loc => {
                    const isSelected = value === loc.name;
                    const rec = recMap.get(loc.id);
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => handleSelect(loc)}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left group',
                          isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/70 text-foreground'
                        )}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="truncate flex items-center gap-1.5 font-medium">
                            {loc.name}
                            {rec && <span className="text-[10px] text-amber-500">★</span>}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate flex items-center gap-2">
                            {loc.building && <span>{loc.building}</span>}
                            {loc.totalUnits !== undefined && (
                              <span>{loc.totalUnits} {t('units stored')}</span>
                            )}
                          </span>
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Add Form or Action */}
          <div className="border-t p-2 bg-muted/20">
            {!showQuickAdd ? (
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs h-8 justify-start text-primary gap-1.5 font-medium hover:bg-primary/5"
                  onClick={() => setShowQuickAdd(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('+ Add New Storage Location')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleQuickAdd} className="space-y-2 p-1 bg-background border rounded-md shadow-sm">
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Box className="h-3.5 w-3.5 text-primary" />
                    {t('New Storage Location')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQuickAdd(false)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-1.5">
                  <Input
                    placeholder={t('Location Name (e.g. Science Lab B-101)')}
                    value={newLocName}
                    onChange={e => setNewLocName(capitalizeWords(e.target.value))}
                    autoCapitalize="words"
                    required
                    className="h-7 text-xs"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <Input
                      placeholder={t('Building (e.g. Science Block)')}
                      value={newLocBuilding}
                      onChange={e => setNewLocBuilding(capitalizeWords(e.target.value))}
                      autoCapitalize="words"
                      className="h-7 text-xs"
                    />
                    <Input
                      placeholder={t('Floor / Room (e.g. 2nd Floor)')}
                      value={newLocFloor}
                      onChange={e => setNewLocFloor(capitalizeWords(e.target.value))}
                      autoCapitalize="words"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2"
                    onClick={() => setShowQuickAdd(false)}
                  >
                    {t('Cancel')}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={addingLoc || !newLocName.trim()}
                    className="h-6 text-xs px-2.5 gap-1"
                  >
                    {addingLoc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    {t('Save & Select')}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {/* Hidden input to satisfy native form required check if applicable */}
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
