import { useState, useEffect } from 'react';
import { Wrench, AlertTriangle, Clock, CheckCircle, Plus, Trash2, Search } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { maintenanceService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { KPICard } from '@/components/shared/KPICard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import type { MaintenanceTicket, TicketStatus, TicketPriority } from '@/types';

const STATUS_CONFIG: Record<TicketStatus, { label: string; className: string }> = {
  open:        { label: 'Open',        className: 'bg-red-50 text-red-700 border-red-200' },
  in_progress: { label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  resolved:    { label: 'Resolved',    className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  closed:      { label: 'Closed',      className: 'bg-muted text-muted-foreground' },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'text-red-600 font-semibold' },
  high:     { label: 'High',     className: 'text-orange-600 font-medium' },
  medium:   { label: 'Medium',   className: 'text-amber-600' },
  low:      { label: 'Low',      className: 'text-muted-foreground' },
};

const EMPTY_FORM = {
  asset: '', issue: '', reportedBy: '', assignedTo: '',
  priority: 'medium' as TicketPriority, status: 'open' as TicketStatus,
  reportedDate: '', notes: '',
};

export function MaintenancePage() {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const data = await maintenanceService.getByOrganization(currentOrg.id);
      setTickets(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [currentOrg]);

  if (!currentOrg) return null;

  const filtered = tickets.filter((tk) => {
    const matchSearch = !search ||
      tk.ticketId.toLowerCase().includes(search.toLowerCase()) ||
      tk.asset.toLowerCase().includes(search.toLowerCase()) ||
      (tk.issue || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || tk.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || tk.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const open = tickets.filter((tk) => tk.status === 'open').length;
  const inProgress = tickets.filter((tk) => tk.status === 'in_progress').length;
  const resolved = tickets.filter((tk) => tk.status === 'resolved' || tk.status === 'closed').length;
  const critical = tickets.filter((tk) => tk.priority === 'critical' && tk.status !== 'closed').length;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { reportedBy: formReportedBy, ...restForm } = form;
      await maintenanceService.create({
        organizationId: currentOrg!.id,
        reportedBy: formReportedBy || user?.name || 'Staff',
        ...restForm,
      });
      await load();
      setShowCreate(false);
      setForm(EMPTY_FORM);
      toast({ title: t('Maintenance ticket created') });
    } catch {
      toast({ title: t('Error'), description: t('Failed to create ticket'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: TicketStatus) {
    try {
      const updated = await maintenanceService.update(id, { status });
      setTickets((prev) => prev.map((tk) => (tk.id === id ? updated : tk)));
    } catch {
      toast({ title: t('Error'), description: t('Failed to update status'), variant: 'destructive' });
    }
  }

  async function handleDelete(id: string) {
    try {
      await maintenanceService.delete(id);
      setTickets((prev) => prev.filter((tk) => tk.id !== id));
      toast({ title: t('Ticket deleted') });
    } catch {
      toast({ title: t('Error'), description: t('Failed to delete'), variant: 'destructive' });
    }
  }

  const inp = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div>
      <PageHeader
        title={t('Maintenance')}
        description={t('Track and manage maintenance requests and repairs')}
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> {t('New Ticket')}
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard label={t('Open Requests')}      value={open}       icon={Wrench}        variant="danger" />
        <KPICard label={t('In Progress')}        value={inProgress} icon={Clock}         variant="warning" />
        <KPICard label={t('Resolved / Closed')}  value={resolved}   icon={CheckCircle}   variant="success" />
        <KPICard label={t('Critical Priority')}  value={critical}   icon={AlertTriangle} variant="danger" />
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Search tickets, assets, or issues...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('All Statuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Statuses')}</SelectItem>
            {(Object.keys(STATUS_CONFIG) as TicketStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{t(STATUS_CONFIG[s].label)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t('All Priorities')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Priorities')}</SelectItem>
            {(Object.keys(PRIORITY_CONFIG) as TicketPriority[]).map((p) => (
              <SelectItem key={p} value={p}>{t(PRIORITY_CONFIG[p].label)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Ticket ID')}</TableHead>
                <TableHead>{t('Asset / Item')}</TableHead>
                <TableHead>{t('Issue')}</TableHead>
                <TableHead>{t('Reported By')}</TableHead>
                <TableHead>{t('Assigned To')}</TableHead>
                <TableHead>{t('Priority')}</TableHead>
                <TableHead>{t('Reported')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-12">{t('Loading…')}</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                    {t('No maintenance tickets found')}
                  </TableCell>
                </TableRow>
              ) : filtered.map((ticket) => {
                const statusCfg = STATUS_CONFIG[ticket.status];
                const priorityCfg = PRIORITY_CONFIG[ticket.priority];
                return (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{ticket.ticketId}</code>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{ticket.asset}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                      {ticket.issue || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ticket.reportedBy || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ticket.assignedTo || '—'}</TableCell>
                    <TableCell>
                      <span className={`text-sm ${priorityCfg.className}`}>{t(priorityCfg.label)}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ticket.reportedDate || '—'}</TableCell>
                    <TableCell>
                      <Select
                        value={ticket.status}
                        onValueChange={(v) => handleStatusChange(ticket.id, v as TicketStatus)}
                      >
                        <SelectTrigger className="h-7 w-[130px] text-xs">
                          <Badge variant="outline" className={`text-xs ${statusCfg.className} border-0 p-0`}>
                            {t(statusCfg.label)}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_CONFIG) as TicketStatus[]).map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">{t(STATUS_CONFIG[s].label)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleDelete(ticket.id)}
                        className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('New Maintenance Ticket')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Asset / Item')} *</label>
              <input required className={inp} value={form.asset}
                onChange={(e) => setForm({ ...form, asset: e.target.value })}
                placeholder={t('e.g. Projector - Room 105')} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Issue Description')}</label>
              <textarea className={inp} rows={2} value={form.issue}
                onChange={(e) => setForm({ ...form, issue: e.target.value })}
                placeholder={t('Describe the issue…')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Reported By')}</label>
                <input className={inp} value={form.reportedBy}
                  onChange={(e) => setForm({ ...form, reportedBy: e.target.value })}
                  placeholder={user?.name || 'Staff'} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Assigned To')}</label>
                <input className={inp} value={form.assignedTo}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Priority')}</label>
                <select className={inp} value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })}>
                  {(Object.keys(PRIORITY_CONFIG) as TicketPriority[]).map((p) => (
                    <option key={p} value={p}>{t(PRIORITY_CONFIG[p].label)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Report Date')}</label>
                <input type="date" className={inp} value={form.reportedDate}
                  onChange={(e) => setForm({ ...form, reportedDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Notes')}</label>
              <textarea className={inp} rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>{t('Cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving ? t('Creating…') : t('Create Ticket')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
