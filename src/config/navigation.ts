import type { ModuleId, OrgConfig } from '@/types';
import { DEFAULT_ORG_CONFIG } from '@/types';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Truck,
  Shirt,
  BookOpen,
  UserCheck,
  Users2,
  Pill,
  Layers,
  CalendarClock,
  BarChart3,
  Users,
  Settings,
  Boxes,
  QrCode,
  Briefcase,
  ShoppingCart,
  Wrench,
  Building2,
  ClipboardList,
  FileChartColumn,
  FileSearch,
  Store,
  MessageCircle,
  ScrollText,
  School,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  module?: ModuleId;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Returns nav sections with org-config-driven labels.
 * Call with currentOrg.config so labels reflect the org type.
 */
export function getNavSections(config?: OrgConfig): NavSection[] {
  const c = config ? { ...DEFAULT_ORG_CONFIG, ...config } : DEFAULT_ORG_CONFIG;

  return [
    {
      title: '',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Inventory',
      items: [
        { label: 'Inventory', path: '/inventory', icon: Package, module: 'inventory' },
        { label: 'Stock Transactions', path: '/transactions', icon: ArrowLeftRight, module: 'inventory' },
      ],
    },
    {
      title: 'Modules',
      items: [
        { label: 'Uniforms', path: '/uniforms', icon: Shirt, module: 'uniforms' },
        { label: 'Books', path: '/books', icon: BookOpen, module: 'books' },
        // Config-driven labels — "Students" or "Patients" or "Employees" etc.
        { label: 'Classes', path: '/classes', icon: School },
        { label: c.recipientPluralLabel, path: '/recipients', icon: Users2 },
        { label: `${c.assignmentLabel}s`, path: '/assignments', icon: UserCheck },
        { label: 'Bulk Issue', path: '/bulk-issue', icon: ClipboardList },
        { label: 'Fee Collection', path: '/fees', icon: Wallet },
        { label: 'Class Report', path: '/class-report', icon: FileChartColumn },
        { label: 'Medicines', path: '/medicines', icon: Pill, module: 'pharmacy' },
        { label: 'Batches', path: '/batches', icon: Layers, module: 'batches' },
        { label: 'Expiry Tracking', path: '/expiry', icon: CalendarClock, module: 'expiry' },
      ],
    },
    {
      title: 'Extensions',
      items: [
        { label: 'Assets', path: '/assets', icon: Briefcase, module: 'assets' },
        { label: 'Procurement', path: '/procurement', icon: ShoppingCart, module: 'procurement' },
        { label: 'Vendors', path: '/vendors', icon: Store },
        { label: 'Vendor Quotations', path: '/quotations', icon: FileSearch },
        { label: 'Maintenance', path: '/maintenance', icon: Wrench, module: 'maintenance' },
        { label: 'Barcode / QR', path: '/barcode', icon: QrCode, module: 'barcode' },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Reports', path: '/reports', icon: BarChart3, module: 'reports' },
      ],
    },
    {
      title: 'Administration',
      items: [
        { label: 'Users & Roles', path: '/users', icon: Users },
        { label: 'Modules', path: '/modules', icon: Boxes },
        { label: 'Organization', path: '/settings/organization', icon: Building2 },
        { label: 'Activity Log', path: '/activity-log', icon: ScrollText },
        { label: 'Support', path: '/support', icon: MessageCircle },
        { label: 'Settings', path: '/settings', icon: Settings },
      ],
    },
  ];
}
