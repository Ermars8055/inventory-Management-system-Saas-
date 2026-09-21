"""
Seed the database with demo data.
Run: python -m app.seed
"""

from .database import SessionLocal, engine, Base
from .models import (
    Organization, Category, Item, StockTransaction, Vendor,
    User, Role, Recipient, Assignment, Batch, ReceiptTemplate, CustomField,
)
from .auth import hash_password

Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()

    if db.query(Organization).count() > 0:
        print("Database already seeded — skipping.")
        db.close()
        return

    print("Seeding database...")

    # -------------------------------------------------------------------------
    # Organizations  (with config for full configurability)
    # -------------------------------------------------------------------------
    orgs = [
        Organization(
            id="org_school_001", name="ABC International School", industry="school",
            enabled_modules=["inventory", "uniforms", "books", "student_issue", "suppliers", "barcode", "reports"],
            address="123 Education Lane, Bengaluru, KA 560001",
            phone="+91 80 2345 6789", email="admin@abcinternationalschool.edu",
            logo_text="ABC", plan="professional", created_at="2026-04-15",
            config={
                "recipientLabel": "Student",
                "recipientPluralLabel": "Students",
                "identifierLabel": "Roll Number",
                "groupLabel": "Class",
                "assignmentLabel": "Issue",
                "assignmentMode": "distribution",
                "itemUnit": "units",
                "currencyCode": "INR",
                "currencySymbol": "₹",
                "timezone": "Asia/Kolkata",
                "language": "en",
                "enableFines": False,
                "enableConditionTracking": True,
                "fineLabel": "Fine",
            },
        ),
        Organization(
            id="org_pharmacy_001", name="Apollo Medical Store", industry="pharmacy",
            enabled_modules=["inventory", "pharmacy", "batches", "expiry", "suppliers", "barcode", "reports"],
            address="45 MG Road, Bengaluru, KA 560001",
            phone="+91 80 2233 4455", email="store@apollomedical.in",
            logo_text="AMS", plan="professional", created_at="2026-05-20",
            config={
                "recipientLabel": "Customer",
                "recipientPluralLabel": "Customers",
                "identifierLabel": "Customer ID",
                "groupLabel": "Area",
                "assignmentLabel": "Sale",
                "assignmentMode": "distribution",
                "itemUnit": "strips",
                "currencyCode": "INR",
                "currencySymbol": "₹",
                "timezone": "Asia/Kolkata",
                "language": "en",
                "enableFines": False,
                "enableConditionTracking": False,
                "fineLabel": "Fine",
            },
        ),
    ]
    db.add_all(orgs)

    # -------------------------------------------------------------------------
    # Roles
    # -------------------------------------------------------------------------
    roles = [
        Role(id="role_admin", name="Organization Admin", permissions=["view_inventory","create_items","edit_items","delete_items","stock_in","stock_out","manage_suppliers","manage_modules","manage_users","view_reports"]),
        Role(id="role_inv_mgr", name="Inventory Manager", permissions=["view_inventory","create_items","edit_items","stock_in","stock_out","manage_suppliers","view_reports"]),
        Role(id="role_store_mgr", name="Store Manager", permissions=["view_inventory","create_items","edit_items","stock_in","stock_out","view_reports"]),
        Role(id="role_staff", name="Staff", permissions=["view_inventory","stock_in","stock_out"]),
        Role(id="role_viewer", name="Viewer", permissions=["view_inventory","view_reports"]),
    ]
    db.add_all(roles)

    # -------------------------------------------------------------------------
    # Users
    # -------------------------------------------------------------------------
    users = [
        # Roles: org_admin | manager | staff | viewer
        # Default password: "password123" for all demo users
        User(id="u1", organization_id="org_school_001", name="Priya Sharma", email="priya@abcinternationalschool.edu", password_hash=hash_password("password123"), role="org_admin", status="active", last_active="2026-09-11 08:45"),
        User(id="u2", organization_id="org_school_001", name="Rajesh Kumar", email="rajesh@abcinternationalschool.edu", password_hash=hash_password("password123"), role="manager", status="active", last_active="2026-09-11 09:20"),
        User(id="u3", organization_id="org_school_001", name="Anita Verma", email="anita@abcinternationalschool.edu", password_hash=hash_password("password123"), role="staff", status="active", last_active="2026-09-10 16:30"),
        User(id="u4", organization_id="org_pharmacy_001", name="Dr. Vikram Rao", email="vikram@apollomedical.in", password_hash=hash_password("password123"), role="org_admin", status="active", last_active="2026-09-11 10:00"),
        User(id="u5", organization_id="org_pharmacy_001", name="Sneha Reddy", email="sneha@apollomedical.in", password_hash=hash_password("password123"), role="manager", status="active", last_active="2026-09-11 09:45"),
        User(id="u6", organization_id="org_pharmacy_001", name="Karthik N", email="karthik@apollomedical.in", password_hash=hash_password("password123"), role="staff", status="active", last_active="2026-09-10 17:30"),
        User(id="u7", organization_id="org_school_001", name="Meena Pillai", email="meena@abcinternationalschool.edu", password_hash=hash_password("password123"), role="staff", status="inactive", last_active="2026-08-30 14:00"),
        User(id="u8", organization_id="org_school_001", name="Suresh Babu", email="suresh@abcinternationalschool.edu", password_hash=hash_password("password123"), role="viewer", status="active", last_active="2026-09-09 11:00"),
    ]
    db.add_all(users)

    # -------------------------------------------------------------------------
    # Categories
    # -------------------------------------------------------------------------
    cats = [
        Category(id="cat_s1", organization_id="org_school_001", name="Uniforms", color="#3B82F6"),
        Category(id="cat_s2", organization_id="org_school_001", name="Books", color="#10B981"),
        Category(id="cat_s3", organization_id="org_school_001", name="Sports Equipment", color="#F59E0B"),
        Category(id="cat_s4", organization_id="org_school_001", name="Lab Equipment", color="#8B5CF6"),
        Category(id="cat_s5", organization_id="org_school_001", name="Stationery", color="#EF4444"),
        Category(id="cat_p1", organization_id="org_pharmacy_001", name="Tablets & Capsules", color="#3B82F6"),
        Category(id="cat_p2", organization_id="org_pharmacy_001", name="Syrups & Liquids", color="#10B981"),
        Category(id="cat_p3", organization_id="org_pharmacy_001", name="Injectables", color="#F59E0B"),
        Category(id="cat_p4", organization_id="org_pharmacy_001", name="Topicals", color="#8B5CF6"),
        Category(id="cat_p5", organization_id="org_pharmacy_001", name="Medical Devices", color="#EF4444"),
        Category(id="cat_p6", organization_id="org_pharmacy_001", name="Nutritional Supplements", color="#06B6D4"),
    ]
    db.add_all(cats)

    # -------------------------------------------------------------------------
    # Items
    # -------------------------------------------------------------------------
    items = [
        Item(id="item_s1", organization_id="org_school_001", name="School Shirt", sku="UNI-SH-001", category_id="cat_s1", category_name="Uniforms", module="uniforms", quantity=240, available=42, reserved=0, location="Main Store", status="in_stock", last_updated="2026-09-10", uniform={"classGrade":"Grade 5","gender":"Boys","size":"32","academicYear":"2026-27","uniformType":"Shirt"}),
        Item(id="item_s2", organization_id="org_school_001", name="School Pant", sku="UNI-SP-001", category_id="cat_s1", category_name="Uniforms", module="uniforms", quantity=180, available=180, reserved=0, location="Main Store", status="in_stock", last_updated="2026-09-09", uniform={"classGrade":"Grade 5","gender":"Boys","size":"30","academicYear":"2026-27","uniformType":"Pant"}),
        Item(id="item_s3", organization_id="org_school_001", name="School Skirt", sku="UNI-SK-001", category_id="cat_s1", category_name="Uniforms", module="uniforms", quantity=120, available=105, reserved=0, location="Main Store", status="in_stock", last_updated="2026-09-08", uniform={"classGrade":"Grade 5","gender":"Girls","size":"28","academicYear":"2026-27","uniformType":"Skirt"}),
        Item(id="item_s4", organization_id="org_school_001", name="Blue Tie", sku="UNI-TI-001", category_id="cat_s1", category_name="Uniforms", module="uniforms", quantity=14, available=14, reserved=0, location="Main Store", status="low_stock", last_updated="2026-09-09", uniform={"classGrade":"All","gender":"All","size":"Standard","academicYear":"2026-27","uniformType":"Tie"}),
        Item(id="item_s5", organization_id="org_school_001", name="Sports Socks", sku="UNI-SS-001", category_id="cat_s1", category_name="Uniforms", module="uniforms", quantity=300, available=200, reserved=0, location="Sports Room", status="in_stock", last_updated="2026-09-10", uniform={"classGrade":"All","gender":"All","size":"M","academicYear":"2026-27","uniformType":"Socks"}),
        Item(id="item_s6", organization_id="org_school_001", name="School Belt", sku="UNI-BL-001", category_id="cat_s1", category_name="Uniforms", module="uniforms", quantity=60, available=55, reserved=0, location="Main Store", status="in_stock", last_updated="2026-09-07", uniform={"classGrade":"All","gender":"All","size":"M","academicYear":"2026-27","uniformType":"Belt"}),
        Item(id="item_s7", organization_id="org_school_001", name="Blazer", sku="UNI-BZ-001", category_id="cat_s1", category_name="Uniforms", module="uniforms", quantity=85, available=85, reserved=0, location="Main Store", status="in_stock", last_updated="2026-09-05", uniform={"classGrade":"Grade 8","gender":"All","size":"38","academicYear":"2026-27","uniformType":"Blazer"}),
        Item(id="item_s8", organization_id="org_school_001", name="Mathematics Textbook", sku="BK-MATH-G5", category_id="cat_s2", category_name="Books", module="books", quantity=45, available=30, reserved=0, location="Library", status="low_stock", last_updated="2026-09-11", book={"isbn":"978-81-203-5001-0","subject":"Mathematics","classGrade":"Grade 5","academicYear":"2026-27","edition":"3rd","publisher":"NCERT"}),
        Item(id="item_s9", organization_id="org_school_001", name="English Textbook", sku="BK-ENG-G5", category_id="cat_s2", category_name="Books", module="books", quantity=40, available=30, reserved=0, location="Library", status="low_stock", last_updated="2026-09-09", book={"isbn":"978-81-203-5002-7","subject":"English","classGrade":"Grade 5","academicYear":"2026-27","edition":"2nd","publisher":"NCERT"}),
        Item(id="item_s10", organization_id="org_school_001", name="Science Workbook", sku="BK-SCI-G5", category_id="cat_s2", category_name="Books", module="books", quantity=50, available=50, reserved=0, location="Library", status="in_stock", last_updated="2026-09-06", book={"isbn":"978-81-203-5003-4","subject":"Science","classGrade":"Grade 5","academicYear":"2026-27","edition":"1st","publisher":"NCERT"}),
        Item(id="item_s11", organization_id="org_school_001", name="History Textbook", sku="BK-HIS-G8", category_id="cat_s2", category_name="Books", module="books", quantity=30, available=25, reserved=0, location="Library", status="in_stock", last_updated="2026-09-03", book={"isbn":"978-81-203-5010-2","subject":"History","classGrade":"Grade 8","academicYear":"2026-27","edition":"2nd","publisher":"NCERT"}),
        Item(id="item_s12", organization_id="org_school_001", name="Football", sku="SPT-FB-001", category_id="cat_s3", category_name="Sports Equipment", module="general", quantity=10, available=8, reserved=2, location="Sports Room", status="in_stock", last_updated="2026-09-01"),
        Item(id="item_s13", organization_id="org_school_001", name="Basketball", sku="SPT-BB-001", category_id="cat_s3", category_name="Sports Equipment", module="general", quantity=6, available=5, reserved=1, location="Sports Room", status="in_stock", last_updated="2026-09-01"),
        Item(id="item_s14", organization_id="org_school_001", name="Cricket Bat", sku="SPT-CB-001", category_id="cat_s3", category_name="Sports Equipment", module="general", quantity=5, available=5, reserved=0, location="Sports Room", status="low_stock", last_updated="2026-09-04"),
        Item(id="item_s15", organization_id="org_school_001", name="Notebook (200pg)", sku="STA-NB-200", category_id="cat_s5", category_name="Stationery", module="general", quantity=500, available=320, reserved=0, location="Stationery Room", status="in_stock", last_updated="2026-09-01"),
        Item(id="item_s16", organization_id="org_school_001", name="Eraser Set", sku="STA-ER-001", category_id="cat_s5", category_name="Stationery", module="general", quantity=200, available=150, reserved=0, location="Stationery Room", status="in_stock", last_updated="2026-09-01"),
        Item(id="item_s17", organization_id="org_school_001", name="Geometry Box", sku="STA-GB-001", category_id="cat_s5", category_name="Stationery", module="general", quantity=0, available=0, reserved=0, location="Stationery Room", status="out_of_stock", last_updated="2026-08-28"),
        Item(id="item_p1", organization_id="org_pharmacy_001", name="Paracetamol 500mg", sku="MED-PCM-500", category_id="cat_p1", category_name="Tablets & Capsules", module="pharmacy", quantity=120, available=120, reserved=0, location="Shelf A1", status="in_stock", last_updated="2026-09-11", medicine={"genericName":"Paracetamol","manufacturer":"Cipla","batchNumber":"PCM-2026-A17","expiryDate":"08/2028","manufacturingDate":"08/2026","mrp":18,"purchasePrice":12,"prescriptionRequired":False}),
        Item(id="item_p2", organization_id="org_pharmacy_001", name="Amoxicillin 250mg", sku="MED-AMX-250", category_id="cat_p1", category_name="Tablets & Capsules", module="pharmacy", quantity=80, available=75, reserved=5, location="Shelf A2", status="in_stock", last_updated="2026-09-11", medicine={"genericName":"Amoxicillin","manufacturer":"Sun Pharma","batchNumber":"AMX-2026-B22","expiryDate":"03/2028","manufacturingDate":"03/2026","mrp":85,"purchasePrice":60,"prescriptionRequired":True}),
        Item(id="item_p3", organization_id="org_pharmacy_001", name="Cetirizine 10mg", sku="MED-CTZ-10", category_id="cat_p1", category_name="Tablets & Capsules", module="pharmacy", quantity=15, available=15, reserved=0, location="Shelf A3", status="low_stock", last_updated="2026-09-10", medicine={"genericName":"Cetirizine","manufacturer":"Cipla","batchNumber":"CTZ-2026-C09","expiryDate":"11/2027","manufacturingDate":"11/2025","mrp":32,"purchasePrice":22,"prescriptionRequired":False}),
        Item(id="item_p4", organization_id="org_pharmacy_001", name="Azithromycin 500mg", sku="MED-AZT-500", category_id="cat_p1", category_name="Tablets & Capsules", module="pharmacy", quantity=0, available=0, reserved=0, location="Shelf A4", status="out_of_stock", last_updated="2026-09-08", medicine={"genericName":"Azithromycin","manufacturer":"Zydus","batchNumber":"AZT-2026-D14","expiryDate":"06/2028","manufacturingDate":"06/2026","mrp":120,"purchasePrice":90,"prescriptionRequired":True}),
        Item(id="item_p5", organization_id="org_pharmacy_001", name="Cough Syrup 100ml", sku="MED-CSY-100", category_id="cat_p2", category_name="Syrups & Liquids", module="pharmacy", quantity=60, available=60, reserved=0, location="Shelf B1", status="in_stock", last_updated="2026-09-09", medicine={"genericName":"Dextromethorphan","manufacturer":"GSK","batchNumber":"CSY-2026-E03","expiryDate":"09/2027","manufacturingDate":"09/2025","mrp":65,"purchasePrice":45,"prescriptionRequired":False}),
        Item(id="item_p6", organization_id="org_pharmacy_001", name="Oral Rehydration Salts", sku="MED-ORS-001", category_id="cat_p2", category_name="Syrups & Liquids", module="pharmacy", quantity=40, available=40, reserved=0, location="Shelf B2", status="in_stock", last_updated="2026-09-01", medicine={"genericName":"ORS","manufacturer":"Cipla","batchNumber":"ORS-2026-F01","expiryDate":"06/2028","manufacturingDate":"06/2026","mrp":25,"purchasePrice":15,"prescriptionRequired":False}),
        Item(id="item_p7", organization_id="org_pharmacy_001", name="Insulin Injection", sku="MED-INS-001", category_id="cat_p3", category_name="Injectables", module="pharmacy", quantity=40, available=37, reserved=3, location="Cold Storage", status="in_stock", last_updated="2026-09-09", medicine={"genericName":"Insulin","manufacturer":"Biocon","batchNumber":"INS-2026-G11","expiryDate":"02/2027","manufacturingDate":"02/2026","mrp":280,"purchasePrice":200,"prescriptionRequired":True}),
        Item(id="item_p8", organization_id="org_pharmacy_001", name="Antiseptic Cream 30g", sku="MED-ANT-030", category_id="cat_p4", category_name="Topicals", module="pharmacy", quantity=12, available=12, reserved=0, location="Shelf C1", status="low_stock", last_updated="2026-09-08", medicine={"genericName":"Chlorhexidine","manufacturer":"Reckitt","batchNumber":"ANT-2025-H05","expiryDate":"09/2026","manufacturingDate":"09/2025","mrp":95,"purchasePrice":70,"prescriptionRequired":False}),
        Item(id="item_p9", organization_id="org_pharmacy_001", name="Ibuprofen 400mg", sku="MED-IBU-400", category_id="cat_p1", category_name="Tablets & Capsules", module="pharmacy", quantity=150, available=150, reserved=0, location="Shelf A5", status="in_stock", last_updated="2026-09-07", medicine={"genericName":"Ibuprofen","manufacturer":"Cipla","batchNumber":"IBU-2026-I19","expiryDate":"10/2028","manufacturingDate":"10/2026","mrp":28,"purchasePrice":18,"prescriptionRequired":False}),
        Item(id="item_p10", organization_id="org_pharmacy_001", name="Vitamin C 500mg", sku="MED-VTC-500", category_id="cat_p6", category_name="Nutritional Supplements", module="pharmacy", quantity=200, available=200, reserved=0, location="Shelf D1", status="in_stock", last_updated="2026-09-02", medicine={"genericName":"Ascorbic Acid","manufacturer":"Himalaya","batchNumber":"VTC-2026-F08","expiryDate":"12/2028","manufacturingDate":"12/2026","mrp":120,"purchasePrice":80,"prescriptionRequired":False}),
        Item(id="item_p11", organization_id="org_pharmacy_001", name="BP Monitor (Digital)", sku="DEV-BPM-001", category_id="cat_p5", category_name="Medical Devices", module="pharmacy", quantity=5, available=5, reserved=0, location="Devices Shelf", status="low_stock", last_updated="2026-09-01"),
        Item(id="item_p12", organization_id="org_pharmacy_001", name="Glucometer Kit", sku="DEV-GLU-001", category_id="cat_p5", category_name="Medical Devices", module="pharmacy", quantity=3, available=3, reserved=0, location="Devices Shelf", status="low_stock", last_updated="2026-09-01"),
    ]
    db.add_all(items)

    # -------------------------------------------------------------------------
    # Transactions
    # -------------------------------------------------------------------------
    txs = [
        StockTransaction(id="tx1", organization_id="org_school_001", date="2026-09-11 10:32", item_id="item_s1", item_name="School Shirt", type="issued", quantity=-12, user="Rajesh Kumar", reference="ISS-2026-0421", recipient="Arjun Kumar", recipient_class="Grade 5 - A"),
        StockTransaction(id="tx2", organization_id="org_school_001", date="2026-09-11 09:15", item_id="item_s8", item_name="Mathematics Textbook", type="received", quantity=45, user="Anita Verma", reference="PO-2026-0118"),
        StockTransaction(id="tx3", organization_id="org_school_001", date="2026-09-10 16:45", item_id="item_s5", item_name="Sports Socks", type="issued", quantity=-20, user="Rajesh Kumar", reference="ISS-2026-0420", recipient="Grade 8 - B", recipient_class="Grade 8 - B"),
        StockTransaction(id="tx4", organization_id="org_school_001", date="2026-09-10 14:20", item_id="item_s2", item_name="School Pant", type="received", quantity=50, user="Anita Verma", reference="PO-2026-0117"),
        StockTransaction(id="tx5", organization_id="org_school_001", date="2026-09-10 11:00", item_id="item_s8", item_name="Mathematics Textbook", type="issued", quantity=-15, user="Rajesh Kumar", reference="ISS-2026-0419", recipient="Grade 5 - A", recipient_class="Grade 5 - A"),
        StockTransaction(id="tx6", organization_id="org_school_001", date="2026-09-09 15:30", item_id="item_s9", item_name="English Textbook", type="issued", quantity=-10, user="Rajesh Kumar", reference="ISS-2026-0418", recipient="Grade 5 - B", recipient_class="Grade 5 - B"),
        StockTransaction(id="tx7", organization_id="org_school_001", date="2026-09-09 10:15", item_id="item_s4", item_name="Blue Tie", type="adjusted", quantity=-3, user="Priya Sharma", reference="ADJ-2026-0042"),
        StockTransaction(id="tx8", organization_id="org_school_001", date="2026-09-08 13:00", item_id="item_s3", item_name="School Skirt", type="received", quantity=30, user="Anita Verma", reference="PO-2026-0116"),
        StockTransaction(id="tx9", organization_id="org_school_001", date="2026-09-07 09:45", item_id="item_s6", item_name="School Belt", type="issued", quantity=-8, user="Rajesh Kumar", reference="ISS-2026-0417", recipient="Grade 6 - A", recipient_class="Grade 6 - A"),
        StockTransaction(id="tx10", organization_id="org_school_001", date="2026-09-05 11:30", item_id="item_s7", item_name="Blazer", type="damaged", quantity=-2, user="Priya Sharma", reference="DMG-2026-0012"),
        StockTransaction(id="tx11", organization_id="org_school_001", date="2026-09-05 08:00", item_id="item_s1", item_name="School Shirt", type="received", quantity=50, user="Anita Verma", reference="PO-2026-0115"),
        StockTransaction(id="tx12", organization_id="org_school_001", date="2026-09-04 14:00", item_id="item_s14", item_name="Cricket Bat", type="transferred", quantity=-5, user="Priya Sharma", reference="TRF-2026-0008"),
        StockTransaction(id="tx13", organization_id="org_pharmacy_001", date="2026-09-11 09:30", item_id="item_p1", item_name="Paracetamol 500mg", type="issued", quantity=-10, user="Sneha Reddy", reference="SALE-2026-0845"),
        StockTransaction(id="tx14", organization_id="org_pharmacy_001", date="2026-09-11 08:15", item_id="item_p2", item_name="Amoxicillin 250mg", type="issued", quantity=-5, user="Sneha Reddy", reference="SALE-2026-0844"),
        StockTransaction(id="tx15", organization_id="org_pharmacy_001", date="2026-09-10 17:00", item_id="item_p1", item_name="Paracetamol 500mg", type="received", quantity=100, user="Karthik N", reference="PO-2026-0220"),
        StockTransaction(id="tx16", organization_id="org_pharmacy_001", date="2026-09-10 14:30", item_id="item_p3", item_name="Cetirizine 10mg", type="issued", quantity=-8, user="Sneha Reddy", reference="SALE-2026-0843"),
        StockTransaction(id="tx17", organization_id="org_pharmacy_001", date="2026-09-09 11:00", item_id="item_p7", item_name="Insulin Injection", type="issued", quantity=-3, user="Sneha Reddy", reference="SALE-2026-0842"),
        StockTransaction(id="tx18", organization_id="org_pharmacy_001", date="2026-09-09 09:00", item_id="item_p5", item_name="Cough Syrup 100ml", type="received", quantity=40, user="Karthik N", reference="PO-2026-0219"),
        StockTransaction(id="tx19", organization_id="org_pharmacy_001", date="2026-09-08 16:00", item_id="item_p8", item_name="Antiseptic Cream 30g", type="issued", quantity=-6, user="Sneha Reddy", reference="SALE-2026-0841"),
        StockTransaction(id="tx20", organization_id="org_pharmacy_001", date="2026-09-08 10:30", item_id="item_p4", item_name="Azithromycin 500mg", type="adjusted", quantity=-20, user="Dr. Vikram Rao", reference="ADJ-2026-0055"),
    ]
    db.add_all(txs)

    # -------------------------------------------------------------------------
    # Vendors
    # -------------------------------------------------------------------------
    vendors = [
        Vendor(id="sup1", organization_id="org_school_001", name="ABC Uniform Suppliers", contact_person="Mahesh Gupta", phone="+91 98765 43210", email="mahesh@abcuniforms.com", address="78 Textile Hub, Bengaluru", vendor_type="School Uniforms", status="active", purchase_history=[{"date":"2026-09-05","item":"School Shirt","quantity":50,"amount":12500}], outstanding_orders=[{"item":"Blazer (Grade 8)","quantity":20,"expectedDate":"2026-09-20","status":"Pending"}]),
        Vendor(id="sup2", organization_id="org_school_001", name="Global Book Distributors", contact_person="Lakshmi Nair", phone="+91 98450 11223", email="orders@globalbooks.in", address="12 Knowledge Park, Bengaluru", vendor_type="Books", status="active", purchase_history=[{"date":"2026-09-11","item":"Mathematics Textbook","quantity":45,"amount":6750}], outstanding_orders=[{"item":"Science Workbook","quantity":50,"expectedDate":"2026-09-15","status":"Shipped"}]),
        Vendor(id="sup3", organization_id="org_school_001", name="Sports Gear India", contact_person="Ramesh Singh", phone="+91 99876 54321", email="info@sportsgear.in", address="45 Stadium Road, Bengaluru", vendor_type="Sports Equipment", status="active", purchase_history=[{"date":"2026-08-30","item":"Cricket Bat","quantity":10,"amount":8000}], outstanding_orders=[]),
        Vendor(id="sup4", organization_id="org_school_001", name="Stationery World", contact_person="Deepak Jain", phone="+91 97000 33445", email="sales@stationeryworld.com", address="90 Commercial St, Bengaluru", vendor_type="Stationery", status="active", purchase_history=[{"date":"2026-09-01","item":"Notebook (200pg)","quantity":200,"amount":20000}], outstanding_orders=[]),
        Vendor(id="sup5", organization_id="org_pharmacy_001", name="ABC Pharma Distributors", contact_person="Naveen Kumar", phone="+91 98220 55667", email="naveen@abcpharma.in", address="33 Pharma Zone, Bengaluru", vendor_type="Tablets & Capsules", status="active", purchase_history=[{"date":"2026-09-10","item":"Paracetamol 500mg","quantity":100,"amount":1200}], outstanding_orders=[{"item":"Azithromycin 500mg","quantity":50,"expectedDate":"2026-09-18","status":"Pending"}]),
        Vendor(id="sup6", organization_id="org_pharmacy_001", name="Cipla Direct Supply", contact_person="Aisha Khan", phone="+91 99330 88990", email="aisha@ciplasupply.in", address="7 Medical Enclave, Bengaluru", vendor_type="Antibiotics", status="active", purchase_history=[{"date":"2026-09-05","item":"Amoxicillin 250mg","quantity":50,"amount":1100}], outstanding_orders=[]),
        Vendor(id="sup7", organization_id="org_pharmacy_001", name="Biocon Cold Chain", contact_person="Sanjay Rao", phone="+91 98111 22334", email="cold@biocon.in", address="21 Biotech Park, Bengaluru", vendor_type="Injectables & Cold Storage", status="active", purchase_history=[{"date":"2026-09-01","item":"Insulin Injection","quantity":20,"amount":5600}], outstanding_orders=[{"item":"Insulin Injection","quantity":30,"expectedDate":"2026-09-25","status":"Shipped"}]),
    ]
    db.add_all(vendors)

    # -------------------------------------------------------------------------
    # Recipients  (School = Students, Pharmacy = Customers)
    # -------------------------------------------------------------------------
    recipients = [
        Recipient(id="rec1", organization_id="org_school_001", name="Arjun Kumar", identifier="STU-2026-1042", group="Grade 5 - A", contact="+91 98000 11001"),
        Recipient(id="rec2", organization_id="org_school_001", name="Diya Sharma", identifier="STU-2026-1043", group="Grade 5 - A", contact="+91 98000 11002"),
        Recipient(id="rec3", organization_id="org_school_001", name="Kabir Mehta", identifier="STU-2026-1051", group="Grade 6 - B", contact="+91 98000 11003"),
        Recipient(id="rec4", organization_id="org_school_001", name="Ananya Reddy", identifier="STU-2026-1072", group="Grade 8 - A", contact="+91 98000 11004"),
        Recipient(id="rec5", organization_id="org_school_001", name="Ishaan Gupta", identifier="STU-2026-1078", group="Grade 8 - B", contact="+91 98000 11005"),
        Recipient(id="rec6", organization_id="org_pharmacy_001", name="Rajan Pillai", identifier="CUST-001", group="Koramangala", contact="+91 99001 22001"),
        Recipient(id="rec7", organization_id="org_pharmacy_001", name="Sunita Bose", identifier="CUST-002", group="Indiranagar", contact="+91 99001 22002"),
    ]
    db.add_all(recipients)

    # -------------------------------------------------------------------------
    # Assignments  (full condition + damage + fine tracking)
    # -------------------------------------------------------------------------
    assignments = [
        Assignment(id="asgn1", organization_id="org_school_001", recipient_id="rec1", recipient_name="Arjun Kumar", recipient_identifier="STU-2026-1042", recipient_group="Grade 5 - A", item_id="item_s1", item_name="School Shirt", item_details="Size 32", quantity=1, condition_issued="Good", issue_date="2026-09-10", expected_return="2027-04-30", status="issued", fine_amount=0, fine_paid=False, issued_by="Rajesh Kumar"),
        Assignment(id="asgn2", organization_id="org_school_001", recipient_id="rec1", recipient_name="Arjun Kumar", recipient_identifier="STU-2026-1042", recipient_group="Grade 5 - A", item_id="item_s2", item_name="School Pant", item_details="Size 30", quantity=1, condition_issued="Good", issue_date="2026-09-10", expected_return="2027-04-30", status="issued", fine_amount=0, fine_paid=False, issued_by="Rajesh Kumar"),
        Assignment(id="asgn3", organization_id="org_school_001", recipient_id="rec1", recipient_name="Arjun Kumar", recipient_identifier="STU-2026-1042", recipient_group="Grade 5 - A", item_id="item_s8", item_name="Mathematics Textbook", item_details="Grade 5", quantity=1, condition_issued="New", issue_date="2026-09-05", expected_return="2027-04-30", status="issued", fine_amount=0, fine_paid=False, issued_by="Anita Verma"),
        Assignment(id="asgn4", organization_id="org_school_001", recipient_id="rec2", recipient_name="Diya Sharma", recipient_identifier="STU-2026-1043", recipient_group="Grade 5 - A", item_id="item_s3", item_name="School Skirt", item_details="Size 28", quantity=1, condition_issued="Good", issue_date="2026-09-08", expected_return="2027-04-30", status="issued", fine_amount=0, fine_paid=False, issued_by="Rajesh Kumar"),
        Assignment(id="asgn5", organization_id="org_school_001", recipient_id="rec3", recipient_name="Kabir Mehta", recipient_identifier="STU-2026-1051", recipient_group="Grade 6 - B", item_id="item_s6", item_name="School Belt", item_details="Size M", quantity=1, condition_issued="Good", issue_date="2026-09-07", status="issued", fine_amount=0, fine_paid=False, issued_by="Rajesh Kumar"),
        # Returned in good condition
        Assignment(id="asgn6", organization_id="org_school_001", recipient_id="rec4", recipient_name="Ananya Reddy", recipient_identifier="STU-2026-1072", recipient_group="Grade 8 - A", item_id="item_s10", item_name="Science Workbook", item_details="Grade 5", quantity=1, condition_issued="New", condition_returned="Good", issue_date="2026-09-06", return_date="2026-09-09", status="returned", fine_amount=0, fine_paid=False, issued_by="Anita Verma", received_by="Rajesh Kumar"),
        # Returned with damage — fine pending
        Assignment(id="asgn7", organization_id="org_school_001", recipient_id="rec5", recipient_name="Ishaan Gupta", recipient_identifier="STU-2026-1078", recipient_group="Grade 8 - B", item_id="item_s7", item_name="Blazer", item_details="Size 38", quantity=1, condition_issued="Good", condition_returned="Damaged", issue_date="2026-08-20", return_date="2026-09-10", status="fine_pending", damage_notes="Torn collar, missing buttons", fine_amount=500, fine_paid=False, issued_by="Rajesh Kumar", received_by="Anita Verma"),
    ]
    db.add_all(assignments)

    # -------------------------------------------------------------------------
    # Batches
    # -------------------------------------------------------------------------
    batches = [
        Batch(id="b1", organization_id="org_pharmacy_001", medicine_name="Paracetamol 500mg", batch_number="PCM-2026-A17", manufacturing_date="08/2026", expiry_date="08/2028", quantity=120, status="active"),
        Batch(id="b2", organization_id="org_pharmacy_001", medicine_name="Amoxicillin 250mg", batch_number="AMX-2026-B22", manufacturing_date="03/2026", expiry_date="03/2028", quantity=80, status="active"),
        Batch(id="b3", organization_id="org_pharmacy_001", medicine_name="Cetirizine 10mg", batch_number="CTZ-2026-C09", manufacturing_date="11/2025", expiry_date="11/2027", quantity=15, status="active"),
        Batch(id="b4", organization_id="org_pharmacy_001", medicine_name="Azithromycin 500mg", batch_number="AZT-2026-D14", manufacturing_date="06/2026", expiry_date="06/2028", quantity=0, status="expired"),
        Batch(id="b5", organization_id="org_pharmacy_001", medicine_name="Cough Syrup 100ml", batch_number="CSY-2026-E03", manufacturing_date="09/2025", expiry_date="09/2027", quantity=60, status="active"),
        Batch(id="b6", organization_id="org_pharmacy_001", medicine_name="Antiseptic Cream 30g", batch_number="ANT-2025-H05", manufacturing_date="09/2025", expiry_date="09/2026", quantity=12, status="expiring_soon"),
        Batch(id="b7", organization_id="org_pharmacy_001", medicine_name="Insulin Injection", batch_number="INS-2026-G11", manufacturing_date="02/2026", expiry_date="02/2027", quantity=40, status="expiring_soon"),
        Batch(id="b8", organization_id="org_pharmacy_001", medicine_name="Ciprofloxacin 500mg", batch_number="CIP-2025-L40", manufacturing_date="04/2025", expiry_date="04/2027", quantity=0, status="expired"),
        Batch(id="b9", organization_id="org_pharmacy_001", medicine_name="Ibuprofen 400mg", batch_number="IBU-2026-I19", manufacturing_date="10/2026", expiry_date="10/2028", quantity=150, status="active"),
        Batch(id="b10", organization_id="org_pharmacy_001", medicine_name="Omeprazole 20mg", batch_number="OMP-2026-J27", manufacturing_date="07/2026", expiry_date="07/2028", quantity=90, status="active"),
        Batch(id="b11", organization_id="org_pharmacy_001", medicine_name="Metformin 500mg", batch_number="MET-2026-K33", manufacturing_date="01/2027", expiry_date="01/2029", quantity=110, status="active"),
        Batch(id="b12", organization_id="org_pharmacy_001", medicine_name="Vitamin C Tablets", batch_number="VTC-2026-F08", manufacturing_date="12/2026", expiry_date="12/2028", quantity=200, status="active"),
    ]
    db.add_all(batches)

    # -------------------------------------------------------------------------
    # Receipt Templates
    # -------------------------------------------------------------------------
    templates = [
        ReceiptTemplate(id="rt1", organization_id="org_school_001", name="Uniform Issue Receipt", type="uniform_issue", org_name="ABC INTERNATIONAL SCHOOL", org_address="123 Education Lane, Bengaluru, KA 560001", title="UNIFORM ISSUE RECEIPT", fields=["Student","Class","Academic Year"], show_logo=True, show_signature=True, footer="This receipt must be retained for the academic year.", notes="Items must be returned in good condition at end of academic year."),
        ReceiptTemplate(id="rt2", organization_id="org_school_001", name="Book Issue Receipt", type="book_issue", org_name="ABC INTERNATIONAL SCHOOL", org_address="123 Education Lane, Bengaluru, KA 560001", title="BOOK ISSUE RECEIPT", fields=["Student","Class","Academic Year"], show_logo=True, show_signature=True, footer="Books must be returned before final exams.", notes="Damage to books may incur a replacement fee."),
        ReceiptTemplate(id="rt3", organization_id="org_school_001", name="Stock Receipt", type="stock_receipt", org_name="ABC INTERNATIONAL SCHOOL", org_address="123 Education Lane, Bengaluru, KA 560001", title="STOCK RECEIPT", fields=["Vendor","Date","Reference"], show_logo=True, show_signature=False, footer="Goods received in good condition.", notes=""),
        ReceiptTemplate(id="rt4", organization_id="org_school_001", name="Return Receipt", type="return_receipt", org_name="ABC INTERNATIONAL SCHOOL", org_address="123 Education Lane, Bengaluru, KA 560001", title="RETURN RECEIPT", fields=["Student","Class","Return Date"], show_logo=True, show_signature=True, footer="", notes="Item condition will be assessed upon return."),
        ReceiptTemplate(id="rt6", organization_id="org_school_001", name="Class Issue Report", type="class_issue_report", org_name="ABC INTERNATIONAL SCHOOL", org_address="123 Education Lane, Bengaluru, KA 560001", title="CLASS MATERIAL ISSUE REPORT", fields=["Class","Academic Year","Date"], show_logo=True, show_signature=True, footer="Storekeeper Signature: ________________", notes="Students must acknowledge receipt by signing the register."),
        ReceiptTemplate(id="rt5", organization_id="org_pharmacy_001", name="Stock Receipt", type="stock_receipt", org_name="APOLLO MEDICAL STORE", org_address="45 MG Road, Bengaluru, KA 560001", title="STOCK RECEIPT", fields=["Vendor","Date","Reference"], show_logo=True, show_signature=False, footer="Medicines received and verified.", notes="Check batch numbers and expiry dates."),
    ]
    db.add_all(templates)

    # -------------------------------------------------------------------------
    # Custom Fields
    # -------------------------------------------------------------------------
    custom_fields = [
        CustomField(id="cf1", organization_id="org_school_001", name="Academic Year", type="dropdown", options=["2025-26","2026-27","2027-28"], entity="item"),
        CustomField(id="cf2", organization_id="org_school_001", name="Department", type="text", entity="item"),
        CustomField(id="cf3", organization_id="org_school_001", name="Reorder Level", type="number", entity="item"),
        CustomField(id="cf4", organization_id="org_pharmacy_001", name="Storage Temperature", type="dropdown", options=["Room Temp","Cold Storage (2-8°C)","Frozen (-20°C)"], entity="item"),
        CustomField(id="cf5", organization_id="org_pharmacy_001", name="GST Rate", type="number", entity="item"),
    ]
    db.add_all(custom_fields)

    db.commit()
    db.close()
    print("✓ Database seeded successfully.")


if __name__ == "__main__":
    seed()
