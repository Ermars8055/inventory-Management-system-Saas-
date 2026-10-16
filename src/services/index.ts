// ============================================================================
// Service Layer — calls FastAPI backend
// Backend reads org_id from JWT token, no need to pass it as query param.
// ============================================================================

import { api } from '@/lib/api';
import type {
  Organization, ModuleId, OrgConfig, Item, Category, StockTransaction,
  Vendor, User, Role, Recipient, Assignment, Batch, ReceiptTemplate, CustomField, Subscription,
  PurchaseOrder, POLineItem, MaintenanceTicket, Asset, ClassTemplate, ClassTemplateItem,
  Quotation, FeeRecord, FeeReceipt, OrgClass, OrgClassDetail, OrgClassItem,
  ClassEnrollmentHistory, BatchClassCreate, CloneYearClassesBody, TransferStudentPayload, PromoteClassPayload,
  ItemVariantGroup, VariantItemCreate, GroupedInventoryRow,
  StorageLocation, StockTransferPayload, LocationRecommendation,
  Warehouse, WarehouseTransferPayload,
} from '@/types';

export const organizationService = {
  async getAll(): Promise<Organization[]> {
    return api.get('/organizations');
  },
  async create(data: { name: string; industry: string; enabledModules: ModuleId[] }): Promise<Organization> {
    return api.post('/organizations', data);
  },
  async update(data: { id: string; name?: string; email?: string; phone?: string; address?: string }): Promise<Organization> {
    const { id, ...body } = data;
    return api.put(`/organizations/${id}`, body);
  },
  async updateModules(orgId: string, modules: ModuleId[]): Promise<Organization | undefined> {
    return api.patch(`/organizations/${orgId}/modules`, { enabledModules: modules });
  },
  async updateConfig(orgId: string, config: Partial<OrgConfig>): Promise<Organization> {
    return api.patch(`/organizations/${orgId}/config`, { config });
  },
};

export const inventoryService = {
  async getByOrganization(_orgId?: string): Promise<Item[]> {
    return api.get('/inventory');
  },
  async getById(id: string): Promise<Item | undefined> {
    return api.get<Item>(`/inventory/${id}`).catch(() => undefined);
  },
  async create(item: Omit<Item, 'id' | 'status' | 'lastUpdated'>): Promise<Item> {
    return api.post('/inventory', item);
  },
  async update(id: string, data: Partial<Item>): Promise<Item> {
    return api.put(`/inventory/${id}`, data);
  },
  async adjustStock(itemId: string, delta: number): Promise<Item> {
    return api.patch(`/inventory/${itemId}/stock`, { delta });
  },
  async delete(id: string): Promise<void> {
    return api.delete(`/inventory/${id}`);
  },
  async nextSku(): Promise<string> {
    const res = await api.get<{ sku: string }>('/inventory/next-sku');
    return res.sku;
  },
};

export const variantGroupService = {
  async list(): Promise<ItemVariantGroup[]> {
    return api.get('/item-variant-groups');
  },
  async create(data: { name: string; description?: string; categoryId?: string; module?: string; variants?: VariantItemCreate[] }): Promise<ItemVariantGroup> {
    return api.post('/item-variant-groups', data);
  },
  async update(id: string, data: { name?: string; description?: string; categoryId?: string }): Promise<ItemVariantGroup> {
    return api.put(`/item-variant-groups/${id}`, data);
  },
  async delete(id: string): Promise<void> {
    return api.delete(`/item-variant-groups/${id}`);
  },
  async getVariants(id: string): Promise<Item[]> {
    return api.get(`/item-variant-groups/${id}/variants`);
  },
  async addVariant(groupId: string, data: VariantItemCreate): Promise<Item> {
    return api.post(`/item-variant-groups/${groupId}/variants`, data);
  },
  async removeVariant(groupId: string, itemId: string): Promise<void> {
    return api.delete(`/item-variant-groups/${groupId}/variants/${itemId}`);
  },
  async listGrouped(): Promise<GroupedInventoryRow[]> {
    return api.get('/inventory/grouped');
  },
};

export const categoryService = {
  async getByOrganization(_orgId?: string): Promise<Category[]> {
    return api.get('/categories');
  },
  async create(data: { name: string; color?: string }): Promise<Category> {
    return api.post('/categories', data);
  },
  async delete(id: string): Promise<void> {
    return api.delete(`/categories/${id}`);
  },
};

export const transactionService = {
  async getByOrganization(_orgId?: string): Promise<StockTransaction[]> {
    return api.get('/transactions');
  },
  async getByItem(itemId: string): Promise<StockTransaction[]> {
    return api.get(`/transactions?item_id=${itemId}`);
  },
  async create(tx: Omit<StockTransaction, 'id'>): Promise<StockTransaction> {
    return api.post('/transactions', tx);
  },
};

// ─── Vendor service ──────────────────────────────────────────────────────────

export const vendorService = {
  async getByOrganization(_orgId?: string): Promise<Vendor[]> {
    return api.get('/vendors');
  },
  async getById(id: string): Promise<Vendor | undefined> {
    return api.get<Vendor>(`/vendors/${id}`).catch(() => undefined);
  },
  async create(data: Omit<Vendor, 'id' | 'purchaseHistory' | 'outstandingOrders'>): Promise<Vendor> {
    return api.post('/vendors', data);
  },
  async update(id: string, data: Partial<Vendor>): Promise<Vendor> {
    return api.put(`/vendors/${id}`, data);
  },
  async delete(id: string): Promise<void> {
    return api.delete(`/vendors/${id}`);
  },
};

export const userService = {
  async getByOrganization(_orgId?: string): Promise<User[]> {
    return api.get('/users');
  },
  async getRoles(): Promise<Role[]> {
    return api.get('/roles');
  },
  async updateRole(id: string, data: { permissions: string[] }): Promise<Role> {
    return api.put(`/roles/${id}`, data);
  },
  async create(data: { organizationId: string; name: string; email: string; role: string; password?: string }): Promise<User> {
    return api.post('/users', data);
  },
  async update(id: string, data: { name?: string; email?: string; role?: string }): Promise<User> {
    return api.put(`/users/${id}`, data);
  },
  async deactivate(id: string): Promise<User> {
    return api.patch(`/users/${id}/deactivate`, {});
  },
  async activate(id: string): Promise<User> {
    return api.patch(`/users/${id}/activate`, {});
  },
  async delete(id: string): Promise<void> {
    return api.delete(`/users/${id}`);
  },
};

// ─── Recipient service ───────────────────────────────────────────────────────

export const recipientService = {
  async getByOrganization(_orgId?: string): Promise<Recipient[]> {
    return api.get('/recipients');
  },
  async getById(id: string): Promise<Recipient | undefined> {
    return api.get<Recipient>(`/recipients/${id}`).catch(() => undefined);
  },
  async create(data: Omit<Recipient, 'id'>): Promise<Recipient> {
    return api.post('/recipients', data);
  },
  async update(id: string, data: Partial<Recipient>): Promise<Recipient> {
    return api.put(`/recipients/${id}`, data);
  },
  async delete(id: string): Promise<void> {
    return api.delete(`/recipients/${id}`);
  },
  async getAssignments(_orgId: string, recipientId: string): Promise<Assignment[]> {
    return api.get(`/recipients/${recipientId}/assignments`);
  },
};

// ─── Assignment service ──────────────────────────────────────────────────────

export const assignmentService = {
  async getByOrganization(_orgId?: string): Promise<Assignment[]> {
    return api.get('/assignments');
  },
  async create(data: {
    organizationId: string;
    recipientId: string;
    recipientName: string;
    recipientIdentifier?: string;
    recipientGroup?: string;
    itemId: string;
    itemName: string;
    itemDetails?: string;
    quantity: number;
    conditionIssued: string;
    issueDate: string;
    expectedReturn?: string;
    issuedBy?: string;
    notes?: string;
  }): Promise<Assignment> {
    return api.post('/assignments', data);
  },
  async returnItem(
    assignmentId: string,
    data: {
      conditionReturned: string;
      damageNotes?: string;
      fineAmount?: number;
      receivedBy?: string;
      notes?: string;
    },
  ): Promise<Assignment> {
    return api.patch(`/assignments/${assignmentId}/return`, data);
  },
  async markLost(
    assignmentId: string,
    data: { fineAmount?: number; notes?: string },
  ): Promise<Assignment> {
    return api.patch(`/assignments/${assignmentId}/lost`, data);
  },
  async markFinePaid(assignmentId: string): Promise<Assignment> {
    return api.patch(`/assignments/${assignmentId}/fine-paid`, {});
  },
  async markFeePaid(assignmentId: string): Promise<Assignment> {
    return api.patch(`/assignments/${assignmentId}/fee-paid`, {});
  },
};

// Keep legacy alias
export const studentService = {
  getByOrganization: (orgId: string) => recipientService.getByOrganization(orgId),
  getIssuedItems: (orgId: string, studentId?: string) =>
    studentId
      ? recipientService.getAssignments(orgId, studentId)
      : assignmentService.getByOrganization(orgId),
  issueItem: (record: Parameters<typeof assignmentService.create>[0]) =>
    assignmentService.create(record),
  returnItem: (id: string) =>
    assignmentService.returnItem(id, { conditionReturned: 'Good' }),
};

export const batchService = {
  async getByOrganization(_orgId?: string): Promise<Batch[]> {
    return api.get('/batches');
  },
};

export const templateService = {
  async getByOrganization(_orgId?: string): Promise<ReceiptTemplate[]> {
    return api.get('/templates');
  },
  async update(id: string, data: Partial<ReceiptTemplate>): Promise<ReceiptTemplate> {
    return api.put(`/templates/${id}`, data);
  },
};

export const customFieldService = {
  async getByOrganization(_orgId?: string): Promise<CustomField[]> {
    return api.get('/custom-fields');
  },
  async create(field: Omit<CustomField, 'id'>): Promise<CustomField> {
    return api.post('/custom-fields', field);
  },
  async update(id: string, data: Partial<CustomField>): Promise<CustomField> {
    return api.put(`/custom-fields/${id}`, data);
  },
  async delete(id: string): Promise<void> {
    return api.delete(`/custom-fields/${id}`);
  },
};

export const subscriptionService = {
  async getPlans(): Promise<Subscription[]> {
    return api.get('/subscriptions/plans');
  },
  async getCurrent(_orgId?: string): Promise<Subscription | undefined> {
    return api.get<Subscription>('/subscriptions/current').catch(() => undefined);
  },
  async updatePlan(_orgId: string, tier: string): Promise<Subscription> {
    return api.patch('/subscriptions/current', { tier });
  },
  async getUsage(): Promise<{ limits: { max_users: number; max_items: number; max_modules: number }; usage: { users: number; items: number; modules: number } }> {
    return api.get('/subscriptions/usage');
  },
  async getInvoices(): Promise<{ id: string; plan: string; baseAmount: number; discountCode?: string; discountAmount: number; finalAmount: number; status: string; billingPeriod: string; dueDate: string; paidDate?: string }[]> {
    return api.get('/subscriptions/invoices');
  },
  async payInvoice(invoiceId: string): Promise<{ paid: boolean }> {
    return api.post(`/subscriptions/invoices/${invoiceId}/pay`, {});
  },
};

export const procurementService = {
  async getByOrganization(_orgId?: string): Promise<PurchaseOrder[]> {
    return api.get('/procurement');
  },
  async create(data: Omit<PurchaseOrder, 'id' | 'createdAt' | 'lineItems'> & {
    lineItems?: { itemId?: string; itemName: string; quantityOrdered: number; unitPrice: number }[];
  }): Promise<PurchaseOrder> {
    return api.post('/procurement', data);
  },
  async update(id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    return api.put(`/procurement/${id}`, data);
  },
  async receivePO(id: string, lines: { lineItemId: string; quantityReceived: number }[]): Promise<PurchaseOrder> {
    return api.post(`/procurement/${id}/receive`, { lines });
  },
  async delete(id: string): Promise<void> {
    return api.delete(`/procurement/${id}`);
  },
};

export const maintenanceService = {
  async getByOrganization(_orgId?: string): Promise<MaintenanceTicket[]> {
    return api.get('/maintenance');
  },
  async create(data: Omit<MaintenanceTicket, 'id' | 'ticketId' | 'createdAt'>): Promise<MaintenanceTicket> {
    return api.post('/maintenance', data);
  },
  async update(id: string, data: Partial<MaintenanceTicket>): Promise<MaintenanceTicket> {
    return api.put(`/maintenance/${id}`, data);
  },
  async delete(id: string): Promise<void> {
    return api.delete(`/maintenance/${id}`);
  },
};

export const classTemplateService = {
  async getByOrganization(_orgId?: string): Promise<ClassTemplate[]> {
    return api.get('/class-templates');
  },
  async getById(id: string): Promise<ClassTemplate> {
    return api.get(`/class-templates/${id}`);
  },
  async create(data: {
    organizationId: string;
    name: string;
    group: string;
    academicYear?: string;
    notes?: string;
    items: { itemId?: string; itemName: string; quantity: number; conditionIssued: string; notes?: string }[];
  }): Promise<ClassTemplate> {
    return api.post('/class-templates', data);
  },
  async update(id: string, data: { name?: string; group?: string; academicYear?: string; notes?: string }): Promise<ClassTemplate> {
    return api.put(`/class-templates/${id}`, data);
  },
  async delete(id: string): Promise<void> {
    return api.delete(`/class-templates/${id}`);
  },
  async addItem(templateId: string, item: { itemId?: string; itemName: string; quantity: number; conditionIssued: string; notes?: string }): Promise<ClassTemplateItem> {
    return api.post(`/class-templates/${templateId}/items`, item);
  },
  async updateItem(templateId: string, itemId: string, item: { itemId?: string; itemName: string; quantity: number; conditionIssued: string; notes?: string }): Promise<ClassTemplateItem> {
    return api.put(`/class-templates/${templateId}/items/${itemId}`, item);
  },
  async deleteItem(templateId: string, itemId: string): Promise<void> {
    return api.delete(`/class-templates/${templateId}/items/${itemId}`);
  },
  async bulkIssue(templateId: string, data: {
    recipientIds: string[];
    issueDate: string;
    issuedBy?: string;
    expectedReturn?: string;
    notes?: string;
  }): Promise<Assignment[]> {
    return api.post(`/class-templates/${templateId}/bulk-issue`, data);
  },
};

export const assetService = {
  async getByOrganization(_orgId?: string): Promise<Asset[]> {
    return api.get('/assets');
  },
  async create(data: Omit<Asset, 'id' | 'assetCode' | 'createdAt'>): Promise<Asset> {
    return api.post('/assets', data);
  },
  async update(id: string, data: Partial<Asset>): Promise<Asset> {
    return api.put(`/assets/${id}`, data);
  },
  async delete(id: string): Promise<void> {
    return api.delete(`/assets/${id}`);
  },
};

// ─── Fee service ─────────────────────────────────────────────────────────────

export const feeService = {
  async getAll(recipientId?: string): Promise<FeeRecord[]> {
    const qs = recipientId ? `?recipient_id=${recipientId}` : '';
    return api.get(`/fees${qs}`);
  },
  async getByRecipient(recipientId: string): Promise<FeeRecord[]> {
    return api.get(`/fees?recipient_id=${recipientId}`);
  },
  async assignPackage(recipientId: string, templateId: string, notes?: string): Promise<FeeRecord> {
    return api.post('/fees', { recipientId, templateId, notes });
  },
  async pay(feeId: string, amount: number, notes?: string): Promise<FeeRecord> {
    return api.patch(`/fees/${feeId}/pay`, { amount, notes });
  },
  async distribute(feeId: string, itemIds?: string[]): Promise<FeeRecord> {
    return api.post(`/fees/${feeId}/distribute`, itemIds ? { itemIds } : {});
  },
  async waive(feeId: string): Promise<FeeRecord> {
    return api.patch(`/fees/${feeId}/waive`, {});
  },
  async getReceipt(feeId: string): Promise<FeeReceipt> {
    return api.get(`/fees/${feeId}/receipt`);
  },
};

// ─── Class service ────────────────────────────────────────────────────────────

export const classService = {
  async getAll(): Promise<OrgClass[]> {
    return api.get('/classes');
  },
  async getById(id: string): Promise<OrgClassDetail> {
    return api.get(`/classes/${id}`);
  },
  async create(data: { name: string; academicYear?: string; notes?: string }): Promise<OrgClass> {
    return api.post('/classes', data);
  },
  async createBatch(data: BatchClassCreate): Promise<{ createdCount: number; skippedCount: number; classes: OrgClass[] }> {
    return api.post('/classes/batch', data);
  },
  async cloneYear(data: CloneYearClassesBody): Promise<{ createdCount: number; skippedCount: number; classes: OrgClass[] }> {
    return api.post('/classes/clone-year', data);
  },
  async update(id: string, data: { name?: string; academicYear?: string; notes?: string; status?: string }): Promise<OrgClass> {
    return api.put(`/classes/${id}`, data);
  },
  async delete(id: string): Promise<void> {
    return api.delete(`/classes/${id}`);
  },
  async addItem(id: string, data: { itemId?: string; itemName: string; quantity: number; unitPrice: number; conditionIssued?: string; notes?: string }): Promise<OrgClassDetail> {
    return api.post(`/classes/${id}/items`, data);
  },
  async updateItem(id: string, itemId: string, data: { itemName?: string; quantity?: number; unitPrice?: number; conditionIssued?: string; notes?: string }): Promise<OrgClassDetail> {
    return api.put(`/classes/${id}/items/${itemId}`, data);
  },
  async removeItem(id: string, itemId: string): Promise<OrgClassDetail> {
    return api.delete(`/classes/${id}/items/${itemId}`);
  },
  async importTemplate(id: string, templateId: string): Promise<OrgClassDetail> {
    return api.post(`/classes/${id}/import-template`, { templateId });
  },
  async enrolStudent(id: string, data: { recipientId?: string; name?: string; identifier?: string; contact?: string }): Promise<OrgClassDetail> {
    return api.post(`/classes/${id}/students`, data);
  },
  async removeStudent(id: string, recipientId: string): Promise<OrgClassDetail> {
    return api.delete(`/classes/${id}/students/${recipientId}`);
  },
  async transferStudent(classId: string, recipientId: string, data: TransferStudentPayload): Promise<OrgClassDetail> {
    return api.post(`/classes/${classId}/students/${recipientId}/transfer`, data);
  },
  async assignFees(id: string, data?: { recipientId?: string; notes?: string }): Promise<{ created: number; skipped: number }> {
    return api.post(`/classes/${id}/assign-fees`, data ?? {});
  },
  async distributePaid(id: string): Promise<{ distributed: number }> {
    return api.post(`/classes/${id}/distribute-paid`, {});
  },
  async promoteClass(id: string, payload: string | PromoteClassPayload): Promise<{ promoted: number; retained?: number; graduated?: number; withdrawn?: number; targetClass?: string; totalProcessed?: number }> {
    const body = typeof payload === 'string' ? { targetClassId: payload } : payload;
    return api.post(`/classes/${id}/promote`, body);
  },
  async getEnrollmentHistory(recipientId: string): Promise<ClassEnrollmentHistory[]> {
    return api.get(`/classes/enrollment-history/${recipientId}`);
  },
};

export const quotationService = {
  async getByOrganization(_orgId?: string): Promise<Quotation[]> {
    return api.get('/quotations');
  },
  async getById(id: string): Promise<Quotation> {
    return api.get(`/quotations/${id}`);
  },
  async create(data: { organizationId: string; title: string; notes?: string; items: { itemId?: string; itemName: string; qtyNeeded: number }[] }): Promise<Quotation> {
    return api.post('/quotations', data);
  },
  async update(id: string, data: { title?: string; status?: string; notes?: string }): Promise<Quotation> {
    return api.put(`/quotations/${id}`, data);
  },
  async delete(id: string): Promise<void> {
    return api.delete(`/quotations/${id}`);
  },
  async addItem(id: string, data: { itemId?: string; itemName: string; qtyNeeded: number }): Promise<Quotation> {
    return api.post(`/quotations/${id}/items`, data);
  },
  async removeItem(id: string, itemId: string): Promise<Quotation> {
    return api.delete(`/quotations/${id}/items/${itemId}`);
  },
  async inviteVendor(id: string, data: { vendorId?: string; vendorName: string; vendorEmail?: string }): Promise<Quotation> {
    return api.post(`/quotations/${id}/vendors`, data);
  },
  async removeVendor(id: string, vqId: string): Promise<Quotation> {
    return api.delete(`/quotations/${id}/vendors/${vqId}`);
  },
  async submitVendorQuote(id: string, vqId: string, data: { items: { quotationItemId: string; unitPrice?: number; leadTimeDays?: number; notes?: string }[]; notes?: string }): Promise<Quotation> {
    return api.post(`/quotations/${id}/vendors/${vqId}/submit`, data);
  },
  async rejectVendor(id: string, vqId: string): Promise<Quotation> {
    return api.patch(`/quotations/${id}/vendors/${vqId}/reject`, {});
  },
  async generatePOs(id: string, data: { selections: Record<string, string>; expectedDate?: string; raisedBy?: string; notes?: string }): Promise<PurchaseOrder[]> {
    return api.post(`/quotations/${id}/generate-pos`, data);
  },
};

export interface AuditEntry {
  id: string;
  userId?: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  detail: string;
  createdAt: string;
}

export const recordsService = {
  async getTimeline(params: {
    dateFrom?: string;
    dateTo?: string;
    entityType?: string;
    limit?: number;
  }): Promise<AuditEntry[]> {
    const p = new URLSearchParams();
    if (params.dateFrom) p.set('date_from', params.dateFrom);
    if (params.dateTo) p.set('date_to', params.dateTo);
    if (params.entityType) p.set('entity_type', params.entityType);
    p.set('limit', String(params.limit ?? 1000));
    return api.get(`/audit-log?${p.toString()}`);
  },
};

export const locationService = {
  async getAll(params?: { includeInactive?: boolean }): Promise<StorageLocation[]> {
    const p = new URLSearchParams();
    if (params?.includeInactive) p.set('include_inactive', 'true');
    return api.get(`/locations?${p.toString()}`);
  },
  async create(data: {
    name: string;
    code?: string;
    building?: string;
    floor?: string;
    type?: string;
    supervisorName?: string;
    supervisorPhone?: string;
    maxCapacity?: number;
  }): Promise<StorageLocation> {
    return api.post('/locations', data);
  },
  async update(id: string, data: Partial<StorageLocation>): Promise<StorageLocation> {
    return api.put(`/locations/${id}`, data);
  },
  async delete(id: string): Promise<{ message: string }> {
    return api.delete(`/locations/${id}`);
  },
  async getItems(id: string): Promise<Item[]> {
    return api.get(`/locations/${id}/items`);
  },
  async transfer(data: StockTransferPayload): Promise<{ success: boolean; message: string }> {
    return api.post('/locations/transfer', data);
  },
  async getRecommendations(params: {
    categoryId?: string;
    categoryName?: string;
    module?: string;
    quantity?: number;
  }): Promise<LocationRecommendation[]> {
    const p = new URLSearchParams();
    if (params.categoryId) p.set('category_id', params.categoryId);
    if (params.categoryName) p.set('category_name', params.categoryName);
    if (params.module) p.set('module', params.module);
    if (params.quantity) p.set('quantity', String(params.quantity));
    return api.get(`/locations/recommend?${p.toString()}`);
  },
};

export const warehouseService = {
  async getAll(params?: { includeInactive?: boolean }): Promise<Warehouse[]> {
    const p = new URLSearchParams();
    if (params?.includeInactive) p.set('include_inactive', 'true');
    return api.get(`/warehouses?${p.toString()}`);
  },
  async create(data: {
    name: string;
    code?: string;
    building?: string;
    address?: string;
    supervisorName?: string;
    supervisorPhone?: string;
    maxCapacity?: number;
  }): Promise<Warehouse> {
    return api.post('/warehouses', data);
  },
  async update(id: string, data: Partial<Warehouse>): Promise<Warehouse> {
    return api.put(`/warehouses/${id}`, data);
  },
  async delete(id: string): Promise<{ message: string }> {
    return api.delete(`/warehouses/${id}`);
  },
  async getItems(id: string): Promise<Item[]> {
    return api.get(`/warehouses/${id}/items`);
  },
  async transfer(data: WarehouseTransferPayload): Promise<{ success: boolean; message: string }> {
    return api.post('/warehouses/transfer', data);
  },
};

export interface AssistantChatPayload {
  message: string;
  current_path?: string;
  api_key?: string;
  model?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

export interface AssistantChatResult {
  reply: string;
  actions: { label: string; path?: string }[];
  model: string;
  provider: string;
  is_fallback: boolean;
}

export const assistantService = {
  async chat(payload: AssistantChatPayload): Promise<AssistantChatResult> {
    return api.post('/assistant/chat', payload);
  },
};


