export interface ElementExplanation {
  title: string;
  category: string;
  whatItIs: string;
  whyItMatters?: string;
  howToUse: string;
  proTip?: string;
  actions?: { label: string; path?: string }[];
}

export interface PageRule {
  pathPrefix: string;
  pageTitle: string;
  pagePurpose: string;
  inspectors: {
    // Matches by selector, text, attribute, or semantic role
    match: (el: HTMLElement, text: string, textLower: string) => boolean;
    explanation: ElementExplanation;
  }[];
}

export const PAGE_RULES: PageRule[] = [
  // ─── 1. STUDENTS / RECIPIENTS PAGE (/recipients) ───────────────────────────
  {
    pathPrefix: '/recipients',
    pageTitle: 'Students & Recipients',
    pagePurpose: 'Directory of all students, pupils, or personnel who receive school uniforms, books, and inventory items.',
    inspectors: [
      {
        // Student Profile Card
        match: (el, text, t) => {
          return Boolean(
            el.closest('.card, [role="button"]') &&
            (t.includes('roll number') || t.includes('class') || t.includes('grade') || el.closest('[data-student-card]'))
          );
        },
        explanation: {
          title: 'Student Profile Card',
          category: 'STUDENT ROSTER',
          whatItIs: 'Represents an enrolled student in your institution, displaying their full name, roll number / student ID, assigned class/section, and contact number.',
          whyItMatters: 'Centralizes each student\'s profile. Clicking on this card opens their complete history of issued uniforms, textbooks, fee receipts, and return status.',
          howToUse: 'Click this card to view the student\'s profile, issue items, collect fees, print formal receipts, or transfer the student to another section.',
          proTip: 'Use the Class Filter dropdown above to view only students in a specific class or grade.',
          actions: [{ label: 'View Student Profile', path: '/recipients' }],
        },
      },
      {
        // Add Student Button
        match: (el, text, t) => {
          return (t.includes('add student') || t.includes('add recipient') || (t.includes('add') && el.tagName === 'BUTTON'));
        },
        explanation: {
          title: 'Add New Student',
          category: 'ENROLLMENT',
          whatItIs: 'Opens the registration form to enroll a new student into your school roster.',
          whyItMatters: 'Enrolled students can immediately be assigned school uniforms, books, and class material kits.',
          howToUse: 'Click to open the form. Enter the student\'s full name, roll number, select their class/grade, and add parent contact details.',
          proTip: 'If you have dozens of students, use the "Import" button to upload your entire Excel/CSV roster at once.',
        },
      },
      {
        // Search Input
        match: (el, text, t) => {
          return el.tagName === 'INPUT' && (t.includes('search') || t.includes('roll') || t.includes('name'));
        },
        explanation: {
          title: 'Student Quick Search',
          category: 'ROSTER NAVIGATION',
          whatItIs: 'Live search bar to locate any student instantly by typing their name, student roll number, or identifier.',
          whyItMatters: 'Saves time when looking up a specific student during fee collection, item returns, or issuing uniform replacements.',
          howToUse: 'Type any part of the student\'s name or roll number (e.g., "Arjun" or "102"). The list filters automatically as you type.',
        },
      },
      {
        // Class Filter Dropdown
        match: (el, text, t) => {
          return Boolean(
            (el.tagName === 'BUTTON' || el.tagName === 'SELECT' || el.closest('[role="combobox"]')) &&
            (t.includes('class') || t.includes('all classes') || t.includes('grade'))
          );
        },
        explanation: {
          title: 'Class & Section Filter',
          category: 'ROSTER FILTER',
          whatItIs: 'Filters the student roster to display only students enrolled in a specific class, grade, or section.',
          whyItMatters: 'Allows school administrators and teachers to review class strength, track uniform distribution, and verify classroom cohorts without distraction.',
          howToUse: 'Click the dropdown and select a class (e.g. "Class 1-A" or "Grade 7B") to isolate that section.',
        },
      },
      {
        // Custom Fields Button on Students Page
        match: (el, text, t) => {
          return t.includes('custom fields') && (el.tagName === 'BUTTON' || Boolean(el.closest('button')));
        },
        explanation: {
          title: 'Student Custom Fields',
          category: 'STUDENT ATTRIBUTES',
          whatItIs: 'Configure custom data attributes specifically for students (such as Blood Group, Emergency Contact, Guardian Name, or House).',
          whyItMatters: 'Gives you complete institutional flexibility to record extra student information without code changes.',
          howToUse: 'Click to open the Custom Fields panel and add new student attributes.',
        },
      },
      {
        // Import / Export CSV Buttons
        match: (el, text, t) => {
          return (t.includes('import') || t.includes('export')) && (el.tagName === 'BUTTON' || Boolean(el.closest('button')));
        },
        explanation: {
          title: 'Student CSV Bulk Import & Export',
          category: 'DATA MANAGEMENT',
          whatItIs: 'Upload or download your school\'s complete student roster via spreadsheet (CSV/Excel).',
          whyItMatters: 'Enables importing hundreds of students in seconds during term opening instead of typing each record manually.',
          howToUse: 'Click "Import" -> Download the sample CSV template -> Paste your student roster -> Upload to enroll all students at once.',
        },
      },
      {
        // Class Cohort Section Header
        match: (el, text, t) => {
          return Boolean(el.tagName.match(/^H[1-6]$/) || el.classList.contains('font-semibold')) && (t.includes('class:') || t.includes('grade:'));
        },
        explanation: {
          title: 'Class Cohort Header',
          category: 'CLASS GROUPING',
          whatItIs: 'Section header grouping all students registered under this specific class and academic session.',
          whyItMatters: 'Displays the total student count in this section at a glance.',
          howToUse: 'Students are automatically organized under their class header. Click any student card within this group to view their details.',
        },
      },
    ],
  },

  // ─── 2. INVENTORY CATALOG (/inventory) ────────────────────────────────────
  {
    pathPrefix: '/inventory',
    pageTitle: 'Inventory Catalog',
    pagePurpose: 'Master repository of all items, uniforms, textbooks, stock counts, SKUs, and reorder levels.',
    inspectors: [
      {
        // Item Row / Card
        match: (el, text, t) => {
          return Boolean(
            el.closest('tr, .card, [data-inventory-card], [data-inventory-row]') &&
            (t.includes('sku') || t.includes('in stock') || t.includes('qty') || t.includes('avail') || el.closest('[data-inventory-card], [data-inventory-row]'))
          );
        },
        explanation: {
          title: 'Inventory Item Record',
          category: 'INVENTORY CATALOG',
          whatItIs: 'Represents a distinct tracked product in your inventory (e.g. School Shirt Size 32, Mathematics Grade 10 Textbook).',
          whyItMatters: 'Displays current physical quantity on hand, SKU code, category, storage location, and unit price.',
          howToUse: 'Click on the item to view its complete transaction history, variant sizes, batches, and issuance ledger.',
          proTip: 'Items highlighted in yellow/red have reached their Reorder Level and need purchasing.',
          actions: [{ label: 'View Item Detail', path: '/inventory' }],
        },
      },
      {
        // Add Item Button
        match: (el, text, t) => {
          return (t.includes('add item') || t.includes('new item')) && (el.tagName === 'BUTTON' || Boolean(el.closest('button')));
        },
        explanation: {
          title: 'Add New Inventory Item',
          category: 'CATALOG CREATION',
          whatItIs: 'Opens the item creation form to register a new product into your catalog.',
          whyItMatters: 'Registers the product name, SKU, category (Uniforms, Books, Stationery), initial quantity, storage location, and reorder threshold.',
          howToUse: 'Click to open the dialog. Select the category module, enter product details, and set a safety reorder level.',
        },
      },
      {
        // Reorder Quantity / Threshold
        match: (el, text, t) => {
          return t.includes('reorder') || t.includes('low stock') || t.includes('threshold');
        },
        explanation: {
          title: 'Reorder Level (Safety Stock Threshold)',
          category: 'STOCK MANAGEMENT',
          whatItIs: 'The minimum quantity that triggers automatic low-stock alerts before you run out of inventory.',
          whyItMatters: 'Prevents stockouts during critical school term openings or daily warehouse operations.',
          howToUse: 'Set this to the estimated units consumed while waiting for a supplier delivery (e.g. 20 uniforms).',
        },
      },
      {
        // SKU Code
        match: (el, text, t) => {
          return t.includes('sku') || t.startsWith('sku:');
        },
        explanation: {
          title: 'SKU (Stock Keeping Unit)',
          category: 'IDENTIFICATION',
          whatItIs: 'A unique code identifying this specific product size, color, or edition (e.g. UNI-SHIRT-M-BLU).',
          whyItMatters: 'Guarantees accurate picking and prevents confusing different sizes or editions of identical-looking items.',
          howToUse: 'Use consistent alphanumeric codes like [CATEGORY]-[NAME]-[SIZE].',
        },
      },
      {
        // Storage Location Badge
        match: (el, text, t) => {
          return t.includes('aisle') || t.includes('shelf') || t.includes('bin') || t.includes('location:');
        },
        explanation: {
          title: 'Assigned Storage Location',
          category: 'WAREHOUSE STORAGE',
          whatItIs: 'The physical warehouse shelf, rack, or bin coordinate where this item is stored.',
          whyItMatters: 'Allows warehouse and school store staff to locate the item within seconds.',
          howToUse: 'Transfer items between locations using the Locations page to maintain real-time shelf accuracy.',
        },
      },
    ],
  },

  // ─── 3. CLASSES PAGE (/classes) ───────────────────────────────────────────
  {
    pathPrefix: '/classes',
    pageTitle: 'Class Registry & Academic Sessions',
    pagePurpose: 'Manage school grades, sections, student rosters, academic years, and annual class promotions.',
    inspectors: [
      {
        // Class Card
        match: (el, text, t) => {
          return Boolean(
            el.closest('.card, [role="button"], [data-class-card]') &&
            (t.includes('students') || t.includes('teacher') || t.includes('room') || t.includes('class') || el.closest('[data-class-card]'))
          );
        },
        explanation: {
          title: 'Class / Grade Card',
          category: 'ACADEMIC STRUCTURE',
          whatItIs: 'Represents a registered classroom cohort (e.g. Class 10-A) in the current academic year.',
          whyItMatters: 'Organizes enrolled students, assigned uniform kits, textbook bundles, and student fee packages.',
          howToUse: 'Click on the class to view its enrolled students, assign class material kits, collect fees, or promote the class to next year.',
          actions: [{ label: 'Open Class Detail', path: '/classes' }],
        },
      },
      {
        // Roll Over / Clone Academic Year Button
        match: (el, text, t) => {
          return (t.includes('roll over') || t.includes('clone year') || t.includes('clone academic')) && (el.tagName === 'BUTTON' || Boolean(el.closest('button')));
        },
        explanation: {
          title: 'Roll Over Academic Year',
          category: 'SESSION MIGRATION',
          whatItIs: 'One-click tool that replicates your entire class structure into a new academic session (e.g. 2026-2027 -> 2027-2028).',
          whyItMatters: 'Saves hours of manual class creation when beginning a new school year.',
          howToUse: 'Click the button, specify the new academic year name, and confirm. All classes and sections are cloned instantly.',
        },
      },
      {
        // Batch Create Button
        match: (el, text, t) => {
          return (t.includes('batch') || t.includes('generator')) && (el.tagName === 'BUTTON' || Boolean(el.closest('button')));
        },
        explanation: {
          title: 'Batch Class Generator',
          category: 'RAPID SETUP',
          whatItIs: 'A generator that creates multiple grades and sections simultaneously (e.g. Grades 1 to 12, sections A, B, C).',
          whyItMatters: 'Creates 30+ classes in 5 seconds instead of creating each class manually one by one.',
          howToUse: 'Select the range of grades and desired section letters, select academic year, and click Create.',
        },
      },
      {
        // Create Class Button
        match: (el, text, t) => {
          return (t.includes('new class') || t.includes('single class') || t.includes('create class') || t.includes('add class')) && (el.tagName === 'BUTTON' || Boolean(el.closest('button')));
        },
        explanation: {
          title: 'Create Single Class',
          category: 'CLASS SETUP',
          whatItIs: 'Registers a single new class with section, academic year, classroom number, and assigned teacher.',
          howToUse: 'Click to enter class name (e.g. Class 5-B), academic year, room number, and class teacher.',
        },
      },
    ],
  },

  // ─── 4. WAREHOUSES PAGE (/warehouses) ─────────────────────────────────────
  {
    pathPrefix: '/warehouses',
    pageTitle: 'Warehouses & Facilities',
    pagePurpose: 'Manage physical campus buildings, central supply depots, and facility managers.',
    inspectors: [
      {
        // Warehouse Card
        match: (el, text, t) => {
          return Boolean(el.closest('.card') && (t.includes('locations') || t.includes('supervisor') || t.includes('building')));
        },
        explanation: {
          title: 'Warehouse Facility Card',
          category: 'PHYSICAL FACILITIES',
          whatItIs: 'Represents a physical building or storage facility (e.g. "Main Campus Depot", "Science Block Store").',
          whyItMatters: 'Houses interior storage locations (aisles, racks, shelves, and bins).',
          howToUse: 'Click to inspect facility details, supervisor contacts, and associated shelf locations.',
        },
      },
      {
        // Add Warehouse Button
        match: (el, text, t) => {
          return (t.includes('add warehouse') || t.includes('new warehouse')) && (el.tagName === 'BUTTON' || Boolean(el.closest('button')));
        },
        explanation: {
          title: 'Add New Warehouse Facility',
          category: 'FACILITY SETUP',
          whatItIs: 'Registers a new physical building or storage room in your organization.',
          howToUse: 'Enter facility name, building code, address, supervisor name, and phone contact.',
        },
      },
    ],
  },

  // ─── 5. STORAGE LOCATIONS PAGE (/locations) ───────────────────────────────
  {
    pathPrefix: '/locations',
    pageTitle: 'Places & Storage Locations',
    pagePurpose: 'Track exact shelf coordinates, bin capacity limits, and real-time occupancy percentages.',
    inspectors: [
      {
        // Location Bin Card
        match: (el, text, t) => {
          return Boolean(el.closest('.card') && (t.includes('capacity') || t.includes('occupancy') || t.includes('shelf') || t.includes('bin')));
        },
        explanation: {
          title: 'Storage Location (Bin / Shelf) Card',
          category: 'SHELF STORAGE',
          whatItIs: 'The exact physical storage cell (e.g. Aisle 2, Shelf B, Bin 04) inside a warehouse building.',
          whyItMatters: 'Tracks maximum capacity and real-time occupancy to prevent overfilling shelves and damaged inventory.',
          howToUse: 'Inspect items stored in this bin, check available capacity, or initiate a stock transfer to another bin.',
        },
      },
      {
        // Capacity Bar
        match: (el, text, t) => {
          return t.includes('capacity') || t.includes('occupancy') || t.includes('%');
        },
        explanation: {
          title: 'Location Capacity & Occupancy Bar',
          category: 'CAPACITY TRACKING',
          whatItIs: 'Visual meter indicating how full this specific shelf or bin is (0% to 100%).',
          whyItMatters: 'Green means plenty of space; yellow indicates >80% full; red warns of a full shelf.',
          howToUse: 'If a location is near capacity, use "Transfer Stock" to rebalance items into empty bins.',
        },
      },
      {
        // Transfer Stock Button
        match: (el, text, t) => {
          return t.includes('transfer') && (el.tagName === 'BUTTON' || Boolean(el.closest('button')));
        },
        explanation: {
          title: 'Transfer Stock Action',
          category: 'STOCK RELOCATION',
          whatItIs: 'Moves inventory items from one shelf/warehouse location to another.',
          whyItMatters: 'Maintains 100% accurate physical inventory coordinates with full audit logging.',
          howToUse: 'Click to select the item, source location, target location, and transfer quantity.',
        },
      },
    ],
  },

  // ─── 6. BULK ISSUE PAGE (/bulk-issue) ─────────────────────────────────────
  {
    pathPrefix: '/bulk-issue',
    pageTitle: 'Bulk Issue',
    pagePurpose: 'Distribute complete uniform packages, textbook sets, and stationery kits to an entire classroom in one click.',
    inspectors: [
      {
        // Class Selector
        match: (el, text, t) => {
          return t.includes('select class') || t.includes('class');
        },
        explanation: {
          title: 'Target Class Selector',
          category: 'BULK DISTRIBUTION',
          whatItIs: 'Chooses the classroom cohort that will receive the material kit.',
          whyItMatters: 'All enrolled students in this class will receive individual assignment records.',
          howToUse: 'Select the class (e.g. Class 1-A) to load its enrolled students.',
        },
      },
      {
        // Template Selector
        match: (el, text, t) => {
          return t.includes('template') || t.includes('kit');
        },
        explanation: {
          title: 'Class Material Template (Kit) Selector',
          category: 'PACKAGE SELECTION',
          whatItIs: 'Selects the predefined kit of uniforms, books, and supplies configured for this grade.',
          whyItMatters: 'Automatically bundles 5+ items together so you don\'t have to add items one by one.',
          howToUse: 'Choose the template (e.g. "Grade 1 Standard Kit") to see its item list.',
        },
      },
    ],
  },

  // ─── 7. FEES & PACKAGES PAGE (/fees) ──────────────────────────────────────
  {
    pathPrefix: '/fees',
    pageTitle: 'Student Fee Collection',
    pagePurpose: 'Track student uniform/book package charges, record payments, and print formal fee receipts.',
    inspectors: [
      {
        // Fee Record Row / Card
        match: (el, text, t) => {
          return Boolean(el.closest('tr, .card') && (t.includes('paid') || t.includes('due') || t.includes('amount') || t.includes('receipt')));
        },
        explanation: {
          title: 'Student Fee Package Record',
          category: 'ACCOUNTING & FEES',
          whatItIs: 'Tracks uniform and book package billing for a student, showing total cost, amount paid, and balance due.',
          whyItMatters: 'Guarantees the school collects payment for issued materials and provides verifiable receipts for parents.',
          howToUse: 'Click "Record Payment" to log cash/bank transfer, print a formal PDF receipt, or distribute paid items.',
        },
      },
      {
        // Record Payment Button
        match: (el, text, t) => {
          return t.includes('pay') || t.includes('record payment');
        },
        explanation: {
          title: 'Record Payment Action',
          category: 'FEE COLLECTION',
          whatItIs: 'Logs full or partial payment received from a parent or student.',
          howToUse: 'Enter amount paid, payment method (Cash, UPI, Card), and generate a timestamped receipt.',
        },
      },
    ],
  },

  // ─── 8. PROCUREMENT PAGE (/procurement) ───────────────────────────────────
  {
    pathPrefix: '/procurement',
    pageTitle: 'Procurement & Purchase Orders',
    pagePurpose: 'Order supplies from vendors, track supplier shipments, and receive goods directly into warehouse stock.',
    inspectors: [
      {
        // Purchase Order Row
        match: (el, text, t) => {
          return Boolean(el.closest('tr, .card') && (t.includes('po-') || t.includes('vendor') || t.includes('status')));
        },
        explanation: {
          title: 'Purchase Order (PO) Record',
          category: 'PURCHASING',
          whatItIs: 'A formal commercial order to a supplier detailing ordered items, quantities, agreed prices, and shipment status.',
          whyItMatters: 'Tracks pending inventory replenishment from Draft to Ordered to Received.',
          howToUse: 'Click to view PO items, approve order, or click "Receive Goods" when the delivery arrives.',
        },
      },
      {
        // Receive Goods Button
        match: (el, text, t) => {
          return t.includes('receive goods') || t.includes('receive');
        },
        explanation: {
          title: 'Receive Goods Action',
          category: 'STOCK INTAKE',
          whatItIs: 'Checks arriving vendor shipments into warehouse stock.',
          whyItMatters: 'Automatically increments your physical inventory levels without manual stock additions.',
          howToUse: 'Verify delivered quantities, select the warehouse shelf destination, and confirm receipt.',
        },
      },
    ],
  },

  // ─── 9. ASSETS PAGE (/assets) ─────────────────────────────────────────────
  {
    pathPrefix: '/assets',
    pageTitle: 'Capital Assets & Equipment',
    pagePurpose: 'Track fixed equipment, projectors, computers, vehicles, and laboratory apparatus with serial numbers.',
    inspectors: [
      {
        // Asset Card
        match: (el, text, t) => {
          return Boolean(el.closest('tr, .card') && (t.includes('asset') || t.includes('serial') || t.includes('condition')));
        },
        explanation: {
          title: 'Capital Asset Record',
          category: 'FIXED ASSETS',
          whatItIs: 'Represents a high-value physical equipment item owned by the institution (e.g. Science Lab Microscope, Smart Board).',
          whyItMatters: 'Tracks asset tags, warranty, maintenance logs, and room placement.',
          howToUse: 'Click to view service history, print asset QR barcodes, or log a maintenance repair ticket.',
        },
      },
    ],
  },

  // ─── 10. MAINTENANCE PAGE (/maintenance) ──────────────────────────────────
  {
    pathPrefix: '/maintenance',
    pageTitle: 'Maintenance & Repairs',
    pagePurpose: 'Log broken equipment, track repair tickets, assign technicians, and record servicing expenses.',
    inspectors: [
      {
        // Ticket Card
        match: (el, text, t) => {
          return Boolean(el.closest('tr, .card') && (t.includes('ticket') || t.includes('priority') || t.includes('repair') || t.includes('open') || t.includes('resolved')));
        },
        explanation: {
          title: 'Maintenance Repair Ticket',
          category: 'EQUIPMENT SERVICING',
          whatItIs: 'A repair or servicing ticket logged for a damaged asset or school facility item.',
          whyItMatters: 'Keeps equipment operational, logs repair costs, and tracks technician resolution times.',
          howToUse: 'Click to update ticket status (Open -> In Progress -> Resolved), record repair expenses, or add technician notes.',
        },
      },
    ],
  },
  // ─── 11. ASSIGNMENTS & ISSUES (/assignments) ──────────────────────────────
  {
    pathPrefix: '/assignments',
    pageTitle: 'Item Assignments & Returns',
    pagePurpose: 'Track items checked out to students, staff, or departments, monitor return deadlines, and record return condition.',
    inspectors: [
      {
        match: (el, text, t) => Boolean(el.closest('tr, .card') && (t.includes('return') || t.includes('condition') || t.includes('issued'))),
        explanation: {
          title: 'Issued Item Assignment Record',
          category: 'CUSTODY TRACKING',
          whatItIs: 'Tracks a physical inventory item checked out to a specific student or staff member.',
          whyItMatters: 'Maintains individual accountability and ensures loaned books, uniforms, or tools are returned on time.',
          howToUse: 'When the borrower returns the item, click "Return" to inspect condition (Good, Fair, Damaged) or record a replacement fine.',
        },
      },
      {
        match: (el, text, t) => t.includes('issue item') || t.includes('new assignment'),
        explanation: {
          title: 'Issue Item Action',
          category: 'ITEM CHECK-OUT',
          whatItIs: 'Checks an inventory item out of the warehouse and assigns custody to a student or employee.',
          howToUse: 'Select the recipient, choose the item, set quantity, condition on issue, and expected return date.',
        },
      },
    ],
  },

  // ─── 12. VENDORS & SUPPLIERS (/vendors) ───────────────────────────────────
  {
    pathPrefix: '/vendors',
    pageTitle: 'Vendors & Supplier Directory',
    pagePurpose: 'Manage suppliers, manufacturer contacts, tax credentials, and purchase histories.',
    inspectors: [
      {
        match: (el, text, t) => Boolean(el.closest('.card, tr') && (t.includes('phone') || t.includes('contact') || t.includes('orders') || t.includes('supplier'))),
        explanation: {
          title: 'Vendor / Supplier Card',
          category: 'PROCUREMENT',
          whatItIs: 'Profile for an authorized supplier providing school uniforms, books, hardware, or materials.',
          whyItMatters: 'Stores supplier contact details, payment terms, and lifetime purchase orders.',
          howToUse: 'Click to view vendor details, review past purchase orders, or create a new quotation request.',
        },
      },
      {
        match: (el, text, t) => t.includes('add vendor') || t.includes('new vendor'),
        explanation: {
          title: 'Add New Vendor',
          category: 'SUPPLIER ONBOARDING',
          whatItIs: 'Registers a new supplier company with address, contact person, phone, and payment terms.',
          howToUse: 'Click to enter vendor name, contact person, email, phone, and GST/Tax ID.',
        },
      },
    ],
  },

  // ─── 13. DASHBOARD (/dashboard) ───────────────────────────────────────────
  {
    pathPrefix: '/dashboard',
    pageTitle: 'Executive Dashboard',
    pagePurpose: 'Real-time overview of inventory valuation, stock health alerts, low-stock warnings, and activity metrics.',
    inspectors: [
      {
        match: (el, text, t) => Boolean(el.closest('.card') && (t.includes('total items') || t.includes('in stock') || t.includes('low stock') || t.includes('assigned'))),
        explanation: {
          title: 'KPI Metric Summary Card',
          category: 'OPERATIONAL METRICS',
          whatItIs: 'Real-time metric showing key organizational inventory counts.',
          whyItMatters: 'Gives managers an immediate status of overall stock health without running reports.',
          howToUse: 'Click on any KPI card to jump directly to the filtered list for those items.',
        },
      },
      {
        match: (el, text, t) => t.includes('alert') || t.includes('low stock') || t.includes('out of stock'),
        explanation: {
          title: 'Stock Health Alert Banner',
          category: 'CRITICAL ALERTS',
          whatItIs: 'Urgent warnings for products that have fallen below their safety threshold.',
          whyItMatters: 'Prevents operational bottlenecks by notifying purchasing staff to restock immediately.',
          howToUse: 'Click to view low-stock items and initiate vendor purchase orders.',
        },
      },
    ],
  },
];

/**
 * Precision matcher that checks the current path, role, and context first!
 */
export function matchElementPrecisely(
  currentPath: string,
  element: HTMLElement
): ElementExplanation | null {
  // Normalize current path (strip trailing slash or query params)
  const normPath = currentPath.split('?')[0].replace(/\/+$/, '') || '/dashboard';

  // Find matching PageRule
  const rule = PAGE_RULES.find((r) => normPath === r.pathPrefix || normPath.startsWith(r.pathPrefix + '/'));

  // Get clean text of the element and immediate children
  const rawText = (
    element.getAttribute('aria-label') ||
    element.getAttribute('title') ||
    element.getAttribute('placeholder') ||
    element.innerText ||
    ''
  ).trim();

  const textLower = rawText.toLowerCase();

  // 1. If we matched a PageRule, test its precise inspectors in order
  if (rule) {
    for (const insp of rule.inspectors) {
      if (insp.match(element, rawText, textLower)) {
        return insp.explanation;
      }
    }

    // Check if hovering on the Page Title or Header area
    if (element.tagName === 'H1' || element.closest('h1') || element.closest('[data-page-header]')) {
      return {
        title: rule.pageTitle,
        category: 'CURRENT PAGE OVERVIEW',
        whatItIs: rule.pagePurpose,
        howToUse: `This is the primary workspace for managing ${rule.pageTitle.toLowerCase()}. Use the action buttons at the top right to create or import records, or click on any record below to inspect details.`,
      };
    }
  }

  // 2. Generic Header Navigation / Global UI inspection
  if (element.closest('header')) {
    if (textLower.includes('search') || element.tagName === 'INPUT') {
      return {
        title: 'Global Spotlight Search (Ctrl+K)',
        category: 'NAVIGATION',
        whatItIs: 'Global search palette allowing instant jumping to any page, item, student, class, or supplier.',
        howToUse: 'Press Ctrl+K or click to open the search palette and type what you need.',
      };
    }
    if (element.closest('[data-notification-bell]') || textLower.includes('notification')) {
      return {
        title: 'Notifications & Alerts Center',
        category: 'SYSTEM ALERTS',
        whatItIs: 'Displays real-time notifications for low-stock warnings, overdue returns, and system events.',
        howToUse: 'Click to review recent unread alerts and dismiss completed items.',
      };
    }
  }

  // 3. Sidebar Navigation inspection
  if (element.closest('aside, nav')) {
    const linkText = element.innerText.trim();
    return {
      title: `${linkText || 'Navigation'} Menu Item`,
      category: 'NAVIGATION SIDEBAR',
      whatItIs: `Navigates directly to the ${linkText || 'selected'} module workspace.`,
      howToUse: 'Click to switch to this section of StockPilot.',
    };
  }

  return null;
}
