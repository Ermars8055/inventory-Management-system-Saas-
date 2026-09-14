from sqlalchemy import Column, String, Integer, Boolean, JSON, ForeignKey, Text
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


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(String, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    po_number = Column(String, nullable=False)
    supplier = Column(String, nullable=False)
    items_desc = Column(String)
    item_count = Column(Integer, default=0)
    ordered_date = Column(String)
    expected_date = Column(String)
    amount = Column(Integer, default=0)
    status = Column(String, default="draft")   # draft|pending|approved|ordered|received|cancelled
    raised_by = Column(String)
    notes = Column(String)
    created_at = Column(String)


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
