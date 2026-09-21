// ============================================================================
// Core Domain Types — Multi-Tenant Inventory SaaS Platform
// ============================================================================

export type Industry = 'school' | 'pharmacy' | 'retail' | 'office' | 'warehouse' | 'other';

export type ModuleId =
  | 'inventory'
  | 'uniforms'
  | 'books'
  | 'student_issue'
  | 'vendors'
  | 'barcode'
  | 'reports'
  | 'pharmacy'
  | 'batches'
  | 'expiry'
  | 'assets'
  | 'procurement'
  | 'maintenance'
  | 'employee_assets';

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  description: string;
  icon: string;
  core: boolean;
  configurable?: boolean;
}

// ─── Org Config ─────────────────────────────────────────────────────────────
// Everything in here is configurable per org.
// recipientLabel = "Student" | "Patient" | "Employee" | "Member" | "Customer"
// identifierLabel = "Roll Number" | "Patient ID" | "Employee ID" | "Member ID"
// groupLabel = "Class" | "Ward" | "Department" | "Branch"
// assignmentLabel = "Issue" | "Loan" | "Checkout" | "Assignment"

export interface OrgConfig {
  recipientLabel: string;
  recipientPluralLabel: string;
  identifierLabel: string;
  groupLabel: string;
  assignmentLabel: string;
  assignmentMode: 'distribution' | 'lending';
  itemUnit: string;
  currencyCode: string;
  currencySymbol: string;
  timezone: string;
  language: string;
  enableFines: boolean;
  enableConditionTracking: boolean;
  fineLabel: string;
}

export const DEFAULT_ORG_CONFIG: OrgConfig = {
  recipientLabel: 'Recipient',
  recipientPluralLabel: 'Recipients',
  identifierLabel: 'ID',
  groupLabel: 'Group',
  assignmentLabel: 'Assignment',
  assignmentMode: 'distribution',
  itemUnit: 'units',
  currencyCode: 'INR',
  currencySymbol: '₹',
  timezone: 'Asia/Kolkata',
  language: 'en',
  enableFines: false,
  enableConditionTracking: true,
  fineLabel: 'Fine',
};

export interface Organization {
  id: string;
  name: string;
  industry: Industry;
  enabledModules: ModuleId[];
  address?: string;
  phone?: string;
  email?: string;
  logoText?: string;
  logoUrl?: string;
  plan: PlanTier;
  subdomain?: string;
  createdAt: string;
  config?: OrgConfig;
}

export type PlanTier = 'starter' | 'professional' | 'enterprise';

export interface Subscription {
  tier: PlanTier;
  name: string;
  price: number;
  pricePeriod: string;
  maxUsers: number;
  maxItems: number;
  maxModules: number;
  features: string[];
  current: boolean;
}

// --- Inventory ---

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Category {
  id: string;
  organizationId: string;
  name: string;
  color?: string;
}

export interface Item {
  id: string;
  organizationId: string;
  name: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  module: ModuleId | 'general';
  quantity: number;
  available: number;
  reserved: number;
  minQuantity?: number;
  reorderQty?: number;
  location: string;
  status: StockStatus;
  lastUpdated: string;
  attributes?: Record<string, string | number | boolean>;
  uniform?: {
    classGrade: string;
    gender: string;
    size: string;
    academicYear: string;
    uniformType: string;
  };
  book?: {
    isbn: string;
    subject: string;
    classGrade: string;
    academicYear: string;
    edition: string;
    publisher: string;
  };
  medicine?: {
    genericName: string;
    manufacturer: string;
    batchNumber: string;
    expiryDate: string;
    manufacturingDate: string;
    mrp: number;
    purchasePrice: number;
    prescriptionRequired: boolean;
  };
}

// --- Transactions ---

export type TransactionType =
  | 'received'
  | 'issued'
  | 'returned'
  | 'adjusted'
  | 'damaged'
  | 'transferred';

export interface StockTransaction {
  id: string;
  organizationId: string;
  date: string;
  itemId: string;
  itemName: string;
  type: TransactionType;
  quantity: number;
  user: string;
  reference: string;
  recipient?: string;
  recipientClass?: string;
  notes?: string;
}

// --- Vendors ---

export interface Vendor {
  id: string;
  organizationId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  vendorType: string;
  status: 'active' | 'inactive';
  purchaseHistory: { date: string; item: string; quantity: number; amount: number }[];
  outstandingOrders: { item: string; quantity: number; expectedDate: string; status: string }[];
  attributes?: Record<string, string | number | boolean>;
}

// --- Users & Roles ---

export type Permission =
  | 'view_inventory'
  | 'create_items'
  | 'edit_items'
  | 'delete_items'
  | 'stock_in'
  | 'stock_out'
  | 'manage_vendors'
  | 'manage_modules'
  | 'manage_users'
  | 'view_reports';

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastActive: string;
}

// ─── Recipient ───────────────────────────────────────────────────────────────
// Generic entity that receives/borrows items.
// Org config controls what this is called (Student / Patient / Employee / Member).

export interface Recipient {
  id: string;
  organizationId: string;
  name: string;
  identifier: string;   // Roll No / Patient ID / Employee ID
  group: string;        // Class / Ward / Department
  contact?: string;
  extraData?: Record<string, string>;
}

// ─── Assignment ──────────────────────────────────────────────────────────────
// Generic issue/return record with full condition + damage + fine tracking.

export type AssignmentStatus =
  | 'issued'
  | 'distributed'
  | 'returned'
  | 'returned_damaged'
  | 'lost'
  | 'fine_pending'
  | 'fine_paid'
  | 'closed';

export type AssignmentMode = 'distribution' | 'lending';
export type FeeStatus = 'unpaid' | 'partial' | 'paid' | 'waived';

export interface Assignment {
  id: string;
  organizationId: string;
  recipientId: string;
  recipientName: string;
  recipientIdentifier: string;
  recipientGroup: string;
  itemId: string;
  itemName: string;
  itemDetails?: string;
  quantity: number;
  conditionIssued: string;
  conditionReturned?: string;
  issueDate: string;
  expectedReturn?: string;
  returnDate?: string;
  status: AssignmentStatus;
  mode: AssignmentMode;
  unitPrice: number;
  feeAmount: number;
  feeStatus: FeeStatus;
  damageNotes?: string;
  fineAmount: number;
  finePaid: boolean;
  issuedBy?: string;
  receivedBy?: string;
  notes?: string;
}

// Legacy alias for backward compatibility in components that haven't been updated
export type Student = Recipient;
export type IssuedItem = Assignment & {
  studentId: string;
  studentName: string;
  studentClass: string;
  condition: string;
};

// --- Batches (Pharmacy) ---

export interface Batch {
  id: string;
  organizationId: string;
  medicineName: string;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  quantity: number;
  status: 'active' | 'expiring_soon' | 'expired';
}

// --- Receipt Templates ---

export interface ReceiptTemplate {
  id: string;
  organizationId: string;
  name: string;
  type: 'uniform_issue' | 'book_issue' | 'stock_receipt' | 'return_receipt' | 'class_issue_report';
  orgName: string;
  orgAddress: string;
  title: string;
  fields: string[];
  showLogo: boolean;
  showSignature: boolean;
  footer: string;
  notes: string;
}

// --- Custom Fields ---

export type CustomFieldType = 'text' | 'number' | 'dropdown' | 'date' | 'boolean';

export type CustomFieldEntity =
  | 'item'
  | 'supplier'
  | 'transaction'
  | 'vendor'
  | 'recipient'
  | 'asset'
  | 'purchase_order';

export interface CustomField {
  id: string;
  organizationId: string;
  name: string;
  type: CustomFieldType;
  options?: string[];
  entity: CustomFieldEntity;
  required: boolean;
  sortOrder: number;
  placeholder?: string;
}

// --- Procurement ---

export type POStatus = 'draft' | 'pending' | 'approved' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

export interface POLineItem {
  id: string;
  poId: string;
  itemId?: string;
  itemName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string;
  organizationId: string;
  poNumber: string;
  vendorName: string;
  vendorId?: string;
  itemsDesc?: string;
  itemCount: number;
  orderedDate?: string;
  expectedDate?: string;
  amount: number;
  status: POStatus;
  raisedBy?: string;
  notes?: string;
  createdAt?: string;
  lineItems?: POLineItem[];
}

// --- Maintenance ---

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export interface MaintenanceTicket {
  id: string;
  organizationId: string;
  ticketId: string;
  asset: string;
  issue?: string;
  reportedBy?: string;
  assignedTo?: string;
  priority: TicketPriority;
  status: TicketStatus;
  reportedDate?: string;
  resolvedDate?: string;
  notes?: string;
  createdAt?: string;
}

// --- Assets ---

export type AssetStatus = 'in_use' | 'available' | 'maintenance' | 'retired';

export interface Asset {
  id: string;
  organizationId: string;
  name: string;
  assetCode?: string;
  assetType?: string;
  assignedTo?: string;
  department?: string;
  location?: string;
  condition: 'Good' | 'Fair' | 'Poor';
  status: AssetStatus;
  purchaseDate?: string;
  value: number;
  notes?: string;
  createdAt?: string;
}

// --- Class Material Templates ---

export interface ClassTemplateItem {
  id: string;
  templateId: string;
  itemId?: string;
  itemName: string;
  quantity: number;
  conditionIssued: string;
  notes?: string;
}

export interface ClassTemplate {
  id: string;
  organizationId: string;
  name: string;
  group: string;
  academicYear?: string;
  notes?: string;
  createdAt?: string;
  items: ClassTemplateItem[];
}

// --- Dashboard KPIs ---

export interface DashboardKPI {
  label: string;
  value: number;
  icon: string;
  variant: 'default' | 'warning' | 'danger' | 'success';
}

export interface CategoryStockData {
  category: string;
  count: number;
}

// --- Vendor Quotation System ---

export interface QuotationItem {
  id: string;
  quotationId: string;
  itemId?: string;
  itemName: string;
  qtyNeeded: number;
}

export interface VendorQuoteItem {
  id: string;
  vendorQuoteId: string;
  quotationItemId: string;
  unitPrice: number | null;
  leadTimeDays: number | null;
  notes?: string;
}

export interface VendorQuote {
  id: string;
  quotationId: string;
  vendorId?: string;
  vendorName: string;
  vendorEmail?: string;
  status: 'invited' | 'quoted' | 'rejected';
  quotedAt?: string;
  notes?: string;
  quoteItems: VendorQuoteItem[];
}

export type QuotationStatus = 'draft' | 'sent' | 'comparing' | 'converted' | 'cancelled';

export interface Quotation {
  id: string;
  organizationId: string;
  title: string;
  status: QuotationStatus;
  notes?: string;
  createdAt?: string;
  items: QuotationItem[];
  vendorQuotes: VendorQuote[];
}
