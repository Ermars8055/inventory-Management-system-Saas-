export interface ActionButton {
  label: string;
  path?: string;
  actionId?: string;
  icon?: string;
}

export interface ConceptItem {
  id: string;
  term: string;
  category: 'inventory' | 'schools' | 'warehouses' | 'procurement' | 'assets' | 'settings' | 'general';
  summary: string;
  explanation: string;
  whyItMatters: string;
  howToUse: string;
  proTip?: string;
  actions?: ActionButton[];
  keywords: string[];
}

export interface PageHelp {
  path: string;
  title: string;
  badge?: string;
  purpose: string;
  overview: string;
  keyElements: {
    selector?: string;
    name: string;
    whatItIs: string;
    instructions: string;
  }[];
  quickQuestions: {
    question: string;
    answer: string;
    actions?: ActionButton[];
  }[];
}

export interface StepGuide {
  stepNumber: number;
  title: string;
  description: string;
  targetPath: string;
  actionText?: string;
  tip?: string;
}

export interface WorkflowGuide {
  id: string;
  title: string;
  category: string;
  summary: string;
  estimatedMinutes: number;
  steps: StepGuide[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MASTER GLOSSARY & CONCEPTS ("What is this?")
// ─────────────────────────────────────────────────────────────────────────────

export const APP_CONCEPTS: ConceptItem[] = [
  {
    id: 'sku',
    term: 'SKU (Stock Keeping Unit)',
    category: 'inventory',
    summary: 'A unique alphanumeric code identifying each distinct item in your inventory.',
    explanation: 'A SKU (e.g., "UNI-SHIRT-M-BLU") uniquely distinguishes products by size, color, style, or edition. Unlike barcodes, SKUs are created by your team for internal tracking.',
    whyItMatters: 'Prevents confusing different sizes or editions of identical-looking items, guaranteeing stock accuracy.',
    howToUse: 'When adding or importing items, enter a short, logical format like [Category]-[Item]-[Size] (e.g. "TXT-MATH10", "UNI-PANT-32").',
    proTip: 'Keep your SKU format consistent across all categories for easy searching.',
    actions: [{ label: 'Go to Inventory', path: '/inventory' }],
    keywords: ['sku', 'code', 'stock keeping unit', 'item code', 'identifier'],
  },
  {
    id: 'reorder-point',
    term: 'Reorder Level & Suggested PO Qty',
    category: 'inventory',
    summary: 'The minimum safety stock threshold that triggers low-stock alerts.',
    explanation: 'When total inventory on hand drops to or below the Reorder Level, StockPilot automatically marks the item as "Low Stock" on your dashboard and calculates suggested replenishment orders.',
    whyItMatters: 'Guarantees you never run out of school books, uniforms, or critical supplies unexpectedly.',
    howToUse: 'Set Reorder Level to the minimum quantity you need to survive while waiting for a supplier delivery (e.g. 20 units).',
    proTip: 'Check your Dashboard weekly for the Low Stock alert card to catch shortages early.',
    actions: [{ label: 'View Inventory Alerts', path: '/inventory' }, { label: 'Check Dashboard', path: '/dashboard' }],
    keywords: ['reorder', 'low stock', 'threshold', 'minimum', 'safety stock', 'replenish', 'po qty'],
  },
  {
    id: 'warehouse-vs-location',
    term: 'Warehouse vs. Storage Location',
    category: 'warehouses',
    summary: 'A Warehouse is a building/depot; a Location is a specific bin, rack, or shelf inside that building.',
    explanation: 'StockPilot cleanly separates facility buildings from their interior storage cells: \n• Warehouse: The physical campus or building (e.g., "Main Depot", "Science Block Store").\n• Location: The exact spot inside (e.g., "Aisle 3, Rack B, Shelf 1, Bin 04").',
    whyItMatters: 'Helps staff find items in seconds instead of searching entire buildings, and tracks precise shelf capacity.',
    howToUse: '1. First create your Warehouses under Warehouses.\n2. Then create your Storage Locations under Locations and assign each to its parent Warehouse.',
    proTip: 'Use location codes like "W1-A2-S3" for fast barcode scanning on shelves.',
    actions: [{ label: 'Manage Warehouses', path: '/warehouses' }, { label: 'Manage Locations', path: '/locations' }],
    keywords: ['warehouse', 'location', 'storage', 'shelf', 'bin', 'rack', 'aisle', 'difference between warehouse and location'],
  },
  {
    id: 'location-capacity',
    term: 'Location Capacity & Occupancy',
    category: 'warehouses',
    summary: 'The maximum units a storage bin can hold, with real-time occupancy percentage.',
    explanation: 'Each location tracks its maximum capacity. As items are placed or transferred into that location, StockPilot updates the occupancy bar (0% to 100%) and warns you when a bin is full.',
    whyItMatters: 'Prevents overflowing shelves, eliminates damaged goods, and tells warehouse staff where empty space exists.',
    howToUse: 'Set the maximum capacity when editing a location. Stock transfers automatically update the count.',
    proTip: 'Filter the Locations table by "Near Capacity (>80%)" to rebalance stock before receiving large shipments.',
    actions: [{ label: 'Inspect Locations', path: '/locations' }],
    keywords: ['capacity', 'occupancy', 'volume', 'full', 'space', 'bin capacity'],
  },
  {
    id: 'stock-transfer',
    term: 'Stock Transfer Between Locations',
    category: 'warehouses',
    summary: 'Moving items from one warehouse or bin to another without changing overall organization stock.',
    explanation: 'Records the relocation of physical units between storage locations (e.g. from Central Receiving to Aisle 4 Shelf B). It validates capacity at the destination before completing.',
    whyItMatters: 'Maintains an unalterable audit trail of who moved what, when, and where.',
    howToUse: 'Go to Locations -> Click "Transfer Stock" -> Select Item, Source Location, Destination Location, and Quantity.',
    proTip: 'Always transfer damaged goods to a dedicated "Damaged/Quarantine" location so they cannot be accidentally issued.',
    actions: [{ label: 'Open Locations', path: '/locations' }],
    keywords: ['transfer', 'move stock', 'relocate', 'bin transfer', 'internal move'],
  },
  {
    id: 'class-material-template',
    term: 'Class Material Template (Kit)',
    category: 'schools',
    summary: 'A pre-packaged kit of textbooks, uniforms, and stationery assigned to an entire grade or group.',
    explanation: 'Instead of issuing 5 different books and 3 uniform items manually to 60 students one by one, a Class Template groups all required items into a standard package (e.g., "Grade 10 Science Kit").',
    whyItMatters: 'Turns term-opening distribution from a 3-day nightmare into a 10-second bulk issue task.',
    howToUse: '1. Define the template in Settings -> Class Material Templates.\n2. Add the items and quantities.\n3. In Class Detail or Bulk Issue, click "Apply Template" to distribute to all enrolled students at once.',
    proTip: 'Attach fees to templates so receipts and student invoices are generated automatically.',
    actions: [{ label: 'Class Templates', path: '/settings/class-templates' }, { label: 'Bulk Issue Page', path: '/bulk-issue' }],
    keywords: ['template', 'class template', 'material template', 'kit', 'bundle', 'package', 'bulk kit'],
  },
  {
    id: 'academic-year',
    term: 'Academic Year & Sessions',
    category: 'schools',
    summary: 'The school calendar cycle (e.g. 2026-2027) grouping registered classes and student cohorts.',
    explanation: 'Academic Year organizes classes, student attendance, item distributions, and fee collections into distinct annual sessions. StockPilot automatically cross-references your registered classes to recommend matching academic years in forms.',
    whyItMatters: 'Keeps historical student records and inventory usage separated by school year so previous years can be audited without cluttering current operations.',
    howToUse: 'When creating classes, specify the academic session. In Inventory custom fields, the smart picker will highlight the matching session.',
    proTip: 'Use "Clone Academic Year" on the Classes page to copy all class structures into next year with a single click.',
    actions: [{ label: 'View Classes', path: '/classes' }],
    keywords: ['academic year', 'session', 'school year', 'batch', 'term'],
  },
  {
    id: 'class-promotion',
    term: 'Class Promotion & Section Transfer',
    category: 'schools',
    summary: 'Moving an entire batch of students to the next grade or transferring a student between sections.',
    explanation: 'At the end of a school year, Class Promotion migrates all enrolled students from Class 1-A to Class 2-A in the new academic year while archiving their previous records.',
    whyItMatters: 'Preserves each student\'s full historical enrollment, fee receipts, and issued items ledger forever without manual data re-entry.',
    howToUse: 'Open a Class in Classes -> Click "Promote Class" -> Select the target class or create next year\'s class.',
    proTip: 'Resolve all unreturned uniforms and overdue books before promoting students so items are not lost.',
    actions: [{ label: 'Go to Classes', path: '/classes' }],
    keywords: ['promote', 'promotion', 'transfer', 'switch section', 'next year', 'upgrade class'],
  },
  {
    id: 'bulk-issue',
    term: 'Bulk Issue',
    category: 'schools',
    summary: 'Distributing complete item bundles to an entire classroom or department simultaneously.',
    explanation: 'Bulk Issue takes a Class Template or list of items and creates individual assignment records for every student or employee enrolled, deducting stock from inventory in one unified transaction.',
    whyItMatters: 'Saves hours of data entry during back-to-school term openings or staff onboarding.',
    howToUse: 'Navigate to Bulk Issue -> Select the Class/Group -> Select the Template -> Confirm issue date and click "Distribute".',
    proTip: 'Check your inventory stock levels before running Bulk Issue to make sure you have enough units for every student.',
    actions: [{ label: 'Open Bulk Issue', path: '/bulk-issue' }],
    keywords: ['bulk issue', 'mass issue', 'distribute', 'class issue', 'batch assign'],
  },
  {
    id: 'student-fees',
    term: 'Student Packages & Fee Collection',
    category: 'schools',
    summary: 'Tracking uniform/book package charges, payment collection, and issuing receipts.',
    explanation: 'When items are issued, StockPilot can generate a corresponding fee ledger for each student. Track partial payments, mark waivers, and print formal PDF/printed receipts for parents.',
    whyItMatters: 'Eliminates revenue leakage and gives accounting clear visibility on who has paid for uniforms and materials.',
    howToUse: 'View student fees under the Fees page or inside any Class Detail -> Click "Record Payment" or "Distribute Paid Items".',
    proTip: 'Use "Distribute Paid Only" to ensure high-value items are only handed out after payment is recorded.',
    actions: [{ label: 'View Fees', path: '/fees' }],
    keywords: ['fee', 'payment', 'receipt', 'charge', 'package fee', 'invoice', 'dues'],
  },
  {
    id: 'purchase-order',
    term: 'Purchase Order (PO)',
    category: 'procurement',
    summary: 'A formal commercial order sent to a vendor specifying items, quantities, and agreed prices.',
    explanation: 'A PO tracks orders from "Draft" -> "Ordered" -> "Partially Received" -> "Completed". When goods arrive, receiving them against a PO automatically increments your inventory stock levels.',
    whyItMatters: 'Prevents unauthorized spending and ensures you receive exactly what you paid for before updating stock.',
    howToUse: 'Go to Procurement -> New Purchase Order -> Select Vendor -> Add Line Items -> Approve & Send.',
    proTip: 'Always link arriving shipments to their PO number so the system updates cost prices automatically.',
    actions: [{ label: 'Manage Procurement', path: '/procurement' }, { label: 'Vendors Page', path: '/vendors' }],
    keywords: ['purchase order', 'po', 'procurement', 'order', 'buying', 'vendor order'],
  },
  {
    id: 'quotation',
    term: 'Vendor Quotations (RFQ)',
    category: 'procurement',
    summary: 'Price estimates submitted by suppliers before creating a purchase order.',
    explanation: 'Allows comparing prices from multiple suppliers for the same items to select the best vendor based on delivery time and cost.',
    whyItMatters: 'Saves organizational budget by enabling competitive vendor bidding.',
    howToUse: 'Under Procurement -> Quotations -> Create a Quotation request and record the supplier\'s price quote.',
    proTip: 'Once a quotation is approved, you can convert it into a Purchase Order with one click.',
    actions: [{ label: 'View Quotations', path: '/quotations' }],
    keywords: ['quotation', 'rfq', 'quote', 'bid', 'estimate', 'price request'],
  },
  {
    id: 'asset-vs-consumable',
    term: 'Asset vs. Inventory Consumable',
    category: 'assets',
    summary: 'Consumables are used up or issued out; Assets are high-value equipment that remain organizational property.',
    explanation: '• Consumables (Inventory): Uniforms, notebooks, medicines, toner cartridges.\n• Assets: Projectors, microscopes, laptops, buses, laboratory equipment with serial numbers.',
    whyItMatters: 'Assets require maintenance, warranty tracking, and serial numbers, whereas consumables track quantities and reorders.',
    howToUse: 'Register equipment under Assets. Schedule maintenance tickets to log repairs and servicing.',
    proTip: 'Print QR codes from the Barcode page and stick them onto physical assets for instant mobile scanning.',
    actions: [{ label: 'Go to Assets', path: '/assets' }, { label: 'Maintenance Tickets', path: '/maintenance' }],
    keywords: ['asset', 'equipment', 'consumable', 'machinery', 'fixed asset', 'inventory vs asset'],
  },
  {
    id: 'maintenance-ticket',
    term: 'Maintenance Ticket',
    category: 'assets',
    summary: 'A repair or servicing record logged for an asset or facility item.',
    explanation: 'Tracks issues from "Open" -> "In Progress" -> "Resolved". Records service technician notes, parts replaced, downtime, and repair expenses.',
    whyItMatters: 'Keeps equipment safe, extends asset lifespan, and monitors lifetime maintenance costs.',
    howToUse: 'Go to Maintenance -> Click "New Ticket" -> Select the Asset -> Describe the fault and priority.',
    proTip: 'Review maintenance history before deciding whether to repair or replace aging machinery.',
    actions: [{ label: 'Open Maintenance', path: '/maintenance' }],
    keywords: ['maintenance', 'repair', 'broken', 'ticket', 'service', 'breakdown', 'fix'],
  },
  {
    id: 'custom-fields',
    term: 'Custom Fields System',
    category: 'settings',
    summary: 'Add custom data attributes (text, numbers, dropdowns, smart pickers) to items or recipients.',
    explanation: 'Every organization is unique. Custom Fields lets you attach custom properties (e.g. "Author", "ISBN", "Shoe Size", "Blood Group", "Academic Year") without code changes. StockPilot intelligently enriches fields named "Academic Year" or "Class" with smart class pickers.',
    whyItMatters: 'Gives you complete flexibility to tailor StockPilot to your exact institutional workflows.',
    howToUse: 'Go to Settings -> Custom Fields -> Click "Add Field" -> Select the entity (Item, Recipient, Vendor) and field type.',
    proTip: 'Tag custom fields to specific modules (e.g. only show "Fabric Material" for Uniforms).',
    actions: [{ label: 'Custom Fields Settings', path: '/settings/custom-fields' }],
    keywords: ['custom field', 'attribute', 'custom properties', 'extra field', 'metadata'],
  },
  {
    id: 'recipient-returns',
    term: 'Issuance, Conditions & Returns',
    category: 'inventory',
    summary: 'Tracking items checked out to individuals, expected return dates, and item condition.',
    explanation: 'When an item is checked out to a student or staff member, StockPilot tracks its condition on issue ("New", "Good"). When returned, condition is re-evaluated ("Fair", "Damaged") and penalty fines can be recorded.',
    whyItMatters: 'Holds borrowers accountable and prevents items from disappearing without a trace.',
    howToUse: 'Under Assignments, click "Issue Item". When the borrower returns it, click "Return" and record the condition.',
    proTip: 'Set an Expected Return Date to trigger overdue notifications on your dashboard.',
    actions: [{ label: 'Assignments Page', path: '/assignments' }, { label: 'Recipients Page', path: '/recipients' }],
    keywords: ['issue', 'return', 'condition', 'damage', 'borrow', 'assignment', 'check out'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. PAGE-SPECIFIC GUIDES & QUICK QUESTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const PAGE_GUIDES: Record<string, PageHelp> = {
  '/dashboard': {
    path: '/dashboard',
    title: 'Dashboard & Executive Overview',
    badge: 'Command Center',
    purpose: 'Real-time overview of inventory valuation, stock health alerts, low-stock warnings, and activity metrics.',
    overview: 'Your launchpad for daily operations. High-priority alerts appear at the top, followed by quick metrics and category distributions.',
    keyElements: [
      { name: 'KPI Metric Cards', whatItIs: 'High-level counts of Total Items, In-Stock, Low Stock, and Active Assignments.', instructions: 'Click any card to jump directly to the filtered view.' },
      { name: 'Stock Health Alert Banner', whatItIs: 'Alerts you if any items are below their safety threshold or out of stock.', instructions: 'Review this daily to initiate vendor purchase orders on time.' },
      { name: 'Recent Activity Feed', whatItIs: 'Live timeline of who added stock, issued items, or transferred inventory.', instructions: 'Helps managers audit recent warehouse and school operations.' },
    ],
    quickQuestions: [
      { question: 'What does "Low Stock" mean on the card?', answer: 'It means the available physical units have dropped to or below the Reorder Level you defined for that item.', actions: [{ label: 'View Low Stock Items', path: '/inventory' }] },
      { question: 'How do I add my first items?', answer: 'Navigate to Inventory and click "+ Add Item", or use the CSV Import feature to upload an entire spreadsheet.', actions: [{ label: 'Go to Inventory', path: '/inventory' }] },
    ],
  },
  '/inventory': {
    path: '/inventory',
    title: 'Inventory Catalog',
    badge: 'Core Catalog',
    purpose: 'Master repository of all items, stock levels, SKUs, reorder thresholds, barcodes, and custom attributes.',
    overview: 'Here you track every physical product your institution manages. You can filter by category, search by SKU or barcode, and inspect stock across storage locations.',
    keyElements: [
      { name: '+ Add Item Button', whatItIs: 'Opens the item registration form.', instructions: 'Enter item name, SKU, category, initial stock, unit of measure, and custom fields.' },
      { name: 'Filter & Search Bar', whatItIs: 'Instantly filters items by name, SKU, or category.', instructions: 'Type a keyword or scan a barcode with your handheld scanner.' },
      { name: 'Reorder Quantity Field', whatItIs: 'Safety stock alert threshold.', instructions: 'Set this to the minimum quantity you must maintain in storage.' },
      { name: 'CSV Actions (Import/Export)', whatItIs: 'Bulk import thousands of items from Excel/CSV.', instructions: 'Download the sample template, paste your items, and re-upload.' },
    ],
    quickQuestions: [
      { question: 'How do I track sizes and colors?', answer: 'Use Item Variants. When adding an item, choose the variant group (e.g. Size: S, M, L, XL) to track individual sub-quantities.', actions: [{ label: 'Add Item', path: '/inventory' }] },
      { question: 'What is the difference between In-Stock and Issued?', answer: 'In-Stock is what physically sits in your warehouse/depot. Issued items have been distributed to students or employees.' },
      { question: 'How do I print barcodes for my shelves?', answer: 'Go to the Barcode generator page, select the items, and click Print Labels.', actions: [{ label: 'Print Barcodes', path: '/barcode' }] },
    ],
  },
  '/warehouses': {
    path: '/warehouses',
    title: 'Physical Warehouses & Facilities',
    badge: 'Facilities',
    purpose: 'Manage physical campus buildings, central depots, storage rooms, and facility supervisors.',
    overview: 'Warehouses represent distinct physical facilities. Each warehouse holds multiple interior storage locations (aisles, racks, and bins).',
    keyElements: [
      { name: '+ Add Warehouse Button', whatItIs: 'Registers a new storage facility.', instructions: 'Enter facility name, building code, address, supervisor, and contact.' },
      { name: 'Locations Count', whatItIs: 'Shows how many shelves/bins belong to this building.', instructions: 'Click to view the specific bins in this warehouse.' },
      { name: 'Supervisor Contact', whatItIs: 'Person in charge of the facility.', instructions: 'Useful for staff to quickly call or contact the floor manager.' },
    ],
    quickQuestions: [
      { question: 'Should I create a warehouse for each classroom?', answer: 'No. Warehouses are for buildings/rooms (e.g. "Main Depot", "Chemistry Store"). Classrooms and shelves should be created as Storage Locations inside a warehouse.', actions: [{ label: 'View Locations', path: '/locations' }] },
      { question: 'How do I transfer stock between warehouses?', answer: 'Go to Locations -> Click Transfer Stock -> Select source bin and target bin in the other warehouse.', actions: [{ label: 'Go to Locations', path: '/locations' }] },
    ],
  },
  '/locations': {
    path: '/locations',
    title: 'Storage Locations & Bin Capacity',
    badge: 'Shelf / Bin Level',
    purpose: 'Granular aisle, shelf, and bin tracking with capacity limits and real-time occupancy monitoring.',
    overview: 'Locations represent the exact shelf coordinates where items are placed. Every location belongs to a warehouse and tracks maximum capacity.',
    keyElements: [
      { name: 'Location Code', whatItIs: 'A unique shelf address (e.g. "A1-R2-B04").', instructions: 'Stuck as a barcode label on physical shelves for fast scanning.' },
      { name: 'Capacity & Occupancy Bar', whatItIs: 'Visual meter showing how full the shelf is.', instructions: 'Green is healthy; yellow is >80%; red warns you that the shelf is full.' },
      { name: 'Transfer Stock Button', whatItIs: 'Moves inventory from this location to another.', instructions: 'Picks item, quantity, destination bin, and logs who moved it.' },
    ],
    quickQuestions: [
      { question: 'What happens when a location hits 100% capacity?', answer: 'StockPilot warns you that the bin is full and suggests alternative nearby shelves with available space.' },
      { question: 'Can one location hold multiple different items?', answer: 'Yes, locations support multi-SKU storage. The total units across all items count against the location capacity.' },
    ],
  },
  '/classes': {
    path: '/classes',
    title: 'Class Registry & Academic Sessions',
    badge: 'Education Core',
    purpose: 'Manage classes, student enrollments, grade cohorts, and annual promotion migrations.',
    overview: 'The central hub for schools. Organize students by grade, assign class kits, collect fees, and promote students annually.',
    keyElements: [
      { name: '+ Create Class Button', whatItIs: 'Creates a single class (e.g., "Class 10-A").', instructions: 'Set name, academic year, section, room number, and class teacher.' },
      { name: 'Batch Create Classes', whatItIs: 'Instant generator for multiple classes.', instructions: 'Select grades 1 to 12 and sections A, B, C to generate 36 classes at once.' },
      { name: 'Clone Year Button', whatItIs: 'Copies all classes into the next academic year.', instructions: 'One-click migration when starting a new school session.' },
      { name: 'Enrolled Students', whatItIs: 'Roster of students inside this class.', instructions: 'Click on any class to view, enroll, transfer, or issue items to students.' },
    ],
    quickQuestions: [
      { question: 'How do I promote students to the next class at year end?', answer: 'Open the class -> Click "Promote Class" -> Pick the destination class for the new academic year.', actions: [{ label: 'View Classes', path: '/classes' }] },
      { question: 'How do I issue uniforms to this entire class?', answer: 'Open the class -> Go to Material Kit tab -> Apply Template -> Distribute to enrolled students.', actions: [{ label: 'Go to Bulk Issue', path: '/bulk-issue' }] },
    ],
  },
  '/procurement': {
    path: '/procurement',
    title: 'Procurement & Purchase Orders',
    badge: 'Purchasing',
    purpose: 'Create supplier purchase orders, track order fulfillment, and automatically receive goods into stock.',
    overview: 'Streamline purchasing from vendors. Track orders from creation to arrival and update inventory counts automatically upon receiving goods.',
    keyElements: [
      { name: 'New Purchase Order', whatItIs: 'Drafts a formal order for a supplier.', instructions: 'Select vendor, add items and quantities, review total cost, and approve.' },
      { name: 'Receive Goods Action', whatItIs: 'Logs arriving shipments into warehouse stock.', instructions: 'Check off received quantities and choose which storage location receives them.' },
      { name: 'Status Workflow', whatItIs: 'Draft -> Approved -> Ordered -> Received.', instructions: 'Keeps accounting and warehouse teams aligned on pending shipments.' },
    ],
    quickQuestions: [
      { question: 'Does receiving a PO automatically update stock?', answer: 'Yes! When you click "Receive Goods", StockPilot immediately adds the units to your selected warehouse location.' },
      { question: 'How do I compare vendor prices?', answer: 'Use Quotations under Procurement to request price estimates from multiple suppliers before creating a PO.', actions: [{ label: 'Go to Quotations', path: '/quotations' }] },
    ],
  },
  '/settings/custom-fields': {
    path: '/settings/custom-fields',
    title: 'Custom Fields Configuration',
    badge: 'Configuration',
    purpose: 'Define custom data attributes for Items, Students, Vendors, and other entities.',
    overview: 'Extend StockPilot without programming. Add custom fields like "Academic Year", "Fabric Type", "Shoe Size", or "Rack Number".',
    keyElements: [
      { name: '+ Add Field Button', whatItIs: 'Creates a new attribute.', instructions: 'Name the field, choose entity (Item, Recipient), and select field type.' },
      { name: 'Smart Academic Year & Class', whatItIs: 'Intelligent school fields.', instructions: 'StockPilot auto-detects fields named "Academic Year" or "Class" and enriches them with live registered classes!' },
    ],
    quickQuestions: [
      { question: 'Can I make a custom field appear only for uniforms?', answer: 'Yes! Set the "Module Filter" to School Uniforms so the field only appears when adding uniforms.' },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. STEP-BY-STEP WORKFLOW WALKTHROUGHS
// ─────────────────────────────────────────────────────────────────────────────

export const WORKFLOW_GUIDES: WorkflowGuide[] = [
  {
    id: 'school-quickstart',
    title: 'Complete School Onboarding (Zero to Ready)',
    category: 'Schools & Education',
    summary: 'The recommended 5-step sequence to get a school fully operational with classes, uniform kits, and student rosters.',
    estimatedMinutes: 6,
    steps: [
      {
        stepNumber: 1,
        title: 'Create Your Classes & Academic Year',
        description: 'Navigate to Classes and use "Batch Create" to generate your grade levels (e.g. Grade 1 to 10 with sections A, B).',
        targetPath: '/classes',
        actionText: 'Go to Classes',
        tip: 'Make sure your current Academic Year (e.g. 2026-2027) is entered accurately.',
      },
      {
        stepNumber: 2,
        title: 'Add Uniforms, Textbooks & Materials to Inventory',
        description: 'Under Inventory, add your standard school items with SKUs, category tags, and initial stock quantities.',
        targetPath: '/inventory',
        actionText: 'Open Inventory',
        tip: 'Use the smart Academic Year and Class custom fields to tag items to specific grades.',
      },
      {
        stepNumber: 3,
        title: 'Create Class Material Templates (Kits)',
        description: 'Go to Settings -> Class Material Templates. Create standard bundles (e.g. "Class 1 Uniform & Book Kit") containing all required items.',
        targetPath: '/settings/class-templates',
        actionText: 'Create Class Kits',
        tip: 'Templates allow 1-click bulk distribution instead of manual item-by-item issuing.',
      },
      {
        stepNumber: 4,
        title: 'Enroll Students (Recipients)',
        description: 'Under Recipients, add your students or upload your student roster via CSV. Assign each student to their registered Class.',
        targetPath: '/recipients',
        actionText: 'Manage Students',
        tip: 'You can also enroll students directly inside any Class Detail page.',
      },
      {
        stepNumber: 5,
        title: 'Execute Bulk Issue for the Term Opening',
        description: 'Go to Bulk Issue, select a class, select its template, and click Distribute. All students receive their items simultaneously!',
        targetPath: '/bulk-issue',
        actionText: 'Launch Bulk Issue',
        tip: 'StockPilot automatically updates inventory levels and prepares student fee records.',
      },
    ],
  },
  {
    id: 'warehouse-quickstart',
    title: 'Warehouse & Storage Location Setup',
    category: 'Warehouses & Logistics',
    summary: 'Set up buildings, storage aisles, capacity limits, and master internal stock relocation.',
    estimatedMinutes: 5,
    steps: [
      {
        stepNumber: 1,
        title: 'Create Your Main Warehouse',
        description: 'Go to Warehouses and click "+ Add Warehouse". Enter your facility name, building code, and supervisor details.',
        targetPath: '/warehouses',
        actionText: 'Create Warehouse',
        tip: 'You can create multiple warehouses if you have different campus buildings or off-site depots.',
      },
      {
        stepNumber: 2,
        title: 'Define Shelves, Racks & Bins',
        description: 'Go to Locations. Create specific coordinates (e.g. "Aisle 1 - Shelf B - Bin 03") and assign them to your warehouse.',
        targetPath: '/locations',
        actionText: 'Create Locations',
        tip: 'Set realistic unit capacities so StockPilot can warn you when a shelf is full.',
      },
      {
        stepNumber: 3,
        title: 'Place Initial Stock into Locations',
        description: 'When adding or editing inventory items, assign their storage location to place them onto physical shelves.',
        targetPath: '/inventory',
        actionText: 'Assign Stock to Bins',
      },
      {
        stepNumber: 4,
        title: 'Practice a Stock Transfer',
        description: 'Open Locations -> Click "Transfer Stock" to test moving items from receiving to a designated bin.',
        targetPath: '/locations',
        actionText: 'Test Stock Transfer',
        tip: 'Stock transfers are instant and require zero manual math.',
      },
    ],
  },
  {
    id: 'student-promotion-flow',
    title: 'Year-End Student Promotion & Class Migration',
    category: 'Schools & Education',
    summary: 'How to transition students to the next grade and clone class structures for the new school year.',
    estimatedMinutes: 4,
    steps: [
      {
        stepNumber: 1,
        title: 'Verify Outstanding Returns & Dues',
        description: 'Under Assignments and Fees, check that departing students have returned library books and uniforms.',
        targetPath: '/assignments',
        actionText: 'Check Assignments',
        tip: 'Students with overdue items will have warning badges during promotion.',
      },
      {
        stepNumber: 2,
        title: 'Clone Classes for the New Academic Year',
        description: 'On the Classes page, click "Clone Year" and enter next year\'s session (e.g. 2027-2028) to replicate all class structures.',
        targetPath: '/classes',
        actionText: 'Clone Academic Year',
      },
      {
        stepNumber: 3,
        title: 'Promote Each Class Cohort',
        description: 'Open Class 1-A -> Click "Promote Class" -> Choose Class 2-A in the new session. All students migrate automatically!',
        targetPath: '/classes',
        actionText: 'Promote Cohort',
      },
    ],
  },
  {
    id: 'procurement-stock-intake',
    title: 'Procurement: From Purchase Order to Shelf Stock',
    category: 'Purchasing & Stock Inflow',
    summary: 'The formal process of ordering supplies from vendors and checking them into inventory.',
    estimatedMinutes: 4,
    steps: [
      {
        stepNumber: 1,
        title: 'Register Your Suppliers',
        description: 'Go to Vendors and register your supplier contacts, tax numbers, and payment terms.',
        targetPath: '/vendors',
        actionText: 'Add Vendors',
      },
      {
        stepNumber: 2,
        title: 'Create a Purchase Order',
        description: 'Under Procurement -> Click "New Purchase Order". Add line items, quantities, and agreed prices.',
        targetPath: '/procurement',
        actionText: 'Draft Purchase Order',
      },
      {
        stepNumber: 3,
        title: 'Receive Shipment into Warehouse',
        description: 'When the goods arrive at your depot, open the PO -> Click "Receive Goods" -> Verify quantities and select storage location.',
        targetPath: '/procurement',
        actionText: 'Receive Shipment',
        tip: 'Inventory is updated immediately upon confirmation.',
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. SMART ASSISTANT SEARCH & QUERY ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export interface AssistantAnswer {
  title: string;
  category: string;
  explanation: string;
  whyItMatters?: string;
  howToUse?: string;
  proTip?: string;
  actions: ActionButton[];
  matchedType: 'concept' | 'page' | 'workflow' | 'general';
}

export function searchAssistant(query: string, currentPath = '/dashboard'): AssistantAnswer[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: AssistantAnswer[] = [];

  // 1. Search Concepts / Glossary
  for (const c of APP_CONCEPTS) {
    const matchTerm = c.term.toLowerCase().includes(q);
    const matchSummary = c.summary.toLowerCase().includes(q);
    const matchKeywords = c.keywords.some((k) => k.includes(q) || q.includes(k));

    if (matchTerm || matchKeywords || matchSummary) {
      results.push({
        title: c.term,
        category: c.category.toUpperCase(),
        explanation: c.explanation,
        whyItMatters: c.whyItMatters,
        howToUse: c.howToUse,
        proTip: c.proTip,
        actions: c.actions || [],
        matchedType: 'concept',
      });
    }
  }

  // 2. Search Workflows
  for (const w of WORKFLOW_GUIDES) {
    if (w.title.toLowerCase().includes(q) || w.summary.toLowerCase().includes(q) || w.category.toLowerCase().includes(q)) {
      results.push({
        title: `Workflow: ${w.title}`,
        category: w.category,
        explanation: `${w.summary} (${w.steps.length} steps, ~${w.estimatedMinutes} mins). Steps include: ${w.steps.map(s => s.title).join(' → ')}`,
        howToUse: `Follow the interactive guide step-by-step starting at ${w.steps[0].targetPath}.`,
        actions: [{ label: `Start Guide (${w.steps.length} Steps)`, path: w.steps[0].targetPath }],
        matchedType: 'workflow',
      });
    }
  }

  // 3. Search Page Guides
  for (const p of Object.values(PAGE_GUIDES)) {
    if (p.title.toLowerCase().includes(q) || p.purpose.toLowerCase().includes(q) || p.overview.toLowerCase().includes(q)) {
      results.push({
        title: `Page Guide: ${p.title}`,
        category: 'NAVIGATION',
        explanation: p.overview,
        whyItMatters: p.purpose,
        actions: [{ label: `Go to ${p.title}`, path: p.path }],
        matchedType: 'page',
      });
    }
  }

  return results;
}
