from __future__ import annotations
import re
import html
from typing import Any, Optional, Literal
from pydantic import BaseModel, ConfigDict, model_validator, field_validator, Field
from pydantic.alias_generators import to_camel


def _camel(s: str) -> str:
    return to_camel(s)


def _sanitize(v: str) -> str:
    """Strip HTML tags and escape special chars."""
    v = re.sub(r'<[^>]+>', '', v)
    return html.escape(v).strip()


_EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', re.IGNORECASE)
_ACAD_YEAR_RE = re.compile(r'^\d{4}-\d{2}$')


def _clean_phone(v: str | None) -> str | None:
    """Validate and normalise Indian mobile numbers to 10 digits."""
    if v is None or v == '':
        return v
    digits = re.sub(r'[\s\-\(\)\+\.]', '', v)
    # Strip leading +91 / 91 country code
    if digits.startswith('91') and len(digits) == 12:
        digits = digits[2:]
    if not digits.isdigit():
        raise ValueError('Phone number must contain only digits')
    if len(digits) != 10:
        raise ValueError(f'Phone number must be exactly 10 digits (got {len(digits)})')
    return digits


def _clean_contact(v: str | None) -> str | None:
    """Accept a phone number OR email address for the contact field."""
    if v is None or v == '':
        return v
    v = v.strip()
    if '@' in v:
        return _clean_email(v)
    return _clean_phone(v)


def _clean_email(v: str | None) -> str | None:
    """Validate email format."""
    if v is None or v == '':
        return v
    v = v.strip()
    if not _EMAIL_RE.match(v):
        raise ValueError('Invalid email address')
    return v.lower()


def _clean_acad_year(v: str | None) -> str | None:
    """Validate academic year format YYYY-YY (e.g. 2025-26)."""
    if v is None or v == '':
        return v
    if not _ACAD_YEAR_RE.match(v):
        raise ValueError('Academic year must be in YYYY-YY format (e.g. 2025-26)')
    return v


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    @model_validator(mode='before')
    @classmethod
    def sanitize_strings(cls, values):
        if isinstance(values, dict):
            for k, v in values.items():
                if isinstance(v, str) and k not in ('password', 'password_hash', 'token', 'key_hash'):
                    values[k] = _sanitize(v)
        return values


# ---------------------------------------------------------------------------
# Org Config — stored as JSON in Organization.config
# ---------------------------------------------------------------------------

class OrgConfig(CamelModel):
    recipient_label: str = "Recipient"
    recipient_plural_label: str = "Recipients"
    identifier_label: str = "ID"
    group_label: str = "Group"
    assignment_label: str = "Assignment"
    assignment_mode: str = "distribution"   # "distribution" (schools) | "lending" (libraries)
    item_unit: str = "units"
    currency_code: str = "INR"
    currency_symbol: str = "₹"
    timezone: str = "Asia/Kolkata"
    language: str = "en"
    enable_fines: bool = False
    enable_condition_tracking: bool = True
    fine_label: str = "Fine"


# ---------------------------------------------------------------------------
# Organization
# ---------------------------------------------------------------------------

class OrganizationOut(CamelModel):
    id: str
    name: str
    industry: str
    enabled_modules: list[str] = []
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    logo_text: Optional[str] = None
    logo_url: Optional[str] = None
    plan: str = "starter"
    subdomain: Optional[str] = None
    created_at: Optional[str] = None
    config: Optional[dict[str, Any]] = None


class OrganizationCreate(CamelModel):
    name: str
    industry: str
    enabled_modules: list[str] = []
    subdomain: Optional[str] = None


class OrganizationUpdate(CamelModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone(cls, v):
        return _clean_phone(v)

    @field_validator('email', mode='before')
    @classmethod
    def validate_email(cls, v):
        return _clean_email(v)


class ModulesUpdate(CamelModel):
    enabled_modules: list[str]


class ConfigUpdate(CamelModel):
    config: dict[str, Any]


# ---------------------------------------------------------------------------
# Category
# ---------------------------------------------------------------------------

class CategoryOut(CamelModel):
    id: str
    organization_id: str
    name: str
    color: Optional[str] = None


class CategoryCreate(CamelModel):
    name: str
    color: Optional[str] = None


# ---------------------------------------------------------------------------
# Item
# ---------------------------------------------------------------------------

class ItemOut(CamelModel):
    id: str
    organization_id: str
    name: str
    sku: str
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    module: Optional[str] = None
    quantity: int = 0
    available: int = 0
    reserved: int = 0
    min_quantity: int = 10
    reorder_qty: int = 50
    location: Optional[str] = None
    status: str = "in_stock"
    last_updated: Optional[str] = None
    uniform: Optional[dict[str, Any]] = None
    book: Optional[dict[str, Any]] = None
    medicine: Optional[dict[str, Any]] = None
    attributes: Optional[dict[str, Any]] = None
    variant_group_id: Optional[str] = None
    variant_label: Optional[str] = None


class ItemCreate(CamelModel):
    organization_id: str
    name: str
    sku: str
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    module: Optional[str] = "general"
    quantity: int = Field(default=0, ge=0)
    available: Optional[int] = Field(default=None, ge=0)
    reserved: int = Field(default=0, ge=0)
    min_quantity: Optional[int] = Field(default=None, ge=0)
    reorder_qty: Optional[int] = Field(default=None, ge=0)
    location: Optional[str] = None
    uniform: Optional[dict[str, Any]] = None
    book: Optional[dict[str, Any]] = None
    medicine: Optional[dict[str, Any]] = None
    attributes: Optional[dict[str, Any]] = None
    # Variant fields — both optional; provide one to attach to / create a group
    variant_group_id: Optional[str] = None    # attach to existing group
    variant_group_name: Optional[str] = None  # create new group with this name
    variant_label: Optional[str] = None       # e.g. "Size 32"


class ItemUpdate(CamelModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    module: Optional[str] = None
    quantity: Optional[int] = Field(default=None, ge=0)
    available: Optional[int] = Field(default=None, ge=0)
    reserved: Optional[int] = Field(default=None, ge=0)
    min_quantity: Optional[int] = Field(default=None, ge=0)
    reorder_qty: Optional[int] = Field(default=None, ge=0)
    location: Optional[str] = None
    uniform: Optional[dict[str, Any]] = None
    book: Optional[dict[str, Any]] = None
    medicine: Optional[dict[str, Any]] = None
    attributes: Optional[dict[str, Any]] = None
    variant_group_id: Optional[str] = None
    variant_label: Optional[str] = None


# ---------------------------------------------------------------------------
# Item Variant Groups
# ---------------------------------------------------------------------------

class ItemVariantGroupOut(CamelModel):
    id: str
    organization_id: str
    name: str
    description: Optional[str] = None
    category_id: Optional[str] = None
    created_at: Optional[str] = None
    # Computed rollup fields (not stored — derived from variants)
    variant_count: int = 0
    total_qty: int = 0
    total_available: int = 0
    status: str = "in_stock"   # worst status across all variants


class ItemVariantGroupCreate(CamelModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[str] = None
    module: str = "general"
    variants: list["VariantItemCreate"] = []


class ItemVariantGroupUpdate(CamelModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None


class VariantItemCreate(CamelModel):
    """One variant item to create under a group."""
    label: str
    sku: str
    quantity: int = Field(default=0, ge=0)
    min_quantity: int = Field(default=10, ge=0)
    reorder_qty: int = Field(default=50, ge=0)
    location: Optional[str] = None


class StockAdjust(CamelModel):
    delta: int


# ---------------------------------------------------------------------------
# Stock Transactions
# ---------------------------------------------------------------------------

class TransactionOut(CamelModel):
    id: str
    organization_id: str
    date: str
    item_id: Optional[str] = None
    item_name: Optional[str] = None
    type: str
    quantity: int
    user: Optional[str] = None
    reference: Optional[str] = None
    recipient: Optional[str] = None
    recipient_class: Optional[str] = None


class TransactionCreate(CamelModel):
    organization_id: str
    date: str
    item_id: str
    item_name: str
    type: str
    quantity: int
    user: str
    reference: str
    recipient: Optional[str] = None
    recipient_class: Optional[str] = None


# ---------------------------------------------------------------------------
# Vendors
# ---------------------------------------------------------------------------

class VendorOut(CamelModel):
    id: str
    organization_id: str
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    vendor_type: Optional[str] = None
    status: str = "active"
    purchase_history: list[dict[str, Any]] = []
    outstanding_orders: list[dict[str, Any]] = []
    attributes: Optional[dict[str, Any]] = None


class VendorCreate(CamelModel):
    organization_id: str
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    vendor_type: Optional[str] = None
    attributes: Optional[dict[str, Any]] = None

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone(cls, v):
        return _clean_phone(v)

    @field_validator('email', mode='before')
    @classmethod
    def validate_email(cls, v):
        return _clean_email(v)


class VendorUpdate(CamelModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    vendor_type: Optional[str] = None
    status: Optional[str] = None
    attributes: Optional[dict[str, Any]] = None

    @field_validator('phone', mode='before')
    @classmethod
    def validate_phone(cls, v):
        return _clean_phone(v)

    @field_validator('email', mode='before')
    @classmethod
    def validate_email(cls, v):
        return _clean_email(v)


# ---------------------------------------------------------------------------
# Users & Roles
# ---------------------------------------------------------------------------

class UserOut(CamelModel):
    id: str
    organization_id: str
    name: str
    email: str
    role: Optional[str] = None
    status: str = "active"
    last_active: Optional[str] = None


class RoleOut(CamelModel):
    id: str
    name: str
    permissions: list[str] = []


class RoleUpdate(CamelModel):
    permissions: list[str]


# ---------------------------------------------------------------------------
# Recipient — generic: Student / Patient / Employee / Member / Customer
# ---------------------------------------------------------------------------

class RecipientOut(CamelModel):
    id: str
    organization_id: str
    name: str
    identifier: Optional[str] = None
    group: Optional[str] = None
    contact: Optional[str] = None
    extra_data: Optional[dict[str, Any]] = None
    class_id: Optional[str] = None


class RecipientCreate(CamelModel):
    organization_id: str
    name: str
    identifier: Optional[str] = None
    group: Optional[str] = None
    contact: Optional[str] = None
    extra_data: Optional[dict[str, Any]] = None
    class_id: Optional[str] = None

    @field_validator('contact', mode='before')
    @classmethod
    def validate_contact(cls, v):
        return _clean_contact(v)


class RecipientUpdate(CamelModel):
    name: Optional[str] = None
    identifier: Optional[str] = None
    group: Optional[str] = None
    contact: Optional[str] = None
    extra_data: Optional[dict[str, Any]] = None
    class_id: Optional[str] = None

    @field_validator('contact', mode='before')
    @classmethod
    def validate_contact(cls, v):
        return _clean_contact(v)


# ---------------------------------------------------------------------------
# Assignment — generic: Issue / Loan / Checkout / Assign
# ---------------------------------------------------------------------------

class AssignmentOut(CamelModel):
    id: str
    organization_id: str
    recipient_id: Optional[str] = None
    recipient_name: Optional[str] = None
    recipient_identifier: Optional[str] = None
    recipient_group: Optional[str] = None
    item_id: Optional[str] = None
    item_name: Optional[str] = None
    item_details: Optional[str] = None
    quantity: int = 1
    condition_issued: Optional[str] = None
    condition_returned: Optional[str] = None
    issue_date: Optional[str] = None
    expected_return: Optional[str] = None
    return_date: Optional[str] = None
    status: str = "issued"
    mode: str = "distribution"
    unit_price: int = 0
    fee_amount: int = 0
    fee_status: str = "unpaid"
    damage_notes: Optional[str] = None
    fine_amount: int = 0
    fine_paid: bool = False
    template_id: Optional[str] = None
    template_name: Optional[str] = None
    issued_by: Optional[str] = None
    received_by: Optional[str] = None
    notes: Optional[str] = None


class AssignmentCreate(CamelModel):
    organization_id: str
    recipient_id: str
    recipient_name: str
    recipient_identifier: Optional[str] = None
    recipient_group: Optional[str] = None
    item_id: str
    item_name: str
    item_details: Optional[str] = None
    quantity: int = 1
    condition_issued: str = "Good"
    issue_date: str
    expected_return: Optional[str] = None
    issued_by: Optional[str] = None
    notes: Optional[str] = None
    mode: str = "distribution"
    unit_price: int = 0


class ReturnBody(CamelModel):
    condition_returned: str = "Good"
    damage_notes: Optional[str] = None
    fine_amount: int = 0
    received_by: Optional[str] = None
    notes: Optional[str] = None


class LostBody(CamelModel):
    fine_amount: int = 0
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Batches
# ---------------------------------------------------------------------------

class BatchOut(CamelModel):
    id: str
    organization_id: str
    medicine_name: Optional[str] = None
    batch_number: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    quantity: int = 0
    status: str = "active"


# ---------------------------------------------------------------------------
# Receipt Templates
# ---------------------------------------------------------------------------

class ReceiptTemplateOut(CamelModel):
    id: str
    organization_id: str
    name: Optional[str] = None
    type: Optional[str] = None
    org_name: Optional[str] = None
    org_address: Optional[str] = None
    title: Optional[str] = None
    fields: list[str] = []
    show_logo: bool = True
    show_signature: bool = True
    footer: str = ""
    notes: str = ""


class ReceiptTemplateUpdate(CamelModel):
    org_name: Optional[str] = None
    org_address: Optional[str] = None
    title: Optional[str] = None
    fields: Optional[list[str]] = None
    show_logo: Optional[bool] = None
    show_signature: Optional[bool] = None
    footer: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Custom Fields
# ---------------------------------------------------------------------------

class CustomFieldOut(CamelModel):
    id: str
    organization_id: str
    name: Optional[str] = None
    type: Optional[str] = None
    options: Optional[list[str]] = None
    entity: Optional[str] = None
    required: bool = False
    sort_order: int = 0
    placeholder: Optional[str] = None
    module: Optional[str] = None


class CustomFieldCreate(CamelModel):
    organization_id: str
    name: str
    type: str
    entity: str
    options: Optional[list[str]] = None
    required: bool = False
    sort_order: int = 0
    placeholder: Optional[str] = None
    module: Optional[str] = None


class CustomFieldUpdate(CamelModel):
    name: Optional[str] = None
    type: Optional[str] = None
    entity: Optional[str] = None
    options: Optional[list[str]] = None
    required: Optional[bool] = None
    sort_order: Optional[int] = None
    placeholder: Optional[str] = None
    module: Optional[str] = None


# ---------------------------------------------------------------------------
# User CRUD
# ---------------------------------------------------------------------------

class UserCreate(CamelModel):
    organization_id: str
    name: str
    email: str
    password: Optional[str] = None
    role: Literal['org_admin', 'manager', 'staff', 'viewer'] = 'staff'

    @field_validator('email', mode='before')
    @classmethod
    def validate_email(cls, v):
        return _clean_email(v)


class UserUpdate(CamelModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[Literal['org_admin', 'manager', 'staff', 'viewer']] = None
    status: Optional[Literal['active', 'inactive']] = None

    @field_validator('email', mode='before')
    @classmethod
    def validate_email(cls, v):
        return _clean_email(v)


# ---------------------------------------------------------------------------
# Procurement
# ---------------------------------------------------------------------------

class POLineItemOut(CamelModel):
    id: str
    po_id: str
    item_id: Optional[str] = None
    item_name: str
    quantity_ordered: int = 0
    quantity_received: int = 0
    unit_price: int = 0


class POLineItemCreate(CamelModel):
    item_id: Optional[str] = None
    item_name: str
    quantity_ordered: int = Field(ge=1)
    unit_price: int = Field(default=0, ge=0)


class ReceiveLineItem(CamelModel):
    line_item_id: str
    quantity_received: int


class ReceivePOBody(CamelModel):
    lines: list[ReceiveLineItem]


class PurchaseOrderOut(CamelModel):
    id: str
    organization_id: str
    po_number: str
    vendor_name: str
    vendor_id: Optional[str] = None
    items_desc: Optional[str] = None
    item_count: int = 0
    ordered_date: Optional[str] = None
    expected_date: Optional[str] = None
    amount: int = 0
    status: str = "draft"
    raised_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    quotation_id: Optional[str] = None
    line_items: list[POLineItemOut] = []


_PO_STATUS = Literal['draft', 'pending', 'approved', 'ordered', 'partially_received', 'received', 'cancelled']


class PurchaseOrderCreate(CamelModel):
    organization_id: str
    po_number: Optional[str] = None
    vendor_name: str
    vendor_id: Optional[str] = None
    items_desc: Optional[str] = None
    item_count: int = 0
    ordered_date: Optional[str] = None
    expected_date: Optional[str] = None
    amount: int = 0
    status: _PO_STATUS = 'draft'
    raised_by: Optional[str] = None
    notes: Optional[str] = None
    line_items: list[POLineItemCreate] = []


class PurchaseOrderUpdate(CamelModel):
    vendor_name: Optional[str] = None
    vendor_id: Optional[str] = None
    items_desc: Optional[str] = None
    item_count: Optional[int] = None
    ordered_date: Optional[str] = None
    expected_date: Optional[str] = None
    amount: Optional[int] = None
    status: Optional[_PO_STATUS] = None
    raised_by: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Maintenance
# ---------------------------------------------------------------------------

class MaintenanceTicketOut(CamelModel):
    id: str
    organization_id: str
    ticket_id: str
    asset: str
    issue: Optional[str] = None
    reported_by: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: str = "medium"
    status: str = "open"
    reported_date: Optional[str] = None
    resolved_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None


class MaintenanceTicketCreate(CamelModel):
    organization_id: str
    asset: str
    issue: Optional[str] = None
    reported_by: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: str = "medium"
    status: str = "open"
    reported_date: Optional[str] = None
    notes: Optional[str] = None


class MaintenanceTicketUpdate(CamelModel):
    asset: Optional[str] = None
    issue: Optional[str] = None
    reported_by: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    resolved_date: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Assets
# ---------------------------------------------------------------------------

class AssetOut(CamelModel):
    id: str
    organization_id: str
    name: str
    asset_code: Optional[str] = None
    asset_type: Optional[str] = None
    assigned_to: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    condition: str = "Good"
    status: str = "available"
    purchase_date: Optional[str] = None
    value: int = 0
    notes: Optional[str] = None
    created_at: Optional[str] = None


class AssetCreate(CamelModel):
    organization_id: str
    name: str
    asset_code: Optional[str] = None
    asset_type: Optional[str] = None
    assigned_to: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    condition: str = "Good"
    status: str = "available"
    purchase_date: Optional[str] = None
    value: int = 0
    notes: Optional[str] = None


class AssetUpdate(CamelModel):
    name: Optional[str] = None
    asset_code: Optional[str] = None
    asset_type: Optional[str] = None
    assigned_to: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    condition: Optional[str] = None
    status: Optional[str] = None
    purchase_date: Optional[str] = None
    value: Optional[int] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Class Material Templates
# ---------------------------------------------------------------------------

class ClassTemplateItemOut(CamelModel):
    id: str
    template_id: str
    item_id: Optional[str] = None
    item_name: str
    quantity: int = 1
    unit_price: int = 0
    condition_issued: str = "New"
    notes: Optional[str] = None


class ClassTemplateItemCreate(CamelModel):
    item_id: Optional[str] = None
    item_name: str
    quantity: int = Field(default=1, ge=1)
    unit_price: int = Field(default=0, ge=0)
    condition_issued: str = "New"
    notes: Optional[str] = None


class FeeRecordOut(CamelModel):
    id: str
    organization_id: str
    recipient_id: str
    recipient_name: Optional[str] = None
    class_id: Optional[str] = None
    class_name: Optional[str] = None
    template_id: Optional[str] = None
    template_name: Optional[str] = None
    total_amount: int = 0
    paid_amount: int = 0
    status: str = "unpaid"
    payment_date: Optional[str] = None
    distributed_date: Optional[str] = None
    receipt_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None


class ClassTemplateOut(CamelModel):
    id: str
    organization_id: str
    name: str
    group: str
    academic_year: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    items: list[ClassTemplateItemOut] = []


class ClassTemplateCreate(CamelModel):
    organization_id: str
    name: str
    group: str
    academic_year: Optional[str] = None
    notes: Optional[str] = None
    items: list[ClassTemplateItemCreate] = []

    @field_validator('academic_year', mode='before')
    @classmethod
    def validate_academic_year(cls, v):
        return _clean_acad_year(v)


class ClassTemplateUpdate(CamelModel):
    name: Optional[str] = None
    group: Optional[str] = None
    academic_year: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('academic_year', mode='before')
    @classmethod
    def validate_academic_year(cls, v):
        return _clean_acad_year(v)


class BulkIssueBody(CamelModel):
    recipient_ids: list[str]
    issue_date: str
    issued_by: Optional[str] = None
    expected_return: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Subscriptions (static plan data)
# ---------------------------------------------------------------------------

class SubscriptionOut(BaseModel):
    tier: str
    name: str
    price: int
    price_period: str
    max_users: int
    max_items: int
    max_modules: int
    features: list[str]

    model_config = ConfigDict(populate_by_name=True)

    def model_dump(self, **kwargs):
        d = super().model_dump(**kwargs)
        return {
            "tier": d["tier"],
            "name": d["name"],
            "price": d["price"],
            "pricePeriod": d["price_period"],
            "maxUsers": d["max_users"],
            "maxItems": d["max_items"],
            "maxModules": d["max_modules"],
            "features": d["features"],
        }


# ---------------------------------------------------------------------------
# Vendor Quotation System
# ---------------------------------------------------------------------------

class QuotationItemOut(CamelModel):
    id: str
    quotation_id: str
    item_id: Optional[str] = None
    item_name: str
    qty_needed: int = 1

class QuotationItemCreate(CamelModel):
    item_id: Optional[str] = None
    item_name: str
    qty_needed: int = 1

    @model_validator(mode='after')
    def check_qty(self):
        if self.qty_needed < 1:
            raise ValueError('qty_needed must be at least 1')
        return self

class VendorQuoteItemOut(CamelModel):
    id: str
    vendor_quote_id: str
    quotation_item_id: str
    unit_price: Optional[float] = None
    lead_time_days: Optional[int] = None
    notes: Optional[str] = None

class VendorQuoteItemCreate(CamelModel):
    quotation_item_id: str
    unit_price: Optional[float] = None
    lead_time_days: Optional[int] = None
    notes: Optional[str] = None

class VendorQuoteOut(CamelModel):
    id: str
    quotation_id: str
    vendor_id: Optional[str] = None
    vendor_name: str
    vendor_email: Optional[str] = None
    status: str = "invited"
    quoted_at: Optional[str] = None
    notes: Optional[str] = None
    quote_items: list[VendorQuoteItemOut] = []

class VendorQuoteCreate(CamelModel):
    vendor_id: Optional[str] = None
    vendor_name: str
    vendor_email: Optional[str] = None

class VendorQuoteSubmit(CamelModel):
    items: list[VendorQuoteItemCreate]
    notes: Optional[str] = None

class QuotationOut(CamelModel):
    id: str
    organization_id: str
    title: str
    status: str = "draft"
    notes: Optional[str] = None
    created_at: Optional[str] = None
    items: list[QuotationItemOut] = []
    vendor_quotes: list[VendorQuoteOut] = []

class QuotationCreate(CamelModel):
    organization_id: str
    title: str
    notes: Optional[str] = None
    items: list[QuotationItemCreate] = []

class QuotationUpdate(CamelModel):
    title: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class GeneratePOsBody(CamelModel):
    # quotation_item_id → vendor_quote_id
    selections: dict[str, str]
    expected_date: Optional[str] = None
    raised_by: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Class-based Fee Flow (OrgClass)
# ---------------------------------------------------------------------------

class OrgClassItemOut(CamelModel):
    id: str
    class_id: str
    item_id: Optional[str] = None
    item_name: str
    quantity: int = 1
    unit_price: int = 0
    condition_issued: str = "New"
    notes: Optional[str] = None


class OrgClassItemCreate(CamelModel):
    item_id: Optional[str] = None
    item_name: str
    quantity: int = Field(default=1, ge=1)
    unit_price: int = Field(default=0, ge=0)
    condition_issued: str = "New"
    notes: Optional[str] = None


class OrgClassItemUpdate(CamelModel):
    item_name: Optional[str] = None
    quantity: Optional[int] = Field(default=None, ge=1)
    unit_price: Optional[int] = Field(default=None, ge=0)
    condition_issued: Optional[str] = None
    notes: Optional[str] = None


class ClassStudentRow(CamelModel):
    """A student enrolled in a class, with their live fee status."""
    recipient_id: str
    name: str
    identifier: Optional[str] = None
    contact: Optional[str] = None
    fee_record_id: Optional[str] = None
    fee_status: str = "no_fee"       # no_fee | unpaid | partial | paid | distributed | waived
    paid_amount: int = 0
    total_amount: int = 0
    payment_date: Optional[str] = None
    distributed_date: Optional[str] = None


class OrgClassOut(CamelModel):
    id: str
    organization_id: str
    name: str
    academic_year: Optional[str] = None
    notes: Optional[str] = None
    status: str = "active"
    created_at: Optional[str] = None
    items: list[OrgClassItemOut] = []
    total_fee_per_student: int = 0   # computed: sum of item prices
    student_count: int = 0           # computed
    paid_count: int = 0              # computed
    distributed_count: int = 0       # computed
    unpaid_count: int = 0            # computed


class OrgClassDetail(OrgClassOut):
    students: list[ClassStudentRow] = []


class ClassEnrollmentHistoryOut(CamelModel):
    id: str
    recipient_id: str
    class_id: Optional[str] = None
    class_name: str
    academic_year: Optional[str] = None
    joined_at: str
    left_at: Optional[str] = None


class PromoteClassBody(CamelModel):
    target_class_id: str


class OrgClassCreate(CamelModel):
    name: str
    academic_year: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('academic_year', mode='before')
    @classmethod
    def validate_academic_year(cls, v):
        return _clean_acad_year(v)


class OrgClassUpdate(CamelModel):
    name: Optional[str] = None
    academic_year: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

    @field_validator('academic_year', mode='before')
    @classmethod
    def validate_academic_year(cls, v):
        return _clean_acad_year(v)


class ImportClassTemplateBody(CamelModel):
    template_id: str


class AssignClassFeesBody(CamelModel):
    """Create FeeRecords for enrolled students who don't have one yet.
    Pass recipient_id to assign only that student; omit for all."""
    recipient_id: Optional[str] = None
    notes: Optional[str] = None


class EnrolStudentBody(CamelModel):
    """Enrol an existing recipient into the class, or create a new one."""
    # Provide recipient_id to link an existing student
    recipient_id: Optional[str] = None
    # Or provide details to create a new student on the spot
    name: Optional[str] = None
    identifier: Optional[str] = None
    contact: Optional[str] = None
    extra_data: Optional[dict[str, Any]] = None

    @field_validator('contact', mode='before')
    @classmethod
    def validate_contact(cls, v):
        return _clean_contact(v)
