"""
Safe column/table migrations for SQLite.
Adds new columns to existing tables without losing data.
Run before seed.py on every startup.
"""

from .database import engine


def run():
    migrations = [
        # Items: low-stock threshold + reorder quantity
        "ALTER TABLE items ADD COLUMN min_quantity INTEGER DEFAULT 10",
        "ALTER TABLE items ADD COLUMN reorder_qty INTEGER DEFAULT 50",
        # Purchase orders: link to supplier + quotation
        "ALTER TABLE purchase_orders ADD COLUMN supplier_id VARCHAR REFERENCES suppliers(id)",
        "ALTER TABLE purchase_orders ADD COLUMN quotation_id VARCHAR REFERENCES quotations(id)",
        # Organizations: subdomain + logo_url
        "ALTER TABLE organizations ADD COLUMN subdomain VARCHAR",
        "ALTER TABLE organizations ADD COLUMN logo_url VARCHAR",
        # Custom fields: required, sort_order, placeholder
        "ALTER TABLE custom_fields ADD COLUMN required BOOLEAN DEFAULT 0",
        "ALTER TABLE custom_fields ADD COLUMN sort_order INTEGER DEFAULT 0",
        "ALTER TABLE custom_fields ADD COLUMN placeholder VARCHAR",
        # Assignments: distribution mode + fee tracking
        "ALTER TABLE assignments ADD COLUMN mode VARCHAR DEFAULT 'distribution'",
        "ALTER TABLE assignments ADD COLUMN unit_price INTEGER DEFAULT 0",
        "ALTER TABLE assignments ADD COLUMN fee_amount INTEGER DEFAULT 0",
        "ALTER TABLE assignments ADD COLUMN fee_status VARCHAR DEFAULT 'unpaid'",
        # Custom fields: module tag
        "ALTER TABLE custom_fields ADD COLUMN module VARCHAR",
        # Suppliers: attributes JSON for custom field values
        "ALTER TABLE suppliers ADD COLUMN attributes JSON",
        # Purchase orders: link to vendor
        "ALTER TABLE purchase_orders ADD COLUMN vendor_id VARCHAR REFERENCES vendors(id)",
        
        # Vendor Migration: Rename columns in vendor_quotes
        "ALTER TABLE vendor_quotes RENAME COLUMN supplier_id TO vendor_id",
        "ALTER TABLE vendor_quotes RENAME COLUMN supplier_name TO vendor_name",
        "ALTER TABLE vendor_quotes RENAME COLUMN supplier_email TO vendor_email",
        
        # Vendor Migration: Rename columns in purchase_orders
        "ALTER TABLE purchase_orders RENAME COLUMN supplier TO vendor_name",
    ]

    with engine.connect() as conn:
        # Create vendors table if it doesn't exist
        conn.execute(__import__('sqlalchemy').text("""
            CREATE TABLE IF NOT EXISTS vendors (
                id VARCHAR PRIMARY KEY,
                organization_id VARCHAR NOT NULL REFERENCES organizations(id),
                name VARCHAR NOT NULL,
                contact_person VARCHAR,
                phone VARCHAR,
                email VARCHAR,
                address VARCHAR,
                vendor_type VARCHAR,
                status VARCHAR DEFAULT 'active',
                purchase_history JSON,
                outstanding_orders JSON,
                attributes JSON
            )
        """))
        conn.commit()

        # Migrate old suppliers to vendors (skip if suppliers table doesn't exist)
        try:
            conn.execute(__import__('sqlalchemy').text("""
                INSERT INTO vendors (id, organization_id, name, contact_person, phone, email, address, vendor_type, status, purchase_history, outstanding_orders, attributes)
                SELECT id, organization_id, name, contact_person, phone, email, address, items_supplied, status,
                       COALESCE(purchase_history, '[]'), COALESCE(outstanding_orders, '[]'), attributes
                FROM suppliers
                WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE vendors.id = suppliers.id)
            """))
            conn.commit()
        except Exception:
            pass  # Fresh DB — no suppliers table to migrate from

        # Create po_line_items table if it doesn't exist
        conn.execute(__import__('sqlalchemy').text("""
            CREATE TABLE IF NOT EXISTS po_line_items (
                id VARCHAR PRIMARY KEY,
                po_id VARCHAR NOT NULL REFERENCES purchase_orders(id),
                item_id VARCHAR REFERENCES items(id),
                item_name VARCHAR NOT NULL,
                quantity_ordered INTEGER DEFAULT 0,
                quantity_received INTEGER DEFAULT 0,
                unit_price INTEGER DEFAULT 0
            )
        """))
        conn.commit()

        # Class material templates
        conn.execute(__import__('sqlalchemy').text("""
            CREATE TABLE IF NOT EXISTS class_templates (
                id VARCHAR PRIMARY KEY,
                organization_id VARCHAR NOT NULL REFERENCES organizations(id),
                name VARCHAR NOT NULL,
                "group" VARCHAR NOT NULL,
                academic_year VARCHAR,
                notes TEXT,
                created_at VARCHAR
            )
        """))
        conn.commit()

        conn.execute(__import__('sqlalchemy').text("""
            CREATE TABLE IF NOT EXISTS class_template_items (
                id VARCHAR PRIMARY KEY,
                template_id VARCHAR NOT NULL REFERENCES class_templates(id),
                item_id VARCHAR REFERENCES items(id),
                item_name VARCHAR NOT NULL,
                quantity INTEGER DEFAULT 1,
                condition_issued VARCHAR DEFAULT 'New',
                notes VARCHAR
            )
        """))
        conn.commit()

        # Quotation tables (must exist before ALTER TABLE references them)
        conn.execute(__import__('sqlalchemy').text("""
            CREATE TABLE IF NOT EXISTS quotations (
                id VARCHAR PRIMARY KEY,
                organization_id VARCHAR NOT NULL REFERENCES organizations(id),
                title VARCHAR NOT NULL,
                status VARCHAR DEFAULT 'draft',
                notes TEXT,
                created_at VARCHAR
            )
        """))
        conn.commit()

        conn.execute(__import__('sqlalchemy').text("""
            CREATE TABLE IF NOT EXISTS quotation_items (
                id VARCHAR PRIMARY KEY,
                quotation_id VARCHAR NOT NULL REFERENCES quotations(id),
                item_id VARCHAR REFERENCES items(id),
                item_name VARCHAR NOT NULL,
                qty_needed INTEGER DEFAULT 1
            )
        """))
        conn.commit()

        conn.execute(__import__('sqlalchemy').text("""
            CREATE TABLE IF NOT EXISTS vendor_quotes (
                id VARCHAR PRIMARY KEY,
                quotation_id VARCHAR NOT NULL REFERENCES quotations(id),
                supplier_id VARCHAR REFERENCES suppliers(id),
                supplier_name VARCHAR NOT NULL,
                supplier_email VARCHAR,
                status VARCHAR DEFAULT 'invited',
                quoted_at VARCHAR,
                notes VARCHAR
            )
        """))
        conn.commit()

        conn.execute(__import__('sqlalchemy').text("""
            CREATE TABLE IF NOT EXISTS vendor_quote_items (
                id VARCHAR PRIMARY KEY,
                vendor_quote_id VARCHAR NOT NULL REFERENCES vendor_quotes(id),
                quotation_item_id VARCHAR NOT NULL REFERENCES quotation_items(id),
                unit_price FLOAT,
                lead_time_days INTEGER,
                notes VARCHAR
            )
        """))
        conn.commit()

        for sql in migrations:
            try:
                conn.execute(__import__('sqlalchemy').text(sql))
                conn.commit()
            except Exception as e:
                # Column already exists — safe to ignore
                if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                    pass
                else:
                    print(f"Migration warning: {e}")


if __name__ == "__main__":
    run()
    print("Migrations complete.")
