// ============================================================================
// Service Layer — calls FastAPI backend
// Backend reads org_id from JWT token, no need to pass it as query param.
// ============================================================================

import { api } from '@/lib/api';
import type {
  Organization, ModuleId, OrgConfig, Item, Category, StockTransaction,
  Supplier, User, Recipient, Assignment, Batch, ReceiptTemplate, CustomField, Subscription,
  PurchaseOrder, POLineItem, MaintenanceTicket, Asset, ClassTemplate, ClassTemplateItem,
  Quotation,
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
};

export const categoryService = {
  async getByOrganization(_orgId?: string): Promise<Category[]> {
    return api.get('/categories');
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

export const supplierService = {
  async getByOrganization(_orgId?: string): Promise<Supplier[]> {
    return api.get('/suppliers');
  },
  async getById(id: string): Promise<Supplier | undefined> {
    return api.get<Supplier>(`/suppliers/${id}`).catch(() => undefined);
  },
  async create(data: Omit<Supplier, 'id' | 'purchaseHistory' | 'outstandingOrders'>): Promise<Supplier> {
    return api.post('/suppliers', data);
  },
  async update(id: string, data: Partial<Supplier>): Promise<Supplier> {
    return api.put(`/suppliers/${id}`, data);
  },
  async delete(id: string): Promise<void> {
    return api.delete(`/suppliers/${id}`);
  },
};

export const userService = {
  async getByOrganization(_orgId?: string): Promise<User[]> {
    return api.get('/users');
  },
  async getRoles(): Promise<{ id: string; name: string }[]> {
    return api.get('/roles');
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
  async inviteVendor(id: string, data: { supplierId?: string; supplierName: string; supplierEmail?: string }): Promise<Quotation> {
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
