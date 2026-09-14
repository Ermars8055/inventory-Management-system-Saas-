from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


def _camel(s: str) -> str:
    return to_camel(s)


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=_camel,
        populate_by_name=True,
        from_attributes=True,
    )


# ---------------------------------------------------------------------------
# Org Config — stored as JSON in Organization.config
# ---------------------------------------------------------------------------

class OrgConfig(CamelModel):
    recipient_label: str = "Recipient"
    recipient_plural_label: str = "Recipients"
    identifier_label: str = "ID"
    group_label: str = "Group"
    assignment_label: str = "Assignment"
    item_unit: str = "units"
    currency_symbol: str = "₹"
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
    plan: str = "starter"
    created_at: Optional[str] = None
    config: Optional[dict[str, Any]] = None


class OrganizationCreate(CamelModel):
    name: str
    industry: str
    enabled_modules: list[str] = []


class OrganizationUpdate(CamelModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


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
    location: Optional[str] = None
    status: str = "in_stock"
    last_updated: Optional[str] = None
    uniform: Optional[dict[str, Any]] = None
    book: Optional[dict[str, Any]] = None
    medicine: Optional[dict[str, Any]] = None
    attributes: Optional[dict[str, Any]] = None


class ItemCreate(CamelModel):
    organization_id: str
    name: str
    sku: str
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    module: Optional[str] = "general"
    quantity: int = 0
    available: Optional[int] = None
    reserved: int = 0
    location: Optional[str] = None
    uniform: Optional[dict[str, Any]] = None
    book: Optional[dict[str, Any]] = None
    medicine: Optional[dict[str, Any]] = None
    attributes: Optional[dict[str, Any]] = None


class ItemUpdate(CamelModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    module: Optional[str] = None
    quantity: Optional[int] = None
    available: Optional[int] = None
    reserved: Optional[int] = None
    location: Optional[str] = None
    uniform: Optional[dict[str, Any]] = None
    book: Optional[dict[str, Any]] = None
    medicine: Optional[dict[str, Any]] = None
    attributes: Optional[dict[str, Any]] = None


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
# Suppliers
# ---------------------------------------------------------------------------

class SupplierOut(CamelModel):
    id: str
    organization_id: str
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    items_supplied: Optional[str] = None
    status: str = "active"
    purchase_history: list[dict[str, Any]] = []
    outstanding_orders: list[dict[str, Any]] = []


class SupplierCreate(CamelModel):
    organization_id: str
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    items_supplied: Optional[str] = None


class SupplierUpdate(CamelModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    items_supplied: Optional[str] = None
    status: Optional[str] = None


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


class RecipientCreate(CamelModel):
    organization_id: str
    name: str
    identifier: Optional[str] = None
    group: Optional[str] = None
    contact: Optional[str] = None
    extra_data: Optional[dict[str, Any]] = None


class RecipientUpdate(CamelModel):
    name: Optional[str] = None
    identifier: Optional[str] = None
    group: Optional[str] = None
    contact: Optional[str] = None
    extra_data: Optional[dict[str, Any]] = None


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
    damage_notes: Optional[str] = None
    fine_amount: int = 0
    fine_paid: bool = False
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


class CustomFieldCreate(CamelModel):
    organization_id: str
    name: str
    type: str
    entity: str
    options: Optional[list[str]] = None


# ---------------------------------------------------------------------------
# User CRUD
# ---------------------------------------------------------------------------

class UserCreate(CamelModel):
    organization_id: str
    name: str
    email: str
    password: Optional[str] = None
    role: str = "staff"


class UserUpdate(CamelModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None


# ---------------------------------------------------------------------------
# Procurement
# ---------------------------------------------------------------------------

class PurchaseOrderOut(CamelModel):
    id: str
    organization_id: str
    po_number: str
    supplier: str
    items_desc: Optional[str] = None
    item_count: int = 0
    ordered_date: Optional[str] = None
    expected_date: Optional[str] = None
    amount: int = 0
    status: str = "draft"
    raised_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None


class PurchaseOrderCreate(CamelModel):
    organization_id: str
    po_number: str
    supplier: str
    items_desc: Optional[str] = None
    item_count: int = 0
    ordered_date: Optional[str] = None
    expected_date: Optional[str] = None
    amount: int = 0
    status: str = "draft"
    raised_by: Optional[str] = None
    notes: Optional[str] = None


class PurchaseOrderUpdate(CamelModel):
    supplier: Optional[str] = None
    items_desc: Optional[str] = None
    item_count: Optional[int] = None
    ordered_date: Optional[str] = None
    expected_date: Optional[str] = None
    amount: Optional[int] = None
    status: Optional[str] = None
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
