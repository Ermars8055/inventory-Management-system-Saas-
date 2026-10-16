"""
Seed 100 items and 120+ time-distributed transactions for Priya Sharma (org_school_001).
Ensures graphs reflect stock changes over time across May 2026 - October 2026.
"""
import sqlite3
import random
import os
from datetime import datetime, timedelta

DB_PATH = os.environ.get("DB_PATH", "/data/stockpilot.db")
if not os.path.exists(DB_PATH):
    # Fallback to local development path if running outside Docker
    DB_PATH = "stockpilot.db" if os.path.exists("stockpilot.db") else "backend/stockpilot.db"

ORG_ID = "org_school_001"

CATEGORIES = [
    ("cat_s1", "Uniforms", "#3B82F6"),
    ("cat_s2", "Books & Textbooks", "#10B981"),
    ("cat_s3", "Stationery & Supplies", "#EF4444"),
    ("cat_s4", "Sports Equipment", "#F59E0B"),
    ("cat_s5", "Science & Lab Equipment", "#8B5CF6"),
    ("cat_s6", "Classroom Electronics & IT", "#06B6D4"),
]

# 100 distinct school items definition
ITEM_DEFINITIONS = [
    # Uniforms (20 items)
    ("School Shirt - Boys Size 28", "cat_s1", "Uniforms", "uniforms", "Main Store - Rack U1", 80, 65, 0, 15, 30),
    ("School Shirt - Boys Size 30", "cat_s1", "Uniforms", "uniforms", "Main Store - Rack U1", 95, 78, 0, 15, 30),
    ("School Shirt - Boys Size 32", "cat_s1", "Uniforms", "uniforms", "Main Store - Rack U1", 110, 88, 2, 20, 40),
    ("School Shirt - Boys Size 34", "cat_s1", "Uniforms", "uniforms", "Main Store - Rack U1", 85, 60, 0, 15, 30),
    ("School Shirt - Boys Size 36", "cat_s1", "Uniforms", "uniforms", "Main Store - Rack U1", 70, 52, 0, 15, 25),
    ("School Shirt - Girls Size 28", "cat_s1", "Uniforms", "uniforms", "Main Store - Rack U2", 75, 62, 0, 15, 25),
    ("School Shirt - Girls Size 30", "cat_s1", "Uniforms", "uniforms", "Main Store - Rack U2", 90, 70, 0, 15, 30),
    ("School Shirt - Girls Size 32", "cat_s1", "Uniforms", "uniforms", "Main Store - Rack U2", 100, 84, 0, 15, 30),
    ("School Trousers - Boys Size 28", "cat_s1", "Uniforms", "uniforms", "Main Store - Rack U3", 65, 50, 0, 15, 25),
    ("School Trousers - Boys Size 30", "cat_s1", "Uniforms", "uniforms", "Main Store - Rack U3", 85, 68, 0, 15, 30),
    ("School Trousers - Boys Size 32", "cat_s1", "Uniforms", "uniforms", "Main Store - Rack U3", 90, 72, 0, 15, 30),
    ("School Skirt - Girls Size 26", "cat_s1", "Uniforms", "uniforms", "Main Store - Rack U4", 55, 42, 0, 10, 20),
    ("School Skirt - Girls Size 28", "cat_s1", "Uniforms", "uniforms", "Main Store - Rack U4", 70, 55, 0, 15, 25),
    ("School Skirt - Girls Size 30", "cat_s1", "Uniforms", "uniforms", "Main Store - Rack U4", 80, 64, 0, 15, 30),
    ("House Tie - Red House", "cat_s1", "Uniforms", "uniforms", "Main Store - Bin T1", 120, 95, 0, 20, 50),
    ("House Tie - Blue House", "cat_s1", "Uniforms", "uniforms", "Main Store - Bin T2", 120, 98, 0, 20, 50),
    ("House Tie - Green House", "cat_s1", "Uniforms", "uniforms", "Main Store - Bin T3", 120, 90, 0, 20, 50),
    ("House Tie - Yellow House", "cat_s1", "Uniforms", "uniforms", "Main Store - Bin T4", 120, 102, 0, 20, 50),
    ("School Blazer - Navy Size 32", "cat_s1", "Uniforms", "uniforms", "Wardrobe Room", 45, 38, 0, 10, 20),
    ("School Blazer - Navy Size 36", "cat_s1", "Uniforms", "uniforms", "Wardrobe Room", 50, 41, 0, 10, 20),

    # Books & Textbooks (25 items)
    ("Mathematics Grade 1 (NCERT)", "cat_s2", "Books & Textbooks", "books", "Library - Shelf M1", 60, 48, 0, 15, 30),
    ("Mathematics Grade 2 (NCERT)", "cat_s2", "Books & Textbooks", "books", "Library - Shelf M1", 60, 50, 0, 15, 30),
    ("Mathematics Grade 3 (NCERT)", "cat_s2", "Books & Textbooks", "books", "Library - Shelf M1", 65, 52, 0, 15, 30),
    ("Mathematics Grade 4 (NCERT)", "cat_s2", "Books & Textbooks", "books", "Library - Shelf M1", 70, 58, 0, 15, 30),
    ("Mathematics Grade 5 (NCERT)", "cat_s2", "Books & Textbooks", "books", "Library - Shelf M2", 80, 64, 0, 20, 40),
    ("Mathematics Grade 6 (NCERT)", "cat_s2", "Books & Textbooks", "books", "Library - Shelf M2", 80, 62, 0, 20, 40),
    ("Mathematics Grade 7 (NCERT)", "cat_s2", "Books & Textbooks", "books", "Library - Shelf M2", 75, 59, 0, 15, 35),
    ("Mathematics Grade 8 (NCERT)", "cat_s2", "Books & Textbooks", "books", "Library - Shelf M3", 85, 68, 0, 20, 40),
    ("Mathematics Grade 9 (NCERT)", "cat_s2", "Books & Textbooks", "books", "Library - Shelf M3", 90, 75, 0, 20, 40),
    ("Mathematics Grade 10 (NCERT)", "cat_s2", "Books & Textbooks", "books", "Library - Shelf M3", 95, 80, 0, 20, 45),
    ("Science Explorations Grade 4", "cat_s2", "Books & Textbooks", "books", "Library - Shelf S1", 65, 54, 0, 15, 30),
    ("General Science Grade 5", "cat_s2", "Books & Textbooks", "books", "Library - Shelf S1", 75, 60, 0, 15, 35),
    ("Science Textbook Grade 6", "cat_s2", "Books & Textbooks", "books", "Library - Shelf S2", 80, 65, 0, 20, 40),
    ("Science Textbook Grade 7", "cat_s2", "Books & Textbooks", "books", "Library - Shelf S2", 80, 63, 0, 20, 40),
    ("Science Textbook Grade 8", "cat_s2", "Books & Textbooks", "books", "Library - Shelf S2", 85, 70, 0, 20, 40),
    ("Physics Fundamentals Grade 9", "cat_s2", "Books & Textbooks", "books", "Library - Shelf P1", 70, 55, 0, 15, 35),
    ("Chemistry Concepts Grade 9", "cat_s2", "Books & Textbooks", "books", "Library - Shelf C1", 70, 56, 0, 15, 35),
    ("Biology & Life Science Grade 9", "cat_s2", "Books & Textbooks", "books", "Library - Shelf B1", 70, 58, 0, 15, 35),
    ("English Reader Grade 5 - Honeydew", "cat_s2", "Books & Textbooks", "books", "Library - Shelf E1", 75, 62, 0, 15, 35),
    ("English Grammar & Composition G6", "cat_s2", "Books & Textbooks", "books", "Library - Shelf E2", 80, 66, 0, 20, 40),
    ("Social Studies & Geography G7", "cat_s2", "Books & Textbooks", "books", "Library - Shelf SS1", 75, 61, 0, 15, 35),
    ("Indian History & Civics G8", "cat_s2", "Books & Textbooks", "books", "Library - Shelf SS2", 80, 65, 0, 20, 40),
    ("Computer Science & Python G8", "cat_s2", "Books & Textbooks", "books", "Library - Shelf CS1", 65, 52, 0, 15, 30),
    ("Hindi Vasant Grade 6", "cat_s2", "Books & Textbooks", "books", "Library - Shelf H1", 70, 57, 0, 15, 30),
    ("Sanskrit Ruchira Grade 7", "cat_s2", "Books & Textbooks", "books", "Library - Shelf H2", 50, 41, 0, 10, 25),

    # Stationery & Classroom Supplies (20 items)
    ("Single Line Notebook (192 Pages)", "cat_s3", "Stationery & Supplies", "general", "Stationery Store", 450, 320, 0, 50, 150),
    ("Four Line Notebook for Primary", "cat_s3", "Stationery & Supplies", "general", "Stationery Store", 350, 240, 0, 50, 100),
    ("Square Grid Math Notebook (100 Pages)", "cat_s3", "Stationery & Supplies", "general", "Stationery Store", 300, 210, 0, 40, 100),
    ("Practical Lab Record Book (Physics)", "cat_s3", "Stationery & Supplies", "general", "Stationery Store", 120, 85, 0, 20, 50),
    ("Practical Lab Record Book (Chemistry)", "cat_s3", "Stationery & Supplies", "general", "Stationery Store", 120, 88, 0, 20, 50),
    ("A4 Drawing Book Spiral (40 Sheets)", "cat_s3", "Stationery & Supplies", "general", "Art Cupboard", 180, 130, 0, 30, 60),
    ("Classroom Whiteboard Markers (Black - Pack of 10)", "cat_s3", "Stationery & Supplies", "general", "Admin Office", 40, 28, 0, 10, 20),
    ("Classroom Whiteboard Markers (Blue - Pack of 10)", "cat_s3", "Stationery & Supplies", "general", "Admin Office", 40, 30, 0, 10, 20),
    ("Classroom Whiteboard Dusters (Magnetic)", "cat_s3", "Stationery & Supplies", "general", "Admin Office", 50, 38, 0, 10, 25),
    ("Dustless White Chalk Box (100 Sticks)", "cat_s3", "Stationery & Supplies", "general", "Stationery Store", 60, 45, 0, 15, 30),
    ("Student Geometry Box Set (Oxford)", "cat_s3", "Stationery & Supplies", "general", "Stationery Store", 90, 68, 0, 20, 40),
    ("Ballpoint Pens Blue (Pack of 50)", "cat_s3", "Stationery & Supplies", "general", "Admin Office", 35, 24, 0, 10, 20),
    ("Ballpoint Pens Black (Pack of 50)", "cat_s3", "Stationery & Supplies", "general", "Admin Office", 30, 22, 0, 10, 15),
    ("HB Wooden Pencils Box (100 pcs)", "cat_s3", "Stationery & Supplies", "general", "Stationery Store", 45, 31, 0, 10, 25),
    ("Vinyl Erasers Box (60 pcs)", "cat_s3", "Stationery & Supplies", "general", "Stationery Store", 50, 36, 0, 10, 25),
    ("Long Scale Rulers (30cm Plastic)", "cat_s3", "Stationery & Supplies", "general", "Stationery Store", 150, 110, 0, 25, 60),
    ("PVA Glue Sticks (20g - Pack of 12)", "cat_s3", "Stationery & Supplies", "general", "Art Cupboard", 35, 26, 0, 8, 15),
    ("Student Craft Scissors (Blunt Tip)", "cat_s3", "Stationery & Supplies", "general", "Art Cupboard", 80, 62, 0, 15, 30),
    ("Heavy Duty Stapler & Pin Pack", "cat_s3", "Stationery & Supplies", "general", "Staff Room", 15, 11, 0, 5, 10),
    ("Laminating Pouches A4 (100 Pack)", "cat_s3", "Stationery & Supplies", "general", "Admin Office", 12, 8, 0, 3, 5),

    # Sports Equipment (15 items)
    ("Cosco Football Size 5 (FIFA Spec)", "cat_s4", "Sports Equipment", "general", "Sports Room - Rack A", 18, 14, 0, 5, 10),
    ("Nivia Basketball Size 7", "cat_s4", "Sports Equipment", "general", "Sports Room - Rack A", 16, 12, 0, 4, 8),
    ("Spartan Volleyball (Official Match)", "cat_s4", "Sports Equipment", "general", "Sports Room - Rack A", 15, 12, 0, 4, 8),
    ("English Willow Cricket Bat (Grade 7-10)", "cat_s4", "Sports Equipment", "general", "Sports Room - Cricket Kit", 12, 9, 0, 3, 6),
    ("Kashmir Willow Cricket Bat (Junior G3-6)", "cat_s4", "Sports Equipment", "general", "Sports Room - Cricket Kit", 14, 11, 0, 4, 6),
    ("Cricket Leather Match Ball (Red)", "cat_s4", "Sports Equipment", "general", "Sports Room - Cricket Kit", 40, 28, 0, 10, 20),
    ("Cricket Wooden Wicket Stumps Set", "cat_s4", "Sports Equipment", "general", "Sports Room - Cricket Kit", 6, 5, 0, 2, 4),
    ("Yonex Badminton Racket (Carbon Light)", "cat_s4", "Sports Equipment", "general", "Sports Room - Badminton", 24, 18, 0, 6, 12),
    ("Yonex Feather Shuttlecock Tube (12 pcs)", "cat_s4", "Sports Equipment", "general", "Sports Room - Badminton", 30, 22, 0, 8, 15),
    ("Stag Table Tennis Rackets (Pair)", "cat_s4", "Sports Equipment", "general", "Sports Room - TT", 16, 13, 0, 4, 8),
    ("Table Tennis 3-Star Balls (Box of 12)", "cat_s4", "Sports Equipment", "general", "Sports Room - TT", 25, 19, 0, 5, 10),
    ("Adjustable Speed Skipping Ropes", "cat_s4", "Sports Equipment", "general", "Sports Room - Box 3", 45, 34, 0, 10, 20),
    ("Agility Training Marker Cones (Set of 20)", "cat_s4", "Sports Equipment", "general", "Sports Room - Box 4", 8, 7, 0, 2, 4),
    ("Fox 40 Classic Ref Whistles", "cat_s4", "Sports Equipment", "general", "Sports Room - Cabinet", 20, 16, 0, 5, 10),
    ("Digital Stopwatch for Athletics (Waterproof)", "cat_s4", "Sports Equipment", "general", "Sports Room - Cabinet", 12, 9, 0, 3, 6),

    # Science & Lab Equipment (12 items)
    ("Compound Optical Microscope (1000x)", "cat_s5", "Science & Lab Equipment", "general", "Biology Lab", 15, 13, 0, 3, 5),
    ("Glass Beaker Set (100ml, 250ml, 500ml)", "cat_s5", "Science & Lab Equipment", "general", "Chemistry Lab - Cupboard 1", 35, 27, 0, 8, 15),
    ("Borosilicate Glass Conical Flask 250ml", "cat_s5", "Science & Lab Equipment", "general", "Chemistry Lab - Cupboard 1", 40, 32, 0, 8, 15),
    ("Graduated Measuring Cylinder 100ml", "cat_s5", "Science & Lab Equipment", "general", "Chemistry Lab - Cupboard 2", 30, 24, 0, 6, 12),
    ("Test Tube Pack with Wooden Rack (Pack of 24)", "cat_s5", "Science & Lab Equipment", "general", "Chemistry Lab - Cupboard 2", 25, 19, 0, 5, 10),
    ("Brass Bunsen Burner with Needle Valve", "cat_s5", "Science & Lab Equipment", "general", "Chemistry Lab - Bench", 20, 16, 0, 4, 8),
    ("Alnico Bar Magnets (Pair with Keepers)", "cat_s5", "Science & Lab Equipment", "general", "Physics Lab - Box 1", 25, 20, 0, 5, 10),
    ("Equilateral Triangular Glass Prism (60°)", "cat_s5", "Science & Lab Equipment", "general", "Physics Lab - Optics", 30, 25, 0, 6, 12),
    ("Double Convex & Concave Lenses Set", "cat_s5", "Science & Lab Equipment", "general", "Physics Lab - Optics", 25, 21, 0, 5, 10),
    ("Digital Precision Electronic Balance (0.01g)", "cat_s5", "Science & Lab Equipment", "general", "Physics Lab - Bench", 6, 5, 0, 2, 3),
    ("Acoustic Tuning Fork Resonance Set", "cat_s5", "Science & Lab Equipment", "general", "Physics Lab - Box 3", 14, 12, 0, 3, 5),
    ("Human Anatomy Organ Demonstration Model", "cat_s5", "Science & Lab Equipment", "general", "Biology Lab - Display", 4, 4, 0, 1, 2),

    # Classroom Electronics & IT (8 items)
    ("Epson HDMI Projector Replacement Lamp", "cat_s6", "Classroom Electronics & IT", "general", "Server Room - Shelf 2", 8, 6, 0, 2, 4),
    ("Logitech Wireless Presentation Clicker Remote", "cat_s6", "Classroom Electronics & IT", "general", "Admin Tech Locker", 18, 14, 0, 4, 8),
    ("HDMI High Speed Cable (10 Meters)", "cat_s6", "Classroom Electronics & IT", "general", "Server Room - Shelf 1", 25, 18, 0, 5, 10),
    ("Extension Power Strip 6-Socket Surge Guard", "cat_s6", "Classroom Electronics & IT", "general", "Server Room - Shelf 1", 30, 22, 0, 5, 10),
    ("USB Desktop Microphone for Digital Classrooms", "cat_s6", "Classroom Electronics & IT", "general", "Admin Tech Locker", 12, 9, 0, 3, 5),
    ("Wireless Keyboard & Mouse Combo (Dell)", "cat_s6", "Classroom Electronics & IT", "general", "Computer Lab 1", 20, 15, 0, 5, 10),
    ("Overhead Ceiling Speaker Unit (PA System)", "cat_s6", "Classroom Electronics & IT", "general", "Store Room B", 10, 8, 0, 2, 4),
    ("Ethernet Cat6 Patch Cable (5 Meters)", "cat_s6", "Classroom Electronics & IT", "general", "Server Room - Box 2", 40, 30, 0, 10, 15),
]

def generate_transactions(items_data):
    """
    Generate 130+ realistic stock transactions spanning May 2026 to October 2026.
    Reflects the academic calendar:
    - May 2026: Heavy Vendor Receipts (PO deliveries for upcoming year)
    - June 2026: Massive Issuance to Students (reopening distribution)
    - July 2026: Secondary distribution & replenishment receipts
    - August 2026: Sports meet equipment receipts and usage
    - September 2026: Mid-term exam stationery distributions & adjustments
    - October 2026: Recent receipts, returns, and routine issuances
    """
    txs = []
    tx_counter = 100

    users = ["Priya Sharma", "Rajesh Kumar", "Anita Verma"]
    classes = [
        "Grade 5 - A", "Grade 5 - B", "Grade 6 - A", "Grade 6 - B",
        "Grade 7 - A", "Grade 7 - B", "Grade 8 - A", "Grade 8 - B",
        "Grade 9 - A", "Grade 9 - B", "Grade 10 - A"
    ]

    # Month by month transaction patterns (Year 2026)
    month_configs = [
        # (Month, Num Receipts, Num Issues, Num Returns/Adjustments)
        (5, 22, 5, 2),   # May: Heavy Inflow (+stock)
        (6, 6, 32, 3),   # June: Massive Outflow (School start distribution)
        (7, 14, 18, 4),  # July: Balanced restock and ongoing distributions
        (8, 16, 16, 3),  # August: Sports + Academic distributions
        (9, 8, 22, 5),   # September: Exam stationery & uniform replacements
        (10, 12, 10, 2), # October: Recent activity
    ]

    for month, n_rcv, n_iss, n_adj in month_configs:
        # Generate Receipts (Stock In)
        for _ in range(n_rcv):
            item = random.choice(items_data)
            day = random.randint(1, 28)
            hour = random.randint(8, 16)
            minute = random.randint(10, 55)
            dt_str = f"2026-{month:02d}-{day:02d} {hour:02d}:{minute:02d}"
            qty = random.choice([20, 30, 40, 50, 60, 80, 100])
            txs.append({
                "id": f"tx_seed_{tx_counter}",
                "org_id": ORG_ID,
                "date": dt_str,
                "item_id": item["id"],
                "item_name": item["name"],
                "type": "received",
                "quantity": qty,
                "user": "Anita Verma",
                "reference": f"PO-2026-{month:02d}{random.randint(10,99)}",
                "recipient": None,
                "recipient_class": None,
                "notes": "Vendor shipment received and verified",
            })
            tx_counter += 1

        # Generate Issuances (Stock Out)
        for _ in range(n_iss):
            item = random.choice(items_data)
            day = random.randint(1, 28)
            hour = random.randint(9, 16)
            minute = random.randint(5, 55)
            dt_str = f"2026-{month:02d}-{day:02d} {hour:02d}:{minute:02d}"
            qty = -random.randint(5, 25)
            cls_name = random.choice(classes)
            txs.append({
                "id": f"tx_seed_{tx_counter}",
                "org_id": ORG_ID,
                "date": dt_str,
                "item_id": item["id"],
                "item_name": item["name"],
                "type": "issued",
                "quantity": qty,
                "user": "Rajesh Kumar",
                "reference": f"ISS-2026-{month:02d}{random.randint(100,999)}",
                "recipient": f"Students of {cls_name}",
                "recipient_class": cls_name,
                "notes": f"Standard distribution to {cls_name}",
            })
            tx_counter += 1

        # Generate Returns / Adjustments
        for _ in range(n_adj):
            item = random.choice(items_data)
            day = random.randint(1, 28)
            hour = random.randint(11, 15)
            minute = random.randint(10, 50)
            dt_str = f"2026-{month:02d}-{day:02d} {hour:02d}:{minute:02d}"
            tx_type = random.choice(["returned", "adjusted", "damaged"])
            if tx_type == "returned":
                qty = random.randint(1, 5)
                ref = f"RET-2026-{month:02d}{random.randint(10,99)}"
                note = "Returned in good condition"
            elif tx_type == "damaged":
                qty = -random.randint(1, 3)
                ref = f"DMG-2026-{month:02d}{random.randint(10,99)}"
                note = "Damaged during handling"
            else:
                qty = random.choice([-2, -1, 1, 2])
                ref = f"ADJ-2026-{month:02d}{random.randint(10,99)}"
                note = "Physical count audit adjustment"

            txs.append({
                "id": f"tx_seed_{tx_counter}",
                "org_id": ORG_ID,
                "date": dt_str,
                "item_id": item["id"],
                "item_name": item["name"],
                "type": tx_type,
                "quantity": qty,
                "user": "Priya Sharma",
                "reference": ref,
                "recipient": None,
                "recipient_class": None,
                "notes": note,
            })
            tx_counter += 1

    # Sort transactions chronologically
    txs.sort(key=lambda t: t["date"])
    return txs

def main():
    print(f"Connecting to database at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # 1. Ensure categories exist
    for cat_id, cat_name, cat_color in CATEGORIES:
        c.execute("""
            INSERT OR IGNORE INTO categories (id, organization_id, name, color)
            VALUES (?, ?, ?, ?)
        """, (cat_id, ORG_ID, cat_name, cat_color))

    # 2. Check existing items count
    c.execute("SELECT COUNT(*) FROM items WHERE organization_id=?", (ORG_ID,))
    existing_count = c.fetchone()[0]
    print(f"Current items count for {ORG_ID}: {existing_count}")

    # Build 100 items list
    items_to_insert = []
    today_str = datetime.now().strftime("%Y-%m-%d")

    for i, (name, cat_id, cat_name, module, loc, qty, avail, rsv, min_q, reorder_q) in enumerate(ITEM_DEFINITIONS, 1):
        item_id = f"item_seed_{i:03d}"
        sku = f"ABCI-2026-{i+5:03d}"
        # Compute status
        if avail == 0:
            status = "out_of_stock"
        elif avail <= min_q:
            status = "low_stock"
        else:
            status = "in_stock"

        items_to_insert.append({
            "id": item_id,
            "org_id": ORG_ID,
            "name": name,
            "sku": sku,
            "cat_id": cat_id,
            "cat_name": cat_name,
            "module": module,
            "qty": qty,
            "avail": avail,
            "reserved": rsv,
            "loc": loc,
            "status": status,
            "last_updated": today_str,
            "min_q": min_q,
            "reorder_q": reorder_q,
        })

    # Insert or update 100 items
    print(f"Inserting {len(items_to_insert)} structured items into items table...")
    for it in items_to_insert:
        c.execute("""
            INSERT OR REPLACE INTO items (
                id, organization_id, name, sku, category_id, category_name,
                module, quantity, available, reserved, location, status,
                last_updated, min_quantity, reorder_qty
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            it["id"], it["org_id"], it["name"], it["sku"], it["cat_id"], it["cat_name"],
            it["module"], it["qty"], it["avail"], it["reserved"], it["loc"], it["status"],
            it["last_updated"], it["min_q"], it["reorder_q"]
        ))

    # 3. Generate 130+ time-distributed transactions
    transactions = generate_transactions(items_to_insert)
    print(f"Inserting {len(transactions)} time-distributed stock transactions (May 2026 - Oct 2026)...")

    for tx in transactions:
        c.execute("""
            INSERT OR REPLACE INTO stock_transactions (
                id, organization_id, date, item_id, item_name,
                type, quantity, user, reference, recipient, recipient_class, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            tx["id"], tx["org_id"], tx["date"], tx["item_id"], tx["item_name"],
            tx["type"], tx["quantity"], tx["user"], tx["reference"],
            tx["recipient"], tx["recipient_class"], tx["notes"]
        ))

    conn.commit()

    # Verify counts
    c.execute("SELECT COUNT(*) FROM items WHERE organization_id=?", (ORG_ID,))
    final_items = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM stock_transactions WHERE organization_id=?", (ORG_ID,))
    final_txs = c.fetchone()[0]

    print(f"Success! {ORG_ID} now has:")
    print(f"  - {final_items} Total Items in Inventory")
    print(f"  - {final_txs} Stock Transactions spanning May 2026 - Oct 2026")
    conn.close()

if __name__ == "__main__":
    main()
