import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, School, Users, Package, ArrowRight, Trash2 } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import type { OrgClass } from '@/types';

export function ClassesPage() {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [classes, setClasses] = useState<OrgClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', academicYear: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    classService.getAll().then(setClasses).finally(() => setLoading(false));
  }, [currentOrg]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const cls = await classService.create({
        name: form.name,
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

  return (
    <div>
      <PageHeader
        title={t('Classes')}
        description={t('Manage classes, enrol students, assign items and collect fees')}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> {t('New Class')}
          </Button>
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
              description={t('Create a class to start enrolling students and assigning materials.')}
              action={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />{t('New Class')}</Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {classes.map(cls => {
            const feeProgress = cls.studentCount > 0
              ? Math.round((cls.distributedCount / cls.studentCount) * 100)
              : 0;
            return (
              <Card
                key={cls.id}
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
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => handleDelete(cls, e)}
                      className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
                placeholder={t('e.g. Grade 5A')}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
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
    </div>
  );
}
