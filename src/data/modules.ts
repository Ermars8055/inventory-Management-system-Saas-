import type { ModuleDefinition, Industry, ModuleId } from '@/types';

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  { id: 'inventory', name: 'Inventory Management', description: 'Core inventory functionality — items, stock levels, locations.', icon: 'Package', core: true },
  { id: 'vendors', name: 'Vendor Management', description: 'Manage vendors, contacts, purchase history, and outstanding orders.', icon: 'Store', core: true },
  { id: 'reports', name: 'Reports & Analytics', description: 'Stock reports, transaction summaries, and inventory insights.', icon: 'BarChart3', core: true },
  { id: 'uniforms', name: 'Uniform Management', description: 'Manage uniforms by class, gender, size and academic year.', icon: 'Shirt', core: false, configurable: true },
  { id: 'books', name: 'Book Management', description: 'Manage books with ISBN, subject, class, edition and publisher.', icon: 'BookOpen', core: false, configurable: true },
  { id: 'student_issue', name: 'Student Issue / Return', description: 'Issue and return items to students with a full workflow.', icon: 'UserCheck', core: false, configurable: true },
  { id: 'pharmacy', name: 'Pharmacy Management', description: 'Manage medicines, generic names, manufacturers and prescriptions.', icon: 'Pill', core: false, configurable: true },
  { id: 'batches', name: 'Batch Management', description: 'Track medicine batches with manufacturing and expiry dates.', icon: 'Layers', core: false, configurable: true },
  { id: 'expiry', name: 'Expiry Tracking', description: 'Monitor medicines expiring soon and expired stock.', icon: 'CalendarClock', core: false, configurable: true },
  { id: 'barcode', name: 'Barcode / QR', description: 'Generate and scan barcodes and QR codes for items.', icon: 'QrCode', core: false },
  { id: 'assets', name: 'Asset Management', description: 'Track organizational assets with depreciation and assignments.', icon: 'Briefcase', core: false },
  { id: 'procurement', name: 'Procurement', description: 'Manage purchase orders, approvals, and vendor procurement.', icon: 'ShoppingCart', core: false },
  { id: 'maintenance', name: 'Maintenance', description: 'Schedule and track maintenance for assets and equipment.', icon: 'Wrench', core: false },
  { id: 'employee_assets', name: 'Employee Asset Allocation', description: 'Allocate assets to employees and track assignments.', icon: 'Users', core: false },
];

export function getModuleDef(id: ModuleId): ModuleDefinition | undefined {
  return MODULE_DEFINITIONS.find((m) => m.id === id);
}

export const INDUSTRY_RECOMMENDATIONS: Record<Industry, ModuleId[]> = {
  school: ['inventory', 'uniforms', 'books', 'student_issue', 'vendors', 'barcode', 'reports'],
  pharmacy: ['inventory', 'pharmacy', 'batches', 'expiry', 'vendors', 'barcode', 'reports'],
  retail: ['inventory', 'vendors', 'barcode', 'reports'],
  office: ['inventory', 'assets', 'employee_assets', 'vendors', 'reports'],
  warehouse: ['inventory', 'vendors', 'barcode', 'reports'],
  other: ['inventory', 'vendors', 'reports'],
};

export const INDUSTRY_LABELS: Record<Industry, string> = {
  school: 'Education',
  pharmacy: 'Pharmacy',
  retail: 'Retail',
  office: 'Office',
  warehouse: 'Warehouse',
  other: 'Other',
};
