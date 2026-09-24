"""
Clear all operational/inventory data across all tenants.
Keeps: organizations, users, roles, password_reset_tokens.
Run with: python clear_tenant_data.py
"""
import sqlite3
import os
import sys

DB_PATH = os.environ.get("DB_PATH", "/data/stockpilot.db")

if not os.path.exists(DB_PATH):
    print(f"DB not found at {DB_PATH}")
    sys.exit(1)

# Tables to wipe, in FK-safe order (children first)
TABLES = [
    "vendor_quote_items",
    "vendor_quotes",
    "quotation_items",
    "quotations",
    "class_template_items",
    "class_templates",
    "fee_records",
    "assignments",
    "po_line_items",
    "purchase_orders",
    "org_class_items",
    "org_classes",
    "recipients",
    "maintenance_tickets",
    "assets",
    "batches",
    "stock_transactions",
    "items",
    "categories",
    "vendors",
    "receipt_templates",
    "custom_fields",
    "file_attachments",
    "api_keys",
    "webhooks",
    "org_audit_log",
    "notifications",
]

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()
cur.execute("PRAGMA foreign_keys = OFF")

for table in TABLES:
    cur.execute(f"DELETE FROM {table}")
    print(f"  cleared {table} ({cur.rowcount} rows)")

conn.commit()
conn.close()
print("\nDone. Organizations, users, and roles are untouched.")
