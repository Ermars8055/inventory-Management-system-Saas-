import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, School, Users, Package, ArrowRight, Trash2, Search, X, Sparkles, CalendarRange, Check, Layers } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { classService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAcademicYearOptions } from '@/utils/academicYear';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/context/AuthContext';
import { capitalizeWords } from '@/lib/formatters';
import type { OrgClass } from '@/types';

const GRADE_PRESETS = [
  { label: 'Primary (1–5)', grades: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'] },
  { label: 'Middle (6–8)', grades: ['Grade 6', 'Grade 7', 'Grade 8'] },
  { label: 'High (9–12)', grades: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'] },
  { label: 'K–12 All', grades: ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'] },
];

const STANDARD_SECTIONS = ['A', 'B', 'C', 'D', 'E'];

export function ClassesPage() {
  const { currentOrg } = useOrganization();
  const { can } = useAuth();
  const canCreate = can('inventory:create');
  const canDelete = can('inventory:delete');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [classes, setClasses] = useState<OrgClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Single create
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', academicYear: '', notes: '' });
  const [saving, setSaving] = useState(false);

  // Batch create
  const [showBatchCreate, setShowBatchCreate] = useState(false);
  const [batchGrades, setBatchGrades] = useState<string[]>(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5']);
  const [batchSections, setBatchSections] = useState<string[]>(['A', 'B']);
  const [batchYear, setBatchYear] = useState('');
  const [customGradeInput, setCustomGradeInput] = useState('');
  const [batchSaving, setBatchSaving] = useState(false);

  // Roll over / Clone year
  const [showCloneYear, setShowCloneYear] = useState(false);
  const [cloneSourceYear, setCloneSourceYear] = useState('');
  const [cloneTargetYear, setCloneTargetYear] = useState('');
  const [cloneCopyTemplates, setCloneCopyTemplates] = useState(true);
  const [cloneSaving, setCloneSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    classes.forEach(c => {
      if (c.academicYear) years.add(c.academicYear);
    });
    return Array.from(years).sort().reverse();
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = cls.name.toLowerCase().includes(q);
        const matchNotes = cls.notes ? cls.notes.toLowerCase().includes(q) : false;
        if (!matchName && !matchNotes) return false;
      }
      if (yearFilter !== 'all' && cls.academicYear !== yearFilter) {
        return false;
      }
      if (statusFilter !== 'all' && cls.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [classes, search, yearFilter, statusFilter]);

  const hasActiveFilters = search.trim() !== '' || yearFilter !== 'all' || statusFilter !== 'all';

  function handleResetFilters() {
    setSearch('');
    setYearFilter('all');
    setStatusFilter('all');
  }

  const loadClasses = () => {
    if (!currentOrg) return;
    classService.getAll().then(setClasses).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadClasses();
  }, [currentOrg]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const cls = await classService.create({
        name: capitalizeWords(form.name.trim()),
        academicYear: form.academicYear || undefined,
        notes: form.notes || undefined,
      });
      setClasses(prev => [...prev, cls]);
      setShowCreate(false);
      setForm({ name: '', academicYear: '', notes: '' });
      navigate(`/classes/${cls.id}`);
    } catch {
      toast({ title: t('Error'), description: t('Failed to create class'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleBatchCreate(e: React.FormEvent) {
    e.preventDefault();
    if (batchGrades.length === 0 || batchSections.length === 0) {
      toast({ title: t('Please select at least one grade and one section'), variant: 'destructive' });
      return;
    }
    setBatchSaving(true);
    try {
      const res = await classService.createBatch({
        grades: batchGrades,
        sections: batchSections,
        academicYear: batchYear || undefined,
      });
      toast({
        title: `${t('Generated')} ${res.createdCount} ${t('classes')}`,
        description: res.skippedCount > 0 ? `${res.skippedCount} ${t('skipped as they already exist')}` : undefined,
      });
      setShowBatchCreate(false);
      loadClasses();
    } catch (err: unknown) {
      toast({
        title: t('Error'),
        description: err instanceof Error ? err.message : t('Failed to batch create classes'),
        variant: 'destructive',
      });
    } finally {
      setBatchSaving(false);
    }
  }

  async function handleCloneYear(e: React.FormEvent) {
    e.preventDefault();
    if (!cloneSourceYear || !cloneTargetYear) {
      toast({ title: t('Please select source and target academic years'), variant: 'destructive' });
      return;
    }
    if (cloneSourceYear === cloneTargetYear) {
      toast({ title: t('Source and target academic year must be different'), variant: 'destructive' });
      return;
    }
    setCloneSaving(true);
    try {
      const res = await classService.cloneYear({
        sourceAcademicYear: cloneSourceYear,
        targetAcademicYear: cloneTargetYear,
        copyTemplateItems: cloneCopyTemplates,
      });
      toast({
        title: `${t('Cloned')} ${res.createdCount} ${t('classes for')} ${cloneTargetYear}`,
        description: res.skippedCount > 0 ? `${res.skippedCount} ${t('already existed')}` : undefined,
      });
      setShowCloneYear(false);
      loadClasses();
    } catch (err: unknown) {
      toast({
        title: t('Error'),
        description: err instanceof Error ? err.message : t('Failed to roll over classes'),
        variant: 'destructive',
      });
    } finally {
      setCloneSaving(false);
    }
  }

  function toggleBatchSection(sec: string) {
    setBatchSections(prev =>
      prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec].sort()
    );
  }

  function addCustomGrade() {
    const val = capitalizeWords(customGradeInput.trim());
    if (val && !batchGrades.includes(val)) {
      setBatchGrades(prev => [...prev, val]);
      setCustomGradeInput('');
    }
  }

  function removeGrade(gradeToRemove: string) {
    setBatchGrades(prev => prev.filter(g => g !== gradeToRemove));
  }

  async function handleDelete(cls: OrgClass, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`${t('Delete class')} "${cls.name}"?`)) return;
    try {
      await classService.delete(cls.id);
      setClasses(prev => prev.filter(c => c.id !== cls.id));
      toast({ title: t('Deleted') });
    } catch {
      toast({ title: t('Error'), description: t('Failed to delete'), variant: 'destructive' });
    }
  }

  if (!currentOrg) return null;

  const totalBatchCombinations = batchGrades.length * batchSections.length;

  return (
    <div>
      <PageHeader
        title={t('Classes')}
        description={t('Manage classes, enrol students, assign items and collect fees')}
        actions={
          canCreate ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCloneYear(true)}>
                <CalendarRange className="h-4 w-4 mr-1.5 text-blue-600" />
                <span className="hidden sm:inline">{t('Roll Over Year')}</span>
                <span className="sm:hidden">{t('Roll Over')}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowBatchCreate(true)}>
                <Sparkles className="h-4 w-4 mr-1.5 text-amber-500" />
                <span className="hidden sm:inline">{t('Batch Generator')}</span>
                <span className="sm:hidden">{t('Batch')}</span>
              </Button>
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1" /> {t('New Class')}
              </Button>
            </div>
          ) : undefined
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('Loading…')}</p>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={School}
              title={t('No classes yet')}
              description={t('Generate all your grade sections in 1 click or create individual classes to get started.')}
              action={
                canCreate ? (
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button onClick={() => setShowBatchCreate(true)}>
                      <Sparkles className="h-4 w-4 mr-1.5 text-amber-300" /> {t('Quick Batch Generator')}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreate(true)}>
                      <Plus className="h-4 w-4 mr-1" /> {t('Single Class')}
                    </Button>
                  </div>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Filters Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('Search classes by name or notes…')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {availableYears.length > 0 && (
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={t('All Academic Years')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Academic Years')}</SelectItem>
                  {availableYears.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder={t('All Statuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Statuses')}</SelectItem>
                <SelectItem value="active">{t('Active')}</SelectItem>
                <SelectItem value="closed">{t('Closed')}</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-10 px-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" /> {t('Clear')}
              </Button>
            )}
          </div>

          {/* Active filter count indicator */}
          {hasActiveFilters && (
            <p className="text-xs text-muted-foreground">
              {t('Showing')} {filteredClasses.length} {t('of')} {classes.length} {t('classes')}
            </p>
          )}

          {filteredClasses.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center space-y-3">
                <p className="text-sm font-medium">{t('No classes matching filters')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('Try adjusting your search terms or filters.')}
                </p>
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  {t('Clear Filters')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredClasses.map(cls => {
                const feeProgress = cls.studentCount > 0
                  ? Math.round((cls.distributedCount / cls.studentCount) * 100)
                  : 0;
                return (
                  <Card
                    key={cls.id}
                    data-class-card="true"
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/classes/${cls.id}`)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <School className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{cls.name}</p>
                          {cls.academicYear && (
                            <span className="text-xs text-muted-foreground">{cls.academicYear}</span>
                          )}
                          {cls.status === 'closed' && (
                            <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                              {t('Closed')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" /> {cls.studentCount} {t('students')}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Package className="h-3 w-3" /> {cls.items.length} {t('items')}
                            {cls.totalFeePerStudent > 0 && ` · ₹${cls.totalFeePerStudent}`}
                          </span>
                          {cls.studentCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {cls.distributedCount}/{cls.studentCount} {t('distributed')}
                              {' · '}{cls.paidCount} {t('paid')}
                              {cls.unpaidCount > 0 && <span className="text-amber-600"> · {cls.unpaidCount} {t('pending')}</span>}
                            </span>
                          )}
                        </div>
                        {/* Fee progress bar */}
                        {cls.studentCount > 0 && (
                          <div className="mt-2 h-1 w-full max-w-xs bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${feeProgress}%` }}
                            />
                          </div>
                        )}
                      </div>
                      {canDelete && (
                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={e => handleDelete(cls, e)}
                            className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Single New Class Dialog ────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('New Class')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>{t('Class Name')} *</Label>
              <Input
                required
                autoCapitalize="words"
                placeholder={t('e.g. Grade 5A')}
                value={form.name}
                onChange={e => setForm({ ...form, name: capitalizeWords(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Academic Year')}</Label>
              <Select value={form.academicYear} onValueChange={v => setForm({ ...form, academicYear: v === '__none__' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder={t('Select year')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('None')}</SelectItem>
                  {getAcademicYearOptions().map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('Notes')}</Label>
              <Textarea
                rows={2}
                className="text-sm"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>{t('Cancel')}</Button>
              <Button type="submit" disabled={saving}>
                {saving ? t('Creating…') : t('Create & Open →')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Batch Class Generator Dialog ────────────────────────────────────── */}
      <Dialog open={showBatchCreate} onOpenChange={setShowBatchCreate}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-100 text-amber-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>{t('Batch Class Generator')}</DialogTitle>
                <DialogDescription className="text-xs">
                  {t('Generate all your grade and section combinations in a single click.')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleBatchCreate} className="space-y-4 py-2">
            {/* Quick Presets */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('Quick Presets')}
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {GRADE_PRESETS.map(p => (
                  <Button
                    key={p.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setBatchGrades(p.grades)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Selected Grades */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('Grade Levels')} ({batchGrades.length})
                </Label>
                {batchGrades.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBatchGrades([])}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    {t('Clear all')}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border rounded-md bg-muted/20">
                {batchGrades.map(g => (
                  <Badge key={g} variant="secondary" className="pl-2.5 pr-1 py-1 text-xs flex items-center gap-1">
                    {g}
                    <button
                      type="button"
                      onClick={() => removeGrade(g)}
                      className="h-4 w-4 rounded-full hover:bg-muted inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {batchGrades.length === 0 && (
                  <p className="text-xs text-muted-foreground py-1 px-1">
                    {t('No grades selected. Pick a preset above or type below.')}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={t('Add custom grade (e.g. Pre-K, Grade 6)…')}
                  value={customGradeInput}
                  onChange={e => setCustomGradeInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomGrade();
                    }
                  }}
                  className="h-8 text-xs"
                />
                <Button type="button" size="sm" variant="outline" onClick={addCustomGrade} className="h-8 text-xs shrink-0">
                  <Plus className="h-3 w-3 mr-1" /> {t('Add')}
                </Button>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('Sections to Generate')}
              </Label>
              <div className="flex flex-wrap gap-2">
                {STANDARD_SECTIONS.map(sec => {
                  const active = batchSections.includes(sec);
                  return (
                    <button
                      type="button"
                      key={sec}
                      onClick={() => toggleBatchSection(sec)}
                      className={`h-9 px-4 rounded-md border text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {active && <Check className="h-3.5 w-3.5" />}
                      {t('Section')} {sec}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Academic Year */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('Academic Year')}
              </Label>
              <Select value={batchYear} onValueChange={v => setBatchYear(v === '__none__' ? '' : v)}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder={t('Select academic year')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('No academic year')}</SelectItem>
                  {getAcademicYearOptions().map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview Box */}
            <div className="p-3 bg-muted/40 rounded-lg border text-xs space-y-1.5">
              <div className="flex items-center justify-between font-semibold">
                <span>{t('Generation Summary')}</span>
                <Badge variant={totalBatchCombinations > 0 ? 'default' : 'outline'}>
                  {totalBatchCombinations} {t('classes')}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {totalBatchCombinations > 0 ? (
                  <>
                    {t('Will generate')}:{' '}
                    <span className="font-medium text-foreground">
                      {batchGrades.slice(0, 3).map(g => `${g}A, ${g}B`).join(', ')}
                      {batchGrades.length > 3 ? ` … +${(batchGrades.length - 3) * batchSections.length} more` : ''}
                    </span>
                  </>
                ) : (
                  t('Select at least one grade and section to preview.')
                )}
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBatchCreate(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={batchSaving || totalBatchCombinations === 0}>
                {batchSaving ? t('Generating…') : `${t('Generate')} ${totalBatchCombinations} ${t('Classes')}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Roll Over Year Dialog ───────────────────────────────────────────── */}
      <Dialog open={showCloneYear} onOpenChange={setShowCloneYear}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-100 text-blue-700">
                <CalendarRange className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>{t('Roll Over Academic Year')}</DialogTitle>
                <DialogDescription className="text-xs">
                  {t('Clone existing class structure into the next academic year.')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCloneYear} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('Source Academic Year')} *</Label>
              <Select value={cloneSourceYear} onValueChange={setCloneSourceYear}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={t('Select source year…')} />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {t('Classes from this year will serve as the template.')}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('Target (New) Academic Year')} *</Label>
              <Select value={cloneTargetYear} onValueChange={setCloneTargetYear}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={t('Select target year…')} />
                </SelectTrigger>
                <SelectContent>
                  {getAcademicYearOptions().map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-lg border">
              <input
                type="checkbox"
                id="copyTemplates"
                checked={cloneCopyTemplates}
                onChange={e => setCloneCopyTemplates(e.target.checked)}
                className="mt-0.5 rounded border-gray-300"
              />
              <label htmlFor="copyTemplates" className="text-xs cursor-pointer">
                <span className="font-medium">{t('Copy material and fee item packages')}</span>
                <p className="text-muted-foreground mt-0.5">
                  {t('Each cloned class will automatically receive the same uniform/book items ready for new student enrollment.')}
                </p>
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCloneYear(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={cloneSaving || !cloneSourceYear || !cloneTargetYear}>
                {cloneSaving ? t('Rolling Over…') : t('Roll Over Classes')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
