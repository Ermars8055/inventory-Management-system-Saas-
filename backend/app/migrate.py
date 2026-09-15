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
        # Purchase orders: link to supplier
        "ALTER TABLE purchase_orders ADD COLUMN supplier_id VARCHAR REFERENCES suppliers(id)",
    ]

    with engine.connect() as conn:
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
