import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  variant?: 'default' | 'warning' | 'danger' | 'success';
  format?: boolean;
}

const VARIANT_STYLES = {
  default: 'text-blue-600 bg-blue-50',
  warning: 'text-amber-600 bg-amber-50',
  danger: 'text-red-600 bg-red-50',
  success: 'text-emerald-600 bg-emerald-50',
};

export function KPICard({ label, value, icon: Icon, variant = 'default', format = true }: KPICardProps) {
  const displayValue = typeof value === 'number' && format ? value.toLocaleString('en-IN') : value;
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight mt-1">{displayValue}</p>
          </div>
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-lg', VARIANT_STYLES[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
