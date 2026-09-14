import { cn } from '@/lib/utils';
import type { StockStatus } from '@/types';

interface StatusBadgeProps {
  status: StockStatus | string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  in_stock: { label: 'In Stock', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  low_stock: { label: 'Low Stock', className: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  out_of_stock: { label: 'Out of Stock', className: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-500 border-gray-200', dot: 'bg-gray-400' },
  expiring_soon: { label: 'Expiring Soon', className: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  expired: { label: 'Expired', className: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  issued: { label: 'Issued', className: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  returned: { label: 'Returned', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium', config.className, className)}>
      <span className={cn('status-dot', config.dot)} />
      {config.label}
    </span>
  );
}
