import os
from sqlalchemy import create_engine
import json

db_url = os.getenv("DATABASE_URL", "sqlite:////data/stockpilot.db")
engine = create_engine(db_url)

with engine.connect() as conn:
    # Get all suppliers
    suppliers = conn.execute(__import__('sqlalchemy').text("SELECT id, purchase_history, outstanding_orders FROM suppliers")).fetchall()
    
    for s in suppliers:
        ph = s[1] if s[1] is not None else '[]'
        oo = s[2] if s[2] is not None else '[]'
        
        conn.execute(__import__('sqlalchemy').text("""
            UPDATE vendors 
            SET purchase_history = :ph, outstanding_orders = :oo 
            WHERE id = :id
        """), {"ph": ph, "oo": oo, "id": s[0]})
    conn.commit()
    
    # Also ensure any vendors not from suppliers have at least [] instead of NULL
    conn.execute(__import__('sqlalchemy').text("""
        UPDATE vendors 
        SET purchase_history = '[]'
        WHERE purchase_history IS NULL
    """))
    conn.execute(__import__('sqlalchemy').text("""
        UPDATE vendors 
        SET outstanding_orders = '[]'
        WHERE outstanding_orders IS NULL
    """))
    conn.commit()

print("Vendors fixed.")
