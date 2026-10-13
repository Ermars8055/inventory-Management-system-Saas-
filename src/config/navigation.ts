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
  CalendarRange,
  School,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  module?: ModuleId;
  permission?: string;
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
        { label: 'Inventory', path: '/inventory', icon: Package, module: 'inventory', permission: 'inventory:read' },
        { label: 'Stock Transactions', path: '/transactions', icon: ArrowLeftRight, module: 'inventory', permission: 'transactions:read' },
      ],
    },
    {
      title: 'Modules',
      items: [
        { label: 'Uniforms', path: '/uniforms', icon: Shirt, module: 'uniforms', permission: 'inventory:read' },
        { label: 'Books', path: '/books', icon: BookOpen, module: 'books', permission: 'inventory:read' },
        // Config-driven labels — "Students" or "Patients" or "Employees" etc.
        { label: 'Classes', path: '/classes', icon: School, permission: 'inventory:read' },
        { label: c.recipientPluralLabel, path: '/recipients', icon: Users2, permission: 'recipients:read' },
        { label: `${c.assignmentLabel}s`, path: '/assignments', icon: UserCheck, permission: 'assignments:read' },
        { label: 'Bulk Issue', path: '/bulk-issue', icon: ClipboardList, module: 'bulk_issue', permission: 'assignments:create' },
        { label: 'Fee Collection', path: '/fees', icon: Wallet, permission: 'assignments:read' },
        { label: 'Class Report', path: '/class-report', icon: FileChartColumn, permission: 'reports:read' },
        { label: 'Medicines', path: '/medicines', icon: Pill, module: 'pharmacy', permission: 'inventory:read' },
        { label: 'Batches', path: '/batches', icon: Layers, module: 'batches', permission: 'inventory:read' },
        { label: 'Expiry Tracking', path: '/expiry', icon: CalendarClock, module: 'expiry', permission: 'inventory:read' },
      ],
    },
    {
      title: 'Extensions',
      items: [
        { label: 'Assets', path: '/assets', icon: Briefcase, module: 'assets', permission: 'inventory:read' },
        { label: 'Procurement', path: '/procurement', icon: ShoppingCart, module: 'procurement', permission: 'vendors:read' },
        { label: 'Vendors', path: '/vendors', icon: Store, permission: 'vendors:read' },
        { label: 'Vendor Quotations', path: '/quotations', icon: FileSearch, permission: 'vendors:read' },
        { label: 'Maintenance', path: '/maintenance', icon: Wrench, module: 'maintenance', permission: 'inventory:read' },
        { label: 'Barcode / QR', path: '/barcode', icon: QrCode, module: 'barcode', permission: 'inventory:read' },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Reports', path: '/reports', icon: BarChart3, module: 'reports', permission: 'reports:read' },
      ],
    },
    {
      title: 'Administration',
      items: [
        { label: 'Users & Roles', path: '/users', icon: Users, permission: 'users:read' },
        { label: 'Modules', path: '/modules', icon: Boxes, permission: 'settings:update' },
        { label: 'Organization', path: '/settings/organization', icon: Building2, permission: 'settings:update' },
        { label: 'Records', path: '/records', icon: CalendarRange, permission: 'settings:read' },
        { label: 'Activity Log', path: '/activity-log', icon: ScrollText, permission: 'settings:read' },
        { label: 'Support', path: '/support', icon: MessageCircle },
        { label: 'Settings', path: '/settings', icon: Settings, permission: 'settings:read' },
      ],
    },
  ];
}
