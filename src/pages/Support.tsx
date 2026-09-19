import { useState, useEffect } from 'react';
import { MessageSquarePlus, MessageCircle, Clock, CheckCircle2, Loader2, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';

interface Ticket { id: string; subject: string; status: string; priority: string; createdAt: string; resolvedAt?: string }
interface Message { id: string; senderType: string; senderName: string; message: string; createdAt: string }
interface TicketDetail extends Ticket { description: string; messages: Message[] }

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  open:        { label: 'Open',        className: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  resolved:    { label: 'Resolved',    className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  closed:      { label: 'Closed',      className: 'bg-muted text-muted-foreground' },
};

export function SupportPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium' });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<TicketDetail | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { api.get<Ticket[]>('/support/tickets').then(setTickets); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/support/tickets', form);
      toast({ title: t('Ticket submitted') });
      setShowCreate(false);
      setForm({ subject: '', description: '', priority: 'medium' });
      api.get<Ticket[]>('/support/tickets').then(setTickets);
    } finally { setSaving(false); }
  }

  async function openTicket(id: string) {
    const detail = await api.get<TicketDetail>(`/support/tickets/${id}`);
    setSelected(detail);
  }

  async function handleReply() {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      await api.post(`/support/tickets/${selected.id}/reply`, { message: reply });
      setReply('');
      const updated = await api.get<TicketDetail>(`/support/tickets/${selected.id}`);
      setSelected(updated);
    } finally { setSending(false); }
  }

  return (
    <div>
      <PageHeader
        title={t("Support")}
        description={t("Need help? Raise a ticket and our team will assist you.")}
        actions={<Button onClick={() => setShowCreate(true)}><MessageSquarePlus className="h-4 w-4 mr-1" /> {t('New Ticket')}</Button>}
      />

      {tickets.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">{t('No support tickets yet.')}</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {tickets.map(tk => {
            const st = STATUS_STYLE[tk.status] ?? STATUS_STYLE.open;
            return (
              <Card key={tk.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => openTicket(tk.id)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <MessageCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tk.subject}</p>
                      <p className="text-xs text-muted-foreground">{tk.createdAt?.slice(0, 10)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={st.className}>{t(st.label)}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('New Support Ticket')}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('Subject')} *</Label>
              <Input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder={t("Brief summary of your issue")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Description')}</Label>
              <Textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t("Describe the issue in detail...")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('Priority')}</Label>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('Low')}</SelectItem>
                  <SelectItem value="medium">{t('Medium')}</SelectItem>
                  <SelectItem value="high">{t('High')}</SelectItem>
                  <SelectItem value="critical">{t('Critical')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>{t('Cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving ? t('Submitting…') : t('Submit Ticket')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ticket detail dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selected?.subject}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="flex-1 overflow-y-auto space-y-3 py-2">
              {selected.description && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">{selected.description}</div>
              )}
              {selected.messages.map(m => (
                <div key={m.id} className={`flex ${m.senderType === 'tenant' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${m.senderType === 'tenant' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p className="text-xs font-medium mb-0.5 opacity-70">{m.senderName}</p>
                    <p>{m.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {selected && selected.status !== 'closed' && selected.status !== 'resolved' && (
            <div className="flex gap-2 pt-2 border-t">
              <Input value={reply} onChange={e => setReply(e.target.value)} placeholder={t("Type a reply...")} onKeyDown={e => e.key === 'Enter' && handleReply()} />
              <Button size="sm" onClick={handleReply} disabled={sending || !reply.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
