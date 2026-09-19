import { useState, useEffect } from 'react';
import { ScrollText, Plus, Pencil, Trash2, ArrowLeftRight } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';

interface AuditEntry {
  id: string; userName: string; action: string; entityType: string;
  entityId: string; detail: string; createdAt: string;
}

const ACTION_CONFIG: Record<string, { icon: typeof Plus; color: string; label: string }> = {
  create: { icon: Plus, color: '#059669', label: 'Created' },
  update: { icon: Pencil, color: '#0891b2', label: 'Updated' },
  delete: { icon: Trash2, color: '#dc2626', label: 'Deleted' },
};

export function ActivityLogPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditEntry[]>([]);

  useEffect(() => { api.get<AuditEntry[]>('/audit-log?limit=200').then(setLogs); }, []);

  return (
    <div>
      <PageHeader title={t("Activity Log")} description={t("Track who changed what across your organization")} />
      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {t('No activity recorded yet')}
            </div>
          ) : (
            <div className="divide-y">
              {logs.map(log => {
                const config = ACTION_CONFIG[log.action] ?? ACTION_CONFIG.update;
                const Icon = config.icon;
                return (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: config.color + '15' }}>
                      <Icon className="h-4 w-4" style={{ color: config.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{log.userName}</span>
                        {' '}
                        <Badge variant="outline" className="text-[10px] mx-1" style={{ color: config.color }}>{t(config.label)}</Badge>
                        {' '}
                        <span className="text-muted-foreground">{log.entityType}</span>
                      </p>
                      {log.detail && <p className="text-xs text-muted-foreground mt-0.5">{log.detail}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">{log.createdAt?.slice(0, 16).replace('T', ' ')}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
