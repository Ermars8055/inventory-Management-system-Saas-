import type {
  Organization,
  Item,
  Category,
  Supplier,
  StockTransaction,
  User,
  Role,
  Student,
  IssuedItem,
  Batch,
  ReceiptTemplate,
  CustomField,
  Subscription,
} from '@/types';

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export const ORGANIZATIONS: Organization[] = [
  {
    id: 'org_school_001',
    name: 'ABC International School',
    industry: 'school',
    enabledModules: ['inventory', 'uniforms', 'books', 'student_issue', 'suppliers', 'barcode', 'reports'],
    address: '123 Education Lane, Bengaluru, KA 560001',
    phone: '+91 80 2345 6789',
    email: 'admin@abcinternationalschool.edu',
    logoText: 'ABC',
    plan: 'professional',
    createdAt: '2026-04-15',
  },
  {
    id: 'org_pharmacy_001',
    name: 'Apollo Medical Store',
    industry: 'pharmacy',
    enabledModules: ['inventory', 'pharmacy', 'batches', 'expiry', 'suppliers', 'barcode', 'reports'],
    address: '45 MG Road, Bengaluru, KA 560001',
    phone: '+91 80 2233 4455',
    email: 'store@apollomedical.in',
    logoText: 'AMS',
    plan: 'professional',
    createdAt: '2026-05-20',
  },
];

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export const SUBSCRIPTIONS: Subscription[] = [
  {
    tier: 'starter',
    name: 'Starter',
    price: 999,
    pricePeriod: 'month',
    maxUsers: 3,
    maxItems: 1000,
    maxModules: 5,
    features: ['3 users', '1,000 inventory items', '5 modules', 'Basic reports'],
    current: false,
  },
  {
    tier: 'professional',
    name: 'Professional',
    price: 2999,
    pricePeriod: 'month',
    maxUsers: 10,
    maxItems: 5000,
    maxModules: 10,
    features: ['10 users', '5,000 inventory items', '10 modules', 'Reports', 'QR / Barcode', 'Custom fields'],
    current: true,
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 7999,
    pricePeriod: 'month',
    maxUsers: 50,
    maxItems: 50000,
    maxModules: 14,
    features: ['50 users', '50,000 inventory items', 'All modules', 'Advanced reports', 'QR / Barcode', 'Custom fields', 'Priority support', 'API access'],
    current: false,
  },
];

// ============================================================================
// ROLES (shared)
// ============================================================================

export const ROLES: Role[] = [
  { id: 'role_admin', name: 'Organization Admin', permissions: ['view_inventory', 'create_items', 'edit_items', 'delete_items', 'stock_in', 'stock_out', 'manage_suppliers', 'manage_modules', 'manage_users', 'view_reports'] },
  { id: 'role_inv_mgr', name: 'Inventory Manager', permissions: ['view_inventory', 'create_items', 'edit_items', 'stock_in', 'stock_out', 'manage_suppliers', 'view_reports'] },
  { id: 'role_store_mgr', name: 'Store Manager', permissions: ['view_inventory', 'create_items', 'edit_items', 'stock_in', 'stock_out', 'view_reports'] },
  { id: 'role_staff', name: 'Staff', permissions: ['view_inventory', 'stock_in', 'stock_out'] },
  { id: 'role_viewer', name: 'Viewer', permissions: ['view_inventory', 'view_reports'] },
];

// ============================================================================
// USERS
// ============================================================================

export const USERS: User[] = [
  { id: 'u1', organizationId: 'org_school_001', name: 'Priya Sharma', email: 'priya@abcinternationalschool.edu', role: 'Organization Admin', status: 'active', lastActive: '2026-09-11 08:45' },
  { id: 'u2', organizationId: 'org_school_001', name: 'Rajesh Kumar', email: 'rajesh@abcinternationalschool.edu', role: 'Inventory Manager', status: 'active', lastActive: '2026-09-11 09:20' },
  { id: 'u3', organizationId: 'org_school_001', name: 'Anita Verma', email: 'anita@abcinternationalschool.edu', role: 'Store Manager', status: 'active', lastActive: '2026-09-10 16:30' },
  { id: 'u4', organizationId: 'org_school_001', name: 'Suresh Patel', email: 'suresh@abcinternationalschool.edu', role: 'Staff', status: 'active', lastActive: '2026-09-11 07:15' },
  { id: 'u5', organizationId: 'org_school_001', name: 'Meena Iyer', email: 'meena@abcinternationalschool.edu', role: 'Viewer', status: 'inactive', lastActive: '2026-08-28 14:00' },
  { id: 'u6', organizationId: 'org_pharmacy_001', name: 'Dr. Vikram Rao', email: 'vikram@apollomedical.in', role: 'Organization Admin', status: 'active', lastActive: '2026-09-11 08:10' },
  { id: 'u7', organizationId: 'org_pharmacy_001', name: 'Sneha Reddy', email: 'sneha@apollomedical.in', role: 'Inventory Manager', status: 'active', lastActive: '2026-09-11 09:05' },
  { id: 'u8', organizationId: 'org_pharmacy_001', name: 'Karthik N', email: 'karthik@apollomedical.in', role: 'Store Manager', status: 'active', lastActive: '2026-09-10 18:45' },
];

// ============================================================================
// CATEGORIES
// ============================================================================

export const CATEGORIES: Category[] = [
  { id: 'cat_s1', organizationId: 'org_school_001', name: 'Uniforms', color: '#2563eb' },
  { id: 'cat_s2', organizationId: 'org_school_001', name: 'Books', color: '#0891b2' },
  { id: 'cat_s3', organizationId: 'org_school_001', name: 'Stationery', color: '#16a34a' },
  { id: 'cat_s4', organizationId: 'org_school_001', name: 'Sports', color: '#ea580c' },
  { id: 'cat_s5', organizationId: 'org_school_001', name: 'Laboratory', color: '#9333ea' },
  { id: 'cat_s6', organizationId: 'org_school_001', name: 'Other', color: '#6b7280' },
  { id: 'cat_p1', organizationId: 'org_pharmacy_001', name: 'Tablets', color: '#2563eb' },
  { id: 'cat_p2', organizationId: 'org_pharmacy_001', name: 'Syrups', color: '#0891b2' },
  { id: 'cat_p3', organizationId: 'org_pharmacy_001', name: 'Injectables', color: '#dc2626' },
  { id: 'cat_p4', organizationId: 'org_pharmacy_001', name: 'Topical', color: '#16a34a' },
  { id: 'cat_p5', organizationId: 'org_pharmacy_001', name: 'Supplements', color: '#ea580c' },
  { id: 'cat_p6', organizationId: 'org_pharmacy_001', name: 'Other', color: '#6b7280' },
];

// ============================================================================
// ITEMS — School
// ============================================================================

export const SCHOOL_ITEMS: Item[] = [
  { id: 'item_s1', organizationId: 'org_school_001', name: 'School Shirt', sku: 'UNI-SH-001', categoryId: 'cat_s1', categoryName: 'Uniforms', module: 'uniforms', quantity: 240, available: 42, reserved: 0, location: 'Main Store', status: 'in_stock', lastUpdated: '2026-09-10',
    uniform: { classGrade: 'Grade 5', gender: 'Boys', size: '32', academicYear: '2026-27', uniformType: 'Shirt' } },
  { id: 'item_s2', organizationId: 'org_school_001', name: 'School Pant', sku: 'UNI-SP-001', categoryId: 'cat_s1', categoryName: 'Uniforms', module: 'uniforms', quantity: 180, available: 180, reserved: 0, location: 'Main Store', status: 'in_stock', lastUpdated: '2026-09-09',
    uniform: { classGrade: 'Grade 5', gender: 'Boys', size: '30', academicYear: '2026-27', uniformType: 'Pant' } },
  { id: 'item_s3', organizationId: 'org_school_001', name: 'School Skirt', sku: 'UNI-SK-001', categoryId: 'cat_s1', categoryName: 'Uniforms', module: 'uniforms', quantity: 120, available: 120, reserved: 0, location: 'Main Store', status: 'in_stock', lastUpdated: '2026-09-08',
    uniform: { classGrade: 'Grade 5', gender: 'Girls', size: '28', academicYear: '2026-27', uniformType: 'Skirt' } },
  { id: 'item_s4', organizationId: 'org_school_001', name: 'Blue Tie', sku: 'UNI-TI-001', categoryId: 'cat_s1', categoryName: 'Uniforms', module: 'uniforms', quantity: 5, available: 5, reserved: 0, location: 'Main Store', status: 'low_stock', lastUpdated: '2026-09-11',
    uniform: { classGrade: 'All', gender: 'Unisex', size: 'Standard', academicYear: '2026-27', uniformType: 'Tie' } },
  { id: 'item_s5', organizationId: 'org_school_001', name: 'Sports Socks', sku: 'UNI-SS-001', categoryId: 'cat_s1', categoryName: 'Uniforms', module: 'uniforms', quantity: 12, available: 12, reserved: 0, location: 'Main Store', status: 'low_stock', lastUpdated: '2026-09-10',
    uniform: { classGrade: 'All', gender: 'Unisex', size: 'Free', academicYear: '2026-27', uniformType: 'Sports Uniform' } },
  { id: 'item_s6', organizationId: 'org_school_001', name: 'School Belt', sku: 'UNI-BL-001', categoryId: 'cat_s1', categoryName: 'Uniforms', module: 'uniforms', quantity: 90, available: 90, reserved: 0, location: 'Main Store', status: 'in_stock', lastUpdated: '2026-09-07',
    uniform: { classGrade: 'All', gender: 'Unisex', size: 'M', academicYear: '2026-27', uniformType: 'Belt' } },
  { id: 'item_s7', organizationId: 'org_school_001', name: 'Blazer', sku: 'UNI-BZ-001', categoryId: 'cat_s1', categoryName: 'Uniforms', module: 'uniforms', quantity: 0, available: 0, reserved: 0, location: 'Main Store', status: 'out_of_stock', lastUpdated: '2026-09-05',
    uniform: { classGrade: 'Grade 8', gender: 'Boys', size: '40', academicYear: '2026-27', uniformType: 'Blazer' } },
  { id: 'item_s8', organizationId: 'org_school_001', name: 'Mathematics Textbook', sku: 'BOOK-MATH-05', categoryId: 'cat_s2', categoryName: 'Books', module: 'books', quantity: 95, available: 95, reserved: 0, location: 'Library Store', status: 'in_stock', lastUpdated: '2026-09-10',
    book: { isbn: '978-81-2345-001-1', subject: 'Mathematics', classGrade: 'Grade 5', academicYear: '2026-27', edition: '3rd', publisher: 'Pearson Education' } },
  { id: 'item_s9', organizationId: 'org_school_001', name: 'English Textbook', sku: 'BOOK-ENG-05', categoryId: 'cat_s2', categoryName: 'Books', module: 'books', quantity: 88, available: 88, reserved: 0, location: 'Library Store', status: 'in_stock', lastUpdated: '2026-09-09',
    book: { isbn: '978-81-2345-002-8', subject: 'English', classGrade: 'Grade 5', academicYear: '2026-27', edition: '2nd', publisher: 'Oxford University Press' } },
  { id: 'item_s10', organizationId: 'org_school_001', name: 'Science Workbook', sku: 'BOOK-SCI-05', categoryId: 'cat_s2', categoryName: 'Books', module: 'books', quantity: 8, available: 8, reserved: 0, location: 'Library Store', status: 'low_stock', lastUpdated: '2026-09-11',
    book: { isbn: '978-81-2345-003-5', subject: 'Science', classGrade: 'Grade 5', academicYear: '2026-27', edition: '1st', publisher: 'NCERT' } },
  { id: 'item_s11', organizationId: 'org_school_001', name: 'History Textbook', sku: 'BOOK-HIS-06', categoryId: 'cat_s2', categoryName: 'Books', module: 'books', quantity: 60, available: 60, reserved: 0, location: 'Library Store', status: 'in_stock', lastUpdated: '2026-09-06',
    book: { isbn: '978-81-2345-004-2', subject: 'History', classGrade: 'Grade 6', academicYear: '2026-27', edition: '4th', publisher: 'Macmillan' } },
  { id: 'item_s12', organizationId: 'org_school_001', name: 'Notebook (200pg)', sku: 'STA-NB-200', categoryId: 'cat_s3', categoryName: 'Stationery', module: 'general', quantity: 500, available: 500, reserved: 0, location: 'Stationery Store', status: 'in_stock', lastUpdated: '2026-09-08' },
  { id: 'item_s13', organizationId: 'org_school_001', name: 'Blue Pen (Box)', sku: 'STA-PN-BL', categoryId: 'cat_s3', categoryName: 'Stationery', module: 'general', quantity: 200, available: 200, reserved: 0, location: 'Stationery Store', status: 'in_stock', lastUpdated: '2026-09-07' },
  { id: 'item_s14', organizationId: 'org_school_001', name: 'Cricket Bat', sku: 'SPO-CR-BT', categoryId: 'cat_s4', categoryName: 'Sports', module: 'general', quantity: 30, available: 30, reserved: 0, location: 'Sports Room', status: 'in_stock', lastUpdated: '2026-09-04' },
  { id: 'item_s15', organizationId: 'org_school_001', name: 'Football', sku: 'SPO-FB-01', categoryId: 'cat_s4', categoryName: 'Sports', module: 'general', quantity: 0, available: 0, reserved: 0, location: 'Sports Room', status: 'out_of_stock', lastUpdated: '2026-09-03' },
  { id: 'item_s16', organizationId: 'org_school_001', name: 'Lab Coat', sku: 'LAB-CO-01', categoryId: 'cat_s5', categoryName: 'Laboratory', module: 'general', quantity: 45, available: 45, reserved: 0, location: 'Lab Store', status: 'in_stock', lastUpdated: '2026-09-02' },
  { id: 'item_s17', organizationId: 'org_school_001', name: 'Test Tubes (Box of 10)', sku: 'LAB-TT-10', categoryId: 'cat_s5', categoryName: 'Laboratory', module: 'general', quantity: 15, available: 15, reserved: 0, location: 'Lab Store', status: 'low_stock', lastUpdated: '2026-09-11' },
];

// ============================================================================
// ITEMS — Pharmacy
// ============================================================================

export const PHARMACY_ITEMS: Item[] = [
  { id: 'item_p1', organizationId: 'org_pharmacy_001', name: 'Paracetamol 500mg', sku: 'MED-PCM-500', categoryId: 'cat_p1', categoryName: 'Tablets', module: 'pharmacy', quantity: 120, available: 120, reserved: 0, location: 'Shelf A1', status: 'in_stock', lastUpdated: '2026-09-10',
    medicine: { genericName: 'Paracetamol', manufacturer: 'ABC Pharma', batchNumber: 'PCM-2026-A17', expiryDate: '08/2028', manufacturingDate: '08/2026', mrp: 25, purchasePrice: 12, prescriptionRequired: false } },
  { id: 'item_p2', organizationId: 'org_pharmacy_001', name: 'Amoxicillin 250mg', sku: 'MED-AMX-250', categoryId: 'cat_p1', categoryName: 'Tablets', module: 'pharmacy', quantity: 80, available: 80, reserved: 0, location: 'Shelf A2', status: 'in_stock', lastUpdated: '2026-09-09',
    medicine: { genericName: 'Amoxicillin', manufacturer: 'Cipla Ltd', batchNumber: 'AMX-2026-B22', expiryDate: '03/2028', manufacturingDate: '03/2026', mrp: 45, purchasePrice: 22, prescriptionRequired: true } },
  { id: 'item_p3', organizationId: 'org_pharmacy_001', name: 'Cetirizine 10mg', sku: 'MED-CTZ-10', categoryId: 'cat_p1', categoryName: 'Tablets', module: 'pharmacy', quantity: 15, available: 15, reserved: 0, location: 'Shelf A3', status: 'low_stock', lastUpdated: '2026-09-11',
    medicine: { genericName: 'Cetirizine', manufacturer: 'Sun Pharma', batchNumber: 'CTZ-2026-C09', expiryDate: '11/2027', manufacturingDate: '11/2025', mrp: 18, purchasePrice: 8, prescriptionRequired: false } },
  { id: 'item_p4', organizationId: 'org_pharmacy_001', name: 'Azithromycin 500mg', sku: 'MED-AZT-500', categoryId: 'cat_p1', categoryName: 'Tablets', module: 'pharmacy', quantity: 0, available: 0, reserved: 0, location: 'Shelf A4', status: 'out_of_stock', lastUpdated: '2026-09-08',
    medicine: { genericName: 'Azithromycin', manufacturer: 'Hetero Drugs', batchNumber: 'AZT-2026-D14', expiryDate: '06/2028', manufacturingDate: '06/2026', mrp: 85, purchasePrice: 40, prescriptionRequired: true } },
  { id: 'item_p5', organizationId: 'org_pharmacy_001', name: 'Cough Syrup 100ml', sku: 'MED-CSY-100', categoryId: 'cat_p2', categoryName: 'Syrups', module: 'pharmacy', quantity: 60, available: 60, reserved: 0, location: 'Shelf B1', status: 'in_stock', lastUpdated: '2026-09-07',
    medicine: { genericName: 'Dextromethorphan', manufacturer: 'Mankind Pharma', batchNumber: 'CSY-2026-E03', expiryDate: '09/2027', manufacturingDate: '09/2025', mrp: 65, purchasePrice: 30, prescriptionRequired: false } },
  { id: 'item_p6', organizationId: 'org_pharmacy_001', name: 'Vitamin C Tablets', sku: 'MED-VTC-01', categoryId: 'cat_p5', categoryName: 'Supplements', module: 'pharmacy', quantity: 200, available: 200, reserved: 0, location: 'Shelf C1', status: 'in_stock', lastUpdated: '2026-09-10',
    medicine: { genericName: 'Ascorbic Acid', manufacturer: 'Nutraceuticals Inc', batchNumber: 'VTC-2026-F08', expiryDate: '12/2028', manufacturingDate: '12/2026', mrp: 30, purchasePrice: 15, prescriptionRequired: false } },
  { id: 'item_p7', organizationId: 'org_pharmacy_001', name: 'Insulin Injection', sku: 'MED-INS-01', categoryId: 'cat_p3', categoryName: 'Injectables', module: 'pharmacy', quantity: 40, available: 40, reserved: 0, location: 'Cold Storage', status: 'in_stock', lastUpdated: '2026-09-09',
    medicine: { genericName: 'Insulin Glargine', manufacturer: 'Biocon', batchNumber: 'INS-2026-G11', expiryDate: '02/2027', manufacturingDate: '02/2026', mrp: 450, purchasePrice: 280, prescriptionRequired: true } },
  { id: 'item_p8', organizationId: 'org_pharmacy_001', name: 'Antiseptic Cream 30g', sku: 'MED-ANT-30', categoryId: 'cat_p4', categoryName: 'Topical', module: 'pharmacy', quantity: 12, available: 12, reserved: 0, location: 'Shelf D1', status: 'low_stock', lastUpdated: '2026-09-11',
    medicine: { genericName: 'Soframycin', manufacturer: 'Roussel India', batchNumber: 'ANT-2025-H05', expiryDate: '09/2026', manufacturingDate: '09/2025', mrp: 55, purchasePrice: 28, prescriptionRequired: false } },
  { id: 'item_p9', organizationId: 'org_pharmacy_001', name: 'Ibuprofen 400mg', sku: 'MED-IBU-400', categoryId: 'cat_p1', categoryName: 'Tablets', module: 'pharmacy', quantity: 150, available: 150, reserved: 0, location: 'Shelf A5', status: 'in_stock', lastUpdated: '2026-09-10',
    medicine: { genericName: 'Ibuprofen', manufacturer: 'Reckitt Benckiser', batchNumber: 'IBU-2026-I19', expiryDate: '10/2028', manufacturingDate: '10/2026', mrp: 35, purchasePrice: 16, prescriptionRequired: false } },
  { id: 'item_p10', organizationId: 'org_pharmacy_001', name: 'Omeprazole 20mg', sku: 'MED-OMP-20', categoryId: 'cat_p1', categoryName: 'Tablets', module: 'pharmacy', quantity: 90, available: 90, reserved: 0, location: 'Shelf A6', status: 'in_stock', lastUpdated: '2026-09-08',
    medicine: { genericName: 'Omeprazole', manufacturer: 'Dr. Reddys', batchNumber: 'OMP-2026-J27', expiryDate: '07/2028', manufacturingDate: '07/2026', mrp: 40, purchasePrice: 20, prescriptionRequired: false } },
  { id: 'item_p11', organizationId: 'org_pharmacy_001', name: 'Metformin 500mg', sku: 'MED-MET-500', categoryId: 'cat_p1', categoryName: 'Tablets', module: 'pharmacy', quantity: 110, available: 110, reserved: 0, location: 'Shelf A7', status: 'in_stock', lastUpdated: '2026-09-09',
    medicine: { genericName: 'Metformin', manufacturer: 'USV Pvt Ltd', batchNumber: 'MET-2026-K33', expiryDate: '01/2029', manufacturingDate: '01/2027', mrp: 28, purchasePrice: 14, prescriptionRequired: false } },
  { id: 'item_p12', organizationId: 'org_pharmacy_001', name: 'Ciprofloxacin 500mg', sku: 'MED-CIP-500', categoryId: 'cat_p1', categoryName: 'Tablets', module: 'pharmacy', quantity: 0, available: 0, reserved: 0, location: 'Shelf A8', status: 'out_of_stock', lastUpdated: '2026-09-06',
    medicine: { genericName: 'Ciprofloxacin', manufacturer: 'Hetero Drugs', batchNumber: 'CIP-2025-L40', expiryDate: '04/2027', manufacturingDate: '04/2025', mrp: 50, purchasePrice: 24, prescriptionRequired: true } },
];

export const ALL_ITEMS = [...SCHOOL_ITEMS, ...PHARMACY_ITEMS];

// ============================================================================
// TRANSACTIONS
// ============================================================================

export const TRANSACTIONS: StockTransaction[] = [
  { id: 'tx1', organizationId: 'org_school_001', date: '2026-09-11 10:32', itemId: 'item_s1', itemName: 'School Shirt', type: 'issued', quantity: -12, user: 'Rajesh Kumar', reference: 'ISS-2026-0421', recipient: 'Arjun Kumar', recipientClass: 'Grade 5 - A' },
  { id: 'tx2', organizationId: 'org_school_001', date: '2026-09-11 09:15', itemId: 'item_s8', itemName: 'Mathematics Textbook', type: 'received', quantity: 45, user: 'Anita Verma', reference: 'PO-2026-0118' },
  { id: 'tx3', organizationId: 'org_school_001', date: '2026-09-10 16:45', itemId: 'item_s5', itemName: 'Sports Socks', type: 'issued', quantity: -20, user: 'Rajesh Kumar', reference: 'ISS-2026-0420', recipient: 'Grade 8 - B', recipientClass: 'Grade 8 - B' },
  { id: 'tx4', organizationId: 'org_school_001', date: '2026-09-10 14:20', itemId: 'item_s2', itemName: 'School Pant', type: 'received', quantity: 50, user: 'Anita Verma', reference: 'PO-2026-0117' },
  { id: 'tx5', organizationId: 'org_school_001', date: '2026-09-10 11:00', itemId: 'item_s8', itemName: 'Mathematics Textbook', type: 'issued', quantity: -15, user: 'Rajesh Kumar', reference: 'ISS-2026-0419', recipient: 'Grade 5 - A', recipientClass: 'Grade 5 - A' },
  { id: 'tx6', organizationId: 'org_school_001', date: '2026-09-09 15:30', itemId: 'item_s9', itemName: 'English Textbook', type: 'issued', quantity: -10, user: 'Rajesh Kumar', reference: 'ISS-2026-0418', recipient: 'Grade 5 - B', recipientClass: 'Grade 5 - B' },
  { id: 'tx7', organizationId: 'org_school_001', date: '2026-09-09 10:15', itemId: 'item_s4', itemName: 'Blue Tie', type: 'adjusted', quantity: -3, user: 'Priya Sharma', reference: 'ADJ-2026-0042' },
  { id: 'tx8', organizationId: 'org_school_001', date: '2026-09-08 13:00', itemId: 'item_s3', itemName: 'School Skirt', type: 'received', quantity: 30, user: 'Anita Verma', reference: 'PO-2026-0116' },
  { id: 'tx9', organizationId: 'org_school_001', date: '2026-09-07 09:45', itemId: 'item_s6', itemName: 'School Belt', type: 'issued', quantity: -8, user: 'Rajesh Kumar', reference: 'ISS-2026-0417', recipient: 'Grade 6 - A', recipientClass: 'Grade 6 - A' },
  { id: 'tx10', organizationId: 'org_school_001', date: '2026-09-05 11:30', itemId: 'item_s7', itemName: 'Blazer', type: 'damaged', quantity: -2, user: 'Priya Sharma', reference: 'DMG-2026-0012' },
  { id: 'tx11', organizationId: 'org_school_001', date: '2026-09-05 08:00', itemId: 'item_s1', itemName: 'School Shirt', type: 'received', quantity: 50, user: 'Anita Verma', reference: 'PO-2026-0115' },
  { id: 'tx12', organizationId: 'org_school_001', date: '2026-09-04 14:00', itemId: 'item_s14', itemName: 'Cricket Bat', type: 'transferred', quantity: -5, user: 'Priya Sharma', reference: 'TRF-2026-0008' },
  // Pharmacy transactions
  { id: 'tx13', organizationId: 'org_pharmacy_001', date: '2026-09-11 09:30', itemId: 'item_p1', itemName: 'Paracetamol 500mg', type: 'issued', quantity: -10, user: 'Sneha Reddy', reference: 'SALE-2026-0845' },
  { id: 'tx14', organizationId: 'org_pharmacy_001', date: '2026-09-11 08:15', itemId: 'item_p2', itemName: 'Amoxicillin 250mg', type: 'issued', quantity: -5, user: 'Sneha Reddy', reference: 'SALE-2026-0844' },
  { id: 'tx15', organizationId: 'org_pharmacy_001', date: '2026-09-10 17:00', itemId: 'item_p1', itemName: 'Paracetamol 500mg', type: 'received', quantity: 100, user: 'Karthik N', reference: 'PO-2026-0220' },
  { id: 'tx16', organizationId: 'org_pharmacy_001', date: '2026-09-10 14:30', itemId: 'item_p3', itemName: 'Cetirizine 10mg', type: 'issued', quantity: -8, user: 'Sneha Reddy', reference: 'SALE-2026-0843' },
  { id: 'tx17', organizationId: 'org_pharmacy_001', date: '2026-09-09 11:00', itemId: 'item_p7', itemName: 'Insulin Injection', type: 'issued', quantity: -3, user: 'Sneha Reddy', reference: 'SALE-2026-0842' },
  { id: 'tx18', organizationId: 'org_pharmacy_001', date: '2026-09-09 09:00', itemId: 'item_p5', itemName: 'Cough Syrup 100ml', type: 'received', quantity: 40, user: 'Karthik N', reference: 'PO-2026-0219' },
  { id: 'tx19', organizationId: 'org_pharmacy_001', date: '2026-09-08 16:00', itemId: 'item_p8', itemName: 'Antiseptic Cream 30g', type: 'issued', quantity: -6, user: 'Sneha Reddy', reference: 'SALE-2026-0841' },
  { id: 'tx20', organizationId: 'org_pharmacy_001', date: '2026-09-08 10:30', itemId: 'item_p4', itemName: 'Azithromycin 500mg', type: 'adjusted', quantity: -20, user: 'Dr. Vikram Rao', reference: 'ADJ-2026-0055' },
];

// ============================================================================
// SUPPLIERS
// ============================================================================

export const SUPPLIERS: Supplier[] = [
  { id: 'sup1', organizationId: 'org_school_001', name: 'ABC Uniform Suppliers', contactPerson: 'Mahesh Gupta', phone: '+91 98765 43210', email: 'mahesh@abcuniforms.com', address: '78 Textile Hub, Bengaluru, KA 560002', itemsSupplied: 'School Uniforms', status: 'active',
    purchaseHistory: [
      { date: '2026-09-05', item: 'School Shirt', quantity: 50, amount: 12500 },
      { date: '2026-08-20', item: 'School Pant', quantity: 50, amount: 10000 },
      { date: '2026-08-10', item: 'School Skirt', quantity: 30, amount: 7500 },
    ],
    outstandingOrders: [
      { item: 'Blazer (Grade 8)', quantity: 20, expectedDate: '2026-09-20', status: 'Pending' },
    ],
  },
  { id: 'sup2', organizationId: 'org_school_001', name: 'Global Book Distributors', contactPerson: 'Lakshmi Nair', phone: '+91 98450 11223', email: 'orders@globalbooks.in', address: '12 Knowledge Park, Bengaluru, KA 560003', itemsSupplied: 'Books', status: 'active',
    purchaseHistory: [
      { date: '2026-09-11', item: 'Mathematics Textbook', quantity: 45, amount: 6750 },
      { date: '2026-08-25', item: 'English Textbook', quantity: 30, amount: 4500 },
      { date: '2026-08-15', item: 'History Textbook', quantity: 25, amount: 3750 },
    ],
    outstandingOrders: [
      { item: 'Science Workbook', quantity: 50, expectedDate: '2026-09-15', status: 'Shipped' },
    ],
  },
  { id: 'sup3', organizationId: 'org_school_001', name: 'Sports Gear India', contactPerson: 'Ramesh Singh', phone: '+91 99876 54321', email: 'info@sportsgear.in', address: '45 Stadium Road, Bengaluru, KA 560004', itemsSupplied: 'Sports Equipment', status: 'active',
    purchaseHistory: [
      { date: '2026-08-30', item: 'Cricket Bat', quantity: 10, amount: 8000 },
      { date: '2026-08-15', item: 'Football', quantity: 5, amount: 2500 },
    ],
    outstandingOrders: [],
  },
  { id: 'sup4', organizationId: 'org_school_001', name: 'Stationery World', contactPerson: 'Deepak Jain', phone: '+91 97000 33445', email: 'sales@stationeryworld.com', address: '90 Commercial St, Bengaluru, KA 560005', itemsSupplied: 'Stationery', status: 'active',
    purchaseHistory: [
      { date: '2026-09-01', item: 'Notebook (200pg)', quantity: 200, amount: 20000 },
      { date: '2026-08-20', item: 'Blue Pen (Box)', quantity: 50, amount: 5000 },
    ],
    outstandingOrders: [],
  },
  { id: 'sup5', organizationId: 'org_pharmacy_001', name: 'ABC Pharma Distributors', contactPerson: 'Naveen Kumar', phone: '+91 98220 55667', email: 'naven@abcpharma.in', address: '33 Pharma Zone, Bengaluru, KA 560010', itemsSupplied: 'Tablets & Capsules', status: 'active',
    purchaseHistory: [
      { date: '2026-09-10', item: 'Paracetamol 500mg', quantity: 100, amount: 1200 },
      { date: '2026-08-28', item: 'Ibuprofen 400mg', quantity: 80, amount: 1280 },
      { date: '2026-08-15', item: 'Metformin 500mg', quantity: 60, amount: 840 },
    ],
    outstandingOrders: [
      { item: 'Azithromycin 500mg', quantity: 50, expectedDate: '2026-09-18', status: 'Pending' },
    ],
  },
  { id: 'sup6', organizationId: 'org_pharmacy_001', name: 'Cipla Direct Supply', contactPerson: 'Aisha Khan', phone: '+91 99330 88990', email: 'aisha@ciplasupply.in', address: '7 Medical Enclave, Bengaluru, KA 560011', itemsSupplied: 'Antibiotics', status: 'active',
    purchaseHistory: [
      { date: '2026-09-05', item: 'Amoxicillin 250mg', quantity: 50, amount: 1100 },
      { date: '2026-08-22', item: 'Ciprofloxacin 500mg', quantity: 40, amount: 960 },
    ],
    outstandingOrders: [],
  },
  { id: 'sup7', organizationId: 'org_pharmacy_001', name: 'Biocon Cold Chain', contactPerson: 'Sanjay Rao', phone: '+91 98111 22334', email: 'cold@biocon.in', address: '21 Biotech Park, Bengaluru, KA 560012', itemsSupplied: 'Injectables & Cold Storage', status: 'active',
    purchaseHistory: [
      { date: '2026-09-01', item: 'Insulin Injection', quantity: 20, amount: 5600 },
    ],
    outstandingOrders: [
      { item: 'Insulin Injection', quantity: 30, expectedDate: '2026-09-25', status: 'Shipped' },
    ],
  },
];

// ============================================================================
// STUDENTS + ISSUED ITEMS (School)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const STUDENTS: Student[] = [
  { id: 'stu1', organizationId: 'org_school_001', name: 'Arjun Kumar', identifier: 'STU-2026-1042', group: 'Grade 5 - A' },
  { id: 'stu2', organizationId: 'org_school_001', name: 'Diya Sharma', identifier: 'STU-2026-1043', group: 'Grade 5 - A' },
  { id: 'stu3', organizationId: 'org_school_001', name: 'Kabir Mehta', identifier: 'STU-2026-1051', group: 'Grade 6 - B' },
  { id: 'stu4', organizationId: 'org_school_001', name: 'Ananya Reddy', identifier: 'STU-2026-1072', group: 'Grade 8 - A' },
  { id: 'stu5', organizationId: 'org_school_001', name: 'Ishaan Gupta', identifier: 'STU-2026-1078', group: 'Grade 8 - B' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ISSUED_ITEMS: IssuedItem[] = (([
  { id: 'iss1', organizationId: 'org_school_001', studentId: 'stu1', studentName: 'Arjun Kumar', studentClass: 'Grade 5 - A', itemId: 'item_s1', itemName: 'School Shirt', itemDetails: 'Size 32', quantity: 1, condition: 'Good', issueDate: '2026-09-10', expectedReturn: '2027-04-30', status: 'issued' },
  { id: 'iss2', organizationId: 'org_school_001', studentId: 'stu1', studentName: 'Arjun Kumar', studentClass: 'Grade 5 - A', itemId: 'item_s2', itemName: 'School Pant', itemDetails: 'Size 30', quantity: 1, condition: 'Good', issueDate: '2026-09-10', expectedReturn: '2027-04-30', status: 'issued' },
  { id: 'iss3', organizationId: 'org_school_001', studentId: 'stu1', studentName: 'Arjun Kumar', studentClass: 'Grade 5 - A', itemId: 'item_s8', itemName: 'Mathematics Textbook', itemDetails: 'Grade 5', quantity: 1, condition: 'New', issueDate: '2026-09-05', expectedReturn: '2027-04-30', status: 'issued' },
  { id: 'iss4', organizationId: 'org_school_001', studentId: 'stu1', studentName: 'Arjun Kumar', studentClass: 'Grade 5 - A', itemId: 'item_s9', itemName: 'English Textbook', itemDetails: 'Grade 5', quantity: 1, condition: 'New', issueDate: '2026-09-05', expectedReturn: '2027-04-30', status: 'issued' },
  { id: 'iss5', organizationId: 'org_school_001', studentId: 'stu2', studentName: 'Diya Sharma', studentClass: 'Grade 5 - A', itemId: 'item_s3', itemName: 'School Skirt', itemDetails: 'Size 28', quantity: 1, condition: 'Good', issueDate: '2026-09-08', expectedReturn: '2027-04-30', status: 'issued' },
  { id: 'iss6', organizationId: 'org_school_001', studentId: 'stu3', studentName: 'Kabir Mehta', studentClass: 'Grade 6 - B', itemId: 'item_s6', itemName: 'School Belt', itemDetails: 'Size M', quantity: 1, condition: 'Good', issueDate: '2026-09-07', status: 'issued' },
  { id: 'iss7', organizationId: 'org_school_001', studentId: 'stu4', studentName: 'Ananya Reddy', studentClass: 'Grade 8 - A', itemId: 'item_s10', itemName: 'Science Workbook', itemDetails: 'Grade 5', quantity: 1, condition: 'New', issueDate: '2026-09-06', status: 'returned', returnDate: '2026-09-09' },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
]) as any[]) as IssuedItem[];

// ============================================================================
// BATCHES (Pharmacy)
// ============================================================================

export const BATCHES: Batch[] = [
  { id: 'b1', organizationId: 'org_pharmacy_001', medicineName: 'Paracetamol 500mg', batchNumber: 'PCM-2026-A17', manufacturingDate: '08/2026', expiryDate: '08/2028', quantity: 120, status: 'active' },
  { id: 'b2', organizationId: 'org_pharmacy_001', medicineName: 'Amoxicillin 250mg', batchNumber: 'AMX-2026-B22', manufacturingDate: '03/2026', expiryDate: '03/2028', quantity: 80, status: 'active' },
  { id: 'b3', organizationId: 'org_pharmacy_001', medicineName: 'Cetirizine 10mg', batchNumber: 'CTZ-2026-C09', manufacturingDate: '11/2025', expiryDate: '11/2027', quantity: 15, status: 'active' },
  { id: 'b4', organizationId: 'org_pharmacy_001', medicineName: 'Azithromycin 500mg', batchNumber: 'AZT-2026-D14', manufacturingDate: '06/2026', expiryDate: '06/2028', quantity: 0, status: 'expired' },
  { id: 'b5', organizationId: 'org_pharmacy_001', medicineName: 'Cough Syrup 100ml', batchNumber: 'CSY-2026-E03', manufacturingDate: '09/2025', expiryDate: '09/2027', quantity: 60, status: 'active' },
  { id: 'b6', organizationId: 'org_pharmacy_001', medicineName: 'Antiseptic Cream 30g', batchNumber: 'ANT-2025-H05', manufacturingDate: '09/2025', expiryDate: '09/2026', quantity: 12, status: 'expiring_soon' },
  { id: 'b7', organizationId: 'org_pharmacy_001', medicineName: 'Insulin Injection', batchNumber: 'INS-2026-G11', manufacturingDate: '02/2026', expiryDate: '02/2027', quantity: 40, status: 'expiring_soon' },
  { id: 'b8', organizationId: 'org_pharmacy_001', medicineName: 'Ciprofloxacin 500mg', batchNumber: 'CIP-2025-L40', manufacturingDate: '04/2025', expiryDate: '04/2027', quantity: 0, status: 'expired' },
  { id: 'b9', organizationId: 'org_pharmacy_001', medicineName: 'Ibuprofen 400mg', batchNumber: 'IBU-2026-I19', manufacturingDate: '10/2026', expiryDate: '10/2028', quantity: 150, status: 'active' },
  { id: 'b10', organizationId: 'org_pharmacy_001', medicineName: 'Omeprazole 20mg', batchNumber: 'OMP-2026-J27', manufacturingDate: '07/2026', expiryDate: '07/2028', quantity: 90, status: 'active' },
  { id: 'b11', organizationId: 'org_pharmacy_001', medicineName: 'Metformin 500mg', batchNumber: 'MET-2026-K33', manufacturingDate: '01/2027', expiryDate: '01/2029', quantity: 110, status: 'active' },
  { id: 'b12', organizationId: 'org_pharmacy_001', medicineName: 'Vitamin C Tablets', batchNumber: 'VTC-2026-F08', manufacturingDate: '12/2026', expiryDate: '12/2028', quantity: 200, status: 'active' },
];

// ============================================================================
// RECEIPT TEMPLATES
// ============================================================================

export const RECEIPT_TEMPLATES: ReceiptTemplate[] = [
  { id: 'rt1', organizationId: 'org_school_001', name: 'Uniform Issue Receipt', type: 'uniform_issue', orgName: 'ABC INTERNATIONAL SCHOOL', orgAddress: '123 Education Lane, Bengaluru, KA 560001', title: 'UNIFORM ISSUE RECEIPT', fields: ['Student', 'Class', 'Academic Year'], showLogo: true, showSignature: true, footer: 'This receipt must be retained for the academic year.', notes: 'Items must be returned in good condition at end of academic year.' },
  { id: 'rt2', organizationId: 'org_school_001', name: 'Book Issue Receipt', type: 'book_issue', orgName: 'ABC INTERNATIONAL SCHOOL', orgAddress: '123 Education Lane, Bengaluru, KA 560001', title: 'BOOK ISSUE RECEIPT', fields: ['Student', 'Class', 'Academic Year'], showLogo: true, showSignature: true, footer: 'Books must be returned before final exams.', notes: 'Damage to books may incur a replacement fee.' },
  { id: 'rt3', organizationId: 'org_school_001', name: 'Stock Receipt', type: 'stock_receipt', orgName: 'ABC INTERNATIONAL SCHOOL', orgAddress: '123 Education Lane, Bengaluru, KA 560001', title: 'STOCK RECEIPT', fields: ['Supplier', 'Date', 'Reference'], showLogo: true, showSignature: false, footer: 'Goods received in good condition.', notes: '' },
  { id: 'rt4', organizationId: 'org_school_001', name: 'Return Receipt', type: 'return_receipt', orgName: 'ABC INTERNATIONAL SCHOOL', orgAddress: '123 Education Lane, Bengaluru, KA 560001', title: 'RETURN RECEIPT', fields: ['Student', 'Class', 'Return Date'], showLogo: true, showSignature: true, footer: '', notes: 'Item condition will be assessed upon return.' },
  { id: 'rt5', organizationId: 'org_pharmacy_001', name: 'Stock Receipt', type: 'stock_receipt', orgName: 'APOLLO MEDICAL STORE', orgAddress: '45 MG Road, Bengaluru, KA 560001', title: 'STOCK RECEIPT', fields: ['Supplier', 'Date', 'Reference'], showLogo: true, showSignature: false, footer: 'Medicines received and verified.', notes: 'Check batch numbers and expiry dates.' },
];

// ============================================================================
// CUSTOM FIELDS
// ============================================================================

export const CUSTOM_FIELDS: CustomField[] = [
  { id: 'cf1', organizationId: 'org_school_001', name: 'Academic Year', type: 'dropdown', options: ['2025-26', '2026-27', '2027-28'], entity: 'item' },
  { id: 'cf2', organizationId: 'org_school_001', name: 'Department', type: 'text', entity: 'item' },
  { id: 'cf3', organizationId: 'org_school_001', name: 'Reorder Level', type: 'number', entity: 'item' },
  { id: 'cf4', organizationId: 'org_pharmacy_001', name: 'Storage Temperature', type: 'dropdown', options: ['Room Temp', 'Cold Storage (2-8°C)', 'Frozen (-20°C)'], entity: 'item' },
  { id: 'cf5', organizationId: 'org_pharmacy_001', name: 'GST Rate', type: 'number', entity: 'item' },
];
