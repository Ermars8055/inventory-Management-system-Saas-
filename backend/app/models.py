from sqlalchemy import Column, String, Integer, Boolean, JSON, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from .database import Base


class Organization(Base):
    __tablename__ = "organizations"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    industry = Column(String, nullable=False)
    enabled_modules = Column(JSON, default=list)
    address = Column(String)
    phone = Column(String)
    email = Column(String)
    logo_text = Column(String)
    plan = Column(String, default="starter")
    created_at = Column(String)
    # Drives all labels and feature toggles across the app
    config = Column(JSON, default=dict)


class Category(Base):
    __tablename__ = "categories"
    id = Column(String, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String)


class Item(Base):
    __tablename__ = "items"
    id = Column(String, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    sku = Column(String, nullable=False)
    category_id = Column(String, ForeignKey("categories.id"))
    category_name = Column(String)
    module = Column(String)
    quantity = Column(Integer, default=0)
    available = Column(Integer, default=0)
    reserved = Column(Integer, default=0)
    location = Column(String)
    status = Column(String, default="in_stock")
    last_updated = Column(String)
    min_quantity = Column(Integer, default=10)
    reorder_qty = Column(Integer, default=50)
    uniform = Column(JSON)
    book = Column(JSON)
    medicine = Column(JSON)
    attributes = Column(JSON)


class StockTransaction(Base):
    __tablename__ = "stock_transactions"
    id = Column(String, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    date = Column(String, nullable=False)
    item_id = Column(String, ForeignKey("items.id"))
    item_name = Column(String)
    type = Column(String)
    quantity = Column(Integer)
    user = Column(String)
    reference = Column(String)
    recipient = Column(String)
    recipient_class = Column(String)
    notes = Column(String)


class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(String, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    contact_person = Column(String)
    phone = Column(String)
    email = Column(String)
    address = Column(String)
    items_supplied = Column(String)
    status = Column(String, default="active")
    purchase_history = Column(JSON, default=list)
    outstanding_orders = Column(JSON, default=list)
    attributes = Column(JSON)


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    password_hash = Column(String)
    role = Column(String)   # org_admin | manager | staff | viewer
    status = Column(String, default="active")
    last_active = Column(String)


class Role(Base):
    __tablename__ = "roles"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    permissions = Column(JSON, default=list)


class Recipient(Base):
    """
    Generic entity that receives/borrows items.
    Org config controls what this is called: Student / Patient / Employee / Member / Customer.
    identifier = Roll Number / Patient ID / Employee ID
    group      = Class / Ward / Department / Branch
    """
    __tablename__ = "recipients"
    id = Column(String, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    identifier = Column(String)
    group = Column(String)
    contact = Column(String)
    extra_data = Column(JSON)        # Org-defined custom fields as key-value


class Assignment(Base):
    """
    Generic issue/return record.
    Replaces IssuedItem — works for schools, clinics, warehouses, libraries, etc.
    Status flow: issued → returned | returned_damaged | lost | fine_pending → fine_paid
    """
    __tablename__ = "assignments"
    id = Column(String, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)

    # Recipient (denormalised for display performance)
    recipient_id = Column(String, ForeignKey("recipients.id"))
    recipient_name = Column(String)
    recipient_identifier = Column(String)
    recipient_group = Column(String)

    # Item
    item_id = Column(String, ForeignKey("items.id"))
    item_name = Column(String)
    item_details = Column(String)      # e.g. "Size 32" / "Batch B-22"
    quantity = Column(Integer, default=1)

    # Condition tracking
    condition_issued = Column(String)      # New / Good / Fair / Poor
    condition_returned = Column(String)    # Good / Damaged / Heavily Damaged

    # Dates
    issue_date = Column(String)
    expected_return = Column(String)
    return_date = Column(String)

    # Status
    # issued | returned | returned_damaged | lost | fine_pending | fine_paid | closed
    status = Column(String, default="issued")

    # Damage & fine tracking
    damage_notes = Column(String)
    fine_amount = Column(Integer, default=0)
    fine_paid = Column(Boolean, default=False)

    # Audit
    issued_by = Column(String)
    received_by = Column(String)
    notes = Column(String)


class Batch(Base):
    __tablename__ = "batches"
    id = Column(String, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    medicine_name = Column(String)
    batch_number = Column(String)
    manufacturing_date = Column(String)
    expiry_date = Column(String)
    quantity = Column(Integer, default=0)
    status = Column(String, default="active")


class ReceiptTemplate(Base):
    __tablename__ = "receipt_templates"
    id = Column(String, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    name = Column(String)
    type = Column(String)
    org_name = Column(String)
    org_address = Column(String)
    title = Column(String)
    fields = Column(JSON, default=list)
    show_logo = Column(Boolean, default=True)
    show_signature = Column(Boolean, default=True)
    footer = Column(Text, default="")
    notes = Column(Text, default="")


class CustomField(Base):
    __tablename__ = "custom_fields"
    id = Column(String, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    name = Column(String)
    type = Column(String)
    options = Column(JSON)
    entity = Column(String)
    required = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    placeholder = Column(String)


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(String, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    po_number = Column(String, nullable=False)
    supplier = Column(String, nullable=False)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=True)
    items_desc = Column(String)
    item_count = Column(Integer, default=0)
    ordered_date = Column(String)
    expected_date = Column(String)
    amount = Column(Integer, default=0)
    status = Column(String, default="draft")   # draft|pending|approved|ordered|partially_received|received|cancelled
    raised_by = Column(String)
    notes = Column(String)
    created_at = Column(String)
    quotation_id = Column(String, ForeignKey("quotations.id"), nullable=True)
    line_items = relationship("POLineItem", back_populates="purchase_order", cascade="all, delete-orphan", lazy="selectin")


class POLineItem(Base):
    __tablename__ = "po_line_items"
    id = Column(String, primary_key=True)
    po_id = Column(String, ForeignKey("purchase_orders.id"), nullable=False)
    item_id = Column(String, ForeignKey("items.id"), nullable=True)
    item_name = Column(String, nullable=False)
    quantity_ordered = Column(Integer, default=0)
    quantity_received = Column(Integer, default=0)
    unit_price = Column(Integer, default=0)
    purchase_order = relationship("PurchaseOrder", back_populates="line_items")


class MaintenanceTicket(Base):
    __tablename__ = "maintenance_tickets"
    id = Column(String, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    ticket_id = Column(String, nullable=False)
    asset = Column(String, nullable=False)
    issue = Column(Text)
    reported_by = Column(String)
    assigned_to = Column(String)
    priority = Column(String, default="medium")   # low|medium|high|critical
    status = Column(String, default="open")        # open|in_progress|resolved|closed
    reported_date = Column(String)
    resolved_date = Column(String)
    notes = Column(String)
    created_at = Column(String)


class Asset(Base):
    __tablename__ = "assets"
    id = Column(String, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    asset_code = Column(String)
    asset_type = Column(String)
    assigned_to = Column(String)
    department = Column(String)
    location = Column(String)
    condition = Column(String, default="Good")      # Good|Fair|Poor
    status = Column(String, default="available")    # in_use|available|maintenance|retired
    purchase_date = Column(String)
    value = Column(Integer, default=0)
    notes = Column(String)
    created_at = Column(String)


# ---------------------------------------------------------------------------
# Class Material Templates — define which items belong to each class/group
# ---------------------------------------------------------------------------

class ClassTemplate(Base):
    """
    A named material kit for one class/group + academic year.
    e.g.  name="Grade 5A Kit", group="Grade 5A", academic_year="2025-26"
    """
    __tablename__ = "class_templates"
    id = Column(String, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    group = Column(String, nullable=False)          # Class / Ward / Department
    academic_year = Column(String)
    notes = Column(Text)
    created_at = Column(String)
    items = relationship(
        "ClassTemplateItem",
        back_populates="template",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class ClassTemplateItem(Base):
    """One line item inside a ClassTemplate."""
    __tablename__ = "class_template_items"
    id = Column(String, primary_key=True)
    template_id = Column(String, ForeignKey("class_templates.id"), nullable=False)
    item_id = Column(String, ForeignKey("items.id"), nullable=True)   # nullable for free-text
    item_name = Column(String, nullable=False)
    quantity = Column(Integer, default=1)
    condition_issued = Column(String, default="New")
    notes = Column(String)
    template = relationship("ClassTemplate", back_populates="items")


# ---------------------------------------------------------------------------
# Vendor Quotation System (Option B — prices collected per quotation)
# ---------------------------------------------------------------------------

class Quotation(Base):
    """
    A reorder session. Admin picks items needed, invites vendors via email,
    manually enters vendor-quoted prices, compares, and generates POs.
    status: draft → sent → comparing → converted | cancelled
    """
    __tablename__ = "quotations"
    id = Column(String, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    title = Column(String, nullable=False)
    status = Column(String, default="draft")
    notes = Column(Text)
    created_at = Column(String)
    items = relationship(
        "QuotationItem", back_populates="quotation",
        cascade="all, delete-orphan", lazy="selectin",
    )
    vendor_quotes = relationship(
        "VendorQuote", back_populates="quotation",
        cascade="all, delete-orphan", lazy="selectin",
    )


class QuotationItem(Base):
    """One line item (what to buy) inside a Quotation."""
    __tablename__ = "quotation_items"
    id = Column(String, primary_key=True)
    quotation_id = Column(String, ForeignKey("quotations.id"), nullable=False)
    item_id = Column(String, ForeignKey("items.id"), nullable=True)
    item_name = Column(String, nullable=False)
    qty_needed = Column(Integer, default=1)
    quotation = relationship("Quotation", back_populates="items")


class VendorQuote(Base):
    """One vendor's participation in a Quotation (their invite + price submission)."""
    __tablename__ = "vendor_quotes"
    id = Column(String, primary_key=True)
    quotation_id = Column(String, ForeignKey("quotations.id"), nullable=False)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=True)
    supplier_name = Column(String, nullable=False)
    supplier_email = Column(String)
    status = Column(String, default="invited")  # invited|quoted|rejected
    quoted_at = Column(String)
    notes = Column(String)
    quotation = relationship("Quotation", back_populates="vendor_quotes")
    quote_items = relationship(
        "VendorQuoteItem", back_populates="vendor_quote",
        cascade="all, delete-orphan", lazy="selectin",
    )


class VendorQuoteItem(Base):
    """Price submitted by one vendor for one quotation line item."""
    __tablename__ = "vendor_quote_items"
    id = Column(String, primary_key=True)
    vendor_quote_id = Column(String, ForeignKey("vendor_quotes.id"), nullable=False)
    quotation_item_id = Column(String, ForeignKey("quotation_items.id"), nullable=False)
    unit_price = Column(Float, nullable=True)   # None = vendor did not quote this item
    lead_time_days = Column(Integer, nullable=True)
    notes = Column(String)
    vendor_quote = relationship("VendorQuote", back_populates="quote_items")
