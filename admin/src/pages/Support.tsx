import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Send } from 'lucide-react';

interface Ticket {
  id: string; orgId: string; orgName: string; subject: string; description: string;
  status: string; priority: string; submittedBy: string; assignedTo?: string;
  createdAt: string; resolvedAt?: string;
}
interface Message { id: string; senderType: string; senderName: string; message: string; createdAt: string }
interface TicketDetail extends Ticket { messages: Message[] }

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  open:        { color: '#2563eb', bg: '#dbeafe', label: 'Open' },
  in_progress: { color: '#a16207', bg: '#fef9c3', label: 'In Progress' },
  resolved:    { color: '#059669', bg: '#d1fae5', label: 'Resolved' },
  closed:      { color: '#6b7280', bg: '#f3f4f6', label: 'Closed' },
};

const PRIORITY_STYLE: Record<string, { color: string }> = {
  low: { color: '#6b7280' }, medium: { color: '#a16207' }, high: { color: '#dc2626' }, critical: { color: '#7c2d12' },
};

export function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<TicketDetail | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => { api.get<Ticket[]>('/support').then(setTickets); }, []);

  async function openTicket(id: string) {
    const detail = await api.get<TicketDetail>(`/support/${id}`);
    setSelected(detail);
  }

  async function handleReply() {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      await api.post(`/support/${selected.id}/reply`, { message: reply });
      setReply('');
      const updated = await api.get<TicketDetail>(`/support/${selected.id}`);
      setSelected(updated);
      api.get<Ticket[]>('/support').then(setTickets);
    } finally { setSending(false); }
  }

  async function updateStatus(id: string, status: string) {
    await api.patch(`/support/${id}`, { status });
    if (selected?.id === id) {
      const updated = await api.get<TicketDetail>(`/support/${id}`);
      setSelected(updated);
    }
    api.get<Ticket[]>('/support').then(setTickets);
    toast({ title: `Ticket ${status}` });
  }

  return (
    <div className="h-full flex gap-5">
      {/* Ticket list */}
      <div className="w-[380px] shrink-0">
        <div className="mb-6">
          <h1 className="font-display" style={{ fontSize: 32, fontWeight: 800, color: '#141414', letterSpacing: '-0.03em' }}>
            <MessageCircle className="inline h-6 w-6 mr-2" style={{ color: '#c9f53c' }} />
            Support
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: '#8a9080' }}>{tickets.length} tickets</p>
        </div>
        <div className="space-y-2">
          {tickets.map(t => {
            const st = STATUS_STYLE[t.status] ?? STATUS_STYLE.open;
            const pr = PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.medium;
            return (
              <div key={t.id} onClick={() => openTicket(t.id)}
                className="rounded-2xl p-4 cursor-pointer transition-all card-shadow"
                style={{ background: selected?.id === t.id ? '#f4f7f2' : '#ffffff', border: selected?.id === t.id ? '1.5px solid #c9f53c' : '1.5px solid transparent' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                  <span className="text-[11px] font-semibold capitalize" style={{ color: pr.color }}>{t.priority}</span>
                </div>
                <p className="text-[14px] font-semibold truncate" style={{ color: '#141414' }}>{t.subject}</p>
                <p className="text-[12px] mt-0.5" style={{ color: '#8a9080' }}>{t.orgName} · {t.submittedBy}</p>
                <p className="text-[11px] font-mono mt-1" style={{ color: '#c0c8b8' }}>{t.createdAt?.slice(0, 10)}</p>
              </div>
            );
          })}
          {tickets.length === 0 && <p className="text-[14px] text-center py-12" style={{ color: '#a0a89a' }}>No tickets</p>}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 rounded-3xl card-shadow flex flex-col" style={{ background: '#ffffff', minHeight: 400 }}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-[14px]" style={{ color: '#a0a89a' }}>Select a ticket</div>
        ) : (
          <>
            <div className="p-5 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[18px] font-bold" style={{ color: '#141414' }}>{selected.subject}</p>
                  <p className="text-[13px] mt-0.5" style={{ color: '#8a9080' }}>{selected.orgName} · {selected.submittedBy}</p>
                </div>
                <div className="flex gap-2">
                  {selected.status !== 'resolved' && (
                    <button onClick={() => updateStatus(selected.id, 'resolved')} className="text-[12px] font-semibold px-3 py-1.5 rounded-xl" style={{ background: '#d1fae5', color: '#059669' }}>Resolve</button>
                  )}
                  {selected.status !== 'closed' && (
                    <button onClick={() => updateStatus(selected.id, 'closed')} className="text-[12px] font-semibold px-3 py-1.5 rounded-xl" style={{ background: '#f3f4f6', color: '#6b7280' }}>Close</button>
                  )}
                </div>
              </div>
              {selected.description && <p className="text-[13px] mt-2 p-3 rounded-xl" style={{ background: '#f4f7f2', color: '#6a7a62' }}>{selected.description}</p>}
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {selected.messages.map(m => (
                <div key={m.id} className={`flex ${m.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[75%] rounded-2xl px-4 py-2.5"
                    style={{ background: m.senderType === 'admin' ? '#141414' : '#f4f7f2', color: m.senderType === 'admin' ? '#fff' : '#141414' }}>
                    <p className="text-[11px] font-semibold mb-0.5 opacity-60">{m.senderName}</p>
                    <p className="text-[13px]">{m.message}</p>
                  </div>
                </div>
              ))}
            </div>
            {selected.status !== 'closed' && selected.status !== 'resolved' && (
              <div className="p-4 border-t flex gap-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply..."
                  onKeyDown={e => e.key === 'Enter' && handleReply()}
                  className="flex-1 h-10 px-4 rounded-xl border outline-none text-[14px]" style={{ borderColor: 'rgba(0,0,0,0.1)' }} />
                <button onClick={handleReply} disabled={sending || !reply.trim()}
                  className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: '#c9f53c' }}>
                  <Send className="h-4 w-4" style={{ color: '#141414' }} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
