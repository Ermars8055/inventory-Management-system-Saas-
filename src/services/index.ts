// ============================================================================
// Service Layer — calls FastAPI backend
// ============================================================================

import { api } from '@/lib/api';
import type {
  Organization, ModuleId, OrgConfig, Item, Category, StockTransaction,
  Supplier, User, Recipient, Assignment, Batch, ReceiptTemplate, CustomField, Subscription,
  PurchaseOrder, POLineItem, MaintenanceTicket, Asset,
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
  async getByOrganization(orgId: string): Promise<Item[]> {
    return api.get(`/inventory?org_id=${orgId}`);
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
  async getByOrganization(orgId: string): Promise<Category[]> {
    return api.get(`/categories?org_id=${orgId}`);
  },
};

export const transactionService = {
  async getByOrganization(orgId: string): Promise<StockTransaction[]> {
    return api.get(`/transactions?org_id=${orgId}`);
  },
  async getByItem(itemId: string): Promise<StockTransaction[]> {
    return api.get(`/transactions?item_id=${itemId}`);
  },
  async create(tx: Omit<StockTransaction, 'id'>): Promise<StockTransaction> {
    return api.post('/transactions', tx);
  },
};

export const supplierService = {
  async getByOrganization(orgId: string): Promise<Supplier[]> {
    return api.get(`/suppliers?org_id=${orgId}`);
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
  async getByOrganization(orgId: string): Promise<User[]> {
    return api.get(`/users?org_id=${orgId}`);
  },
  async getRoles(): Promise<{ id: string; name: string }[]> {
    return api.get('/roles');
  },
  async create(data: { organizationId: string; name: string; email: string; role: string }): Promise<User> {
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
// Generic: Student / Patient / Employee / Member / Customer

export const recipientService = {
  async getByOrganization(orgId: string): Promise<Recipient[]> {
    return api.get(`/recipients?org_id=${orgId}`);
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
  async getAssignments(orgId: string, recipientId: string): Promise<Assignment[]> {
    return api.get(`/recipients/${recipientId}/assignments?org_id=${orgId}`);
  },
};

// ─── Assignment service ──────────────────────────────────────────────────────
// Generic: Issue / Loan / Checkout — with condition + damage + fine tracking

export const assignmentService = {
  async getByOrganization(orgId: string): Promise<Assignment[]> {
    return api.get(`/assignments?org_id=${orgId}`);
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

// Keep legacy alias so pages that haven't been updated yet don't break
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
  async getByOrganization(orgId: string): Promise<Batch[]> {
    return api.get(`/batches?org_id=${orgId}`);
  },
};

export const templateService = {
  async getByOrganization(orgId: string): Promise<ReceiptTemplate[]> {
    return api.get(`/templates?org_id=${orgId}`);
  },
  async update(id: string, data: Partial<ReceiptTemplate>): Promise<ReceiptTemplate> {
    return api.put(`/templates/${id}`, data);
  },
};

export const customFieldService = {
  async getByOrganization(orgId: string): Promise<CustomField[]> {
    return api.get(`/custom-fields?org_id=${orgId}`);
  },
  async create(field: Omit<CustomField, 'id'>): Promise<CustomField> {
    return api.post('/custom-fields', field);
  },
  async delete(id: string): Promise<void> {
    return api.delete(`/custom-fields/${id}`);
  },
};

export const subscriptionService = {
  async getPlans(): Promise<Subscription[]> {
    return api.get('/subscriptions/plans');
  },
  async getCurrent(orgId: string): Promise<Subscription | undefined> {
    return api.get<Subscription>(`/subscriptions/current?org_id=${orgId}`).catch(() => undefined);
  },
  async updatePlan(orgId: string, tier: string): Promise<Subscription> {
    return api.patch(`/subscriptions/current?org_id=${orgId}`, { tier });
  },
};

export const procurementService = {
  async getByOrganization(orgId: string): Promise<PurchaseOrder[]> {
    return api.get(`/procurement?org_id=${orgId}`);
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
  async getByOrganization(orgId: string): Promise<MaintenanceTicket[]> {
    return api.get(`/maintenance?org_id=${orgId}`);
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

export const assetService = {
  async getByOrganization(orgId: string): Promise<Asset[]> {
    return api.get(`/assets?org_id=${orgId}`);
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
