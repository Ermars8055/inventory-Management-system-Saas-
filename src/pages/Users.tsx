import { useState, useEffect } from 'react';
import { Users, Plus, Shield, UserX, UserCheck, Trash2, Pencil } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { userService } from '@/services';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { User, Role } from '@/types';

interface PermissionDef {
  id: string;
  label: string;
  description: string;
}

interface PermissionCategory {
  name: string;
  permissions: PermissionDef[];
}

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    name: 'Inventory Management',
    permissions: [
      { id: 'inventory:read', label: 'View Inventory', description: 'View items, quantities, and stock locations' },
      { id: 'inventory:create', label: 'Create Items', description: 'Add new items and import catalog' },
      { id: 'inventory:update', label: 'Edit & Adjust Stock', description: 'Edit item details and record stock adjustments' },
      { id: 'inventory:delete', label: 'Delete Items', description: 'Permanently remove items from inventory' },
    ],
  },
  {
    name: 'Issuance & Assignments',
    permissions: [
      { id: 'assignments:read', label: 'View Assignments', description: 'View issued items and student allocations' },
      { id: 'assignments:create', label: 'Issue Items', description: 'Issue or lend materials to students/recipients' },
      { id: 'assignments:update', label: 'Return & Collect Fees', description: 'Process returns, collect fees, waive fines' },
      { id: 'assignments:delete', label: 'Delete Assignments', description: 'Delete assignment or issuance records' },
    ],
  },
  {
    name: 'Recipients & Students',
    permissions: [
      { id: 'recipients:read', label: 'View Recipients', description: 'View students, patients, or recipients' },
      { id: 'recipients:create', label: 'Add Recipients', description: 'Add new recipients or enrol students' },
      { id: 'recipients:update', label: 'Edit Recipients', description: 'Update recipient info and custom fields' },
      { id: 'recipients:delete', label: 'Delete Recipients', description: 'Remove recipients from the system' },
    ],
  },
  {
    name: 'Vendors & Procurement',
    permissions: [
      { id: 'vendors:read', label: 'View Vendors', description: 'View vendors, contacts, and purchase orders' },
      { id: 'vendors:create', label: 'Create Vendors & POs', description: 'Add new vendors and raise purchase orders' },
      { id: 'vendors:update', label: 'Edit Vendors & POs', description: 'Update vendor details and quotation quotes' },
      { id: 'vendors:delete', label: 'Delete Vendors', description: 'Delete vendor records' },
    ],
  },
  {
    name: 'Reports & Transactions',
    permissions: [
      { id: 'transactions:read', label: 'View Transactions', description: 'View stock ledger and movement history' },
      { id: 'reports:read', label: 'View Reports', description: 'View analytics, reports, and printable registers' },
    ],
  },
  {
    name: 'Administration & Settings',
    permissions: [
      { id: 'users:read', label: 'View Users & Roles', description: 'View team members and role permissions' },
      { id: 'users:manage', label: 'Manage Users & Permissions', description: 'Invite users, assign roles, edit role permissions' },
      { id: 'settings:read', label: 'View Settings', description: 'View organization configuration' },
      { id: 'settings:update', label: 'Update Settings', description: 'Update organization settings and modules' },
    ],
  },
];

const ALL_PERMISSION_IDS = PERMISSION_CATEGORIES.flatMap((c) => c.permissions.map((p) => p.id));

const ROLES = ['org_admin', 'manager', 'staff', 'viewer'];

const EMPTY_FORM = { name: '', email: '', role: 'staff' };

export function UsersPage() {
  const { currentOrg } = useOrganization();
  const { can } = useAuth();
  const canManage = can('users:manage');
  const { toast } = useToast();
  const { t } = useTranslation();

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Role permissions editing
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [savingRole, setSavingRole] = useState(false);

  const load = async () => {
    if (!currentOrg) return;
    const [usersData, rolesData] = await Promise.all([
      userService.getByOrganization(currentOrg.id),
      userService.getRoles().catch(() => [] as Role[]),
    ]);
    setUsers(usersData);
    setRoles(rolesData as Role[]);
  };

  useEffect(() => { load(); }, [currentOrg]);

  if (!currentOrg) return null;

  function openCreate() {
    setEditUser(null);
    setForm(EMPTY_FORM);
    setShowCreate(true);
  }

  function openEdit(u: User) {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, role: u.role || 'staff' });
    setShowCreate(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editUser) {
        const updated = await userService.update(editUser.id, { name: form.name, email: form.email, role: form.role });
        setUsers((prev) => prev.map((u) => (u.id === editUser.id ? updated : u)));
        toast({ title: t('User updated') });
      } else {
        await userService.create({ organizationId: currentOrg!.id, ...form });
        await load();
        toast({ title: t('User created') });
      }
      setShowCreate(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('Failed');
      toast({ title: t('Error'), description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(u: User) {
    try {
      const updated = u.status === 'active'
        ? await userService.deactivate(u.id)
        : await userService.activate(u.id);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
      toast({ title: u.status === 'active' ? t('User deactivated') : t('User activated') });
    } catch {
      toast({ title: t('Error'), description: t('Failed to update status'), variant: 'destructive' });
    }
  }

  async function handleDelete(id: string) {
    try {
      await userService.delete(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast({ title: t('User deleted') });
    } catch {
      toast({ title: t('Error'), description: t('Failed to delete user'), variant: 'destructive' });
    }
  }

  function openEditRole(r: Role) {
    setEditingRole(r);
    setSelectedPerms([...(r.permissions || [])]);
  }

  function togglePermission(permId: string) {
    setSelectedPerms((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  }

  function handleSelectAll() {
    setSelectedPerms([...ALL_PERMISSION_IDS]);
  }

  function handleDeselectAll() {
    setSelectedPerms([]);
  }

  async function handleSaveRole() {
    if (!editingRole) return;
    setSavingRole(true);
    try {
      const updated = await userService.updateRole(editingRole.id, { permissions: selectedPerms });
      setRoles((prev) => prev.map((r) => (r.id === editingRole.id ? updated : r)));
      toast({ title: `${t('Permissions updated for')} ${editingRole.name}` });
      setEditingRole(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('Failed to update permissions');
      toast({ title: t('Error'), description: msg, variant: 'destructive' });
    } finally {
      setSavingRole(false);
    }
  }

  const inp = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div>
      <PageHeader
        title={t("Users & Roles")}
        description={`${users.length} ${t('users in')} ${currentOrg.name}`}
        actions={
          canManage ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t('Add User')}
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue="users">
        <TabsList className="mb-6">
          <TabsTrigger value="users">{t('Users')} ({users.length})</TabsTrigger>
          <TabsTrigger value="roles">{t('Roles & Permissions')}</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardContent className="p-0">
              {users.length === 0 ? (
                <EmptyState icon={Users} title={t("No users yet")} description={t("Add users to collaborate on this organization.")} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('User')}</TableHead>
                      <TableHead>{t('Email')}</TableHead>
                      <TableHead>{t('Role')}</TableHead>
                      <TableHead>{t('Status')}</TableHead>
                      <TableHead>{t('Last Active')}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
                              {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {user.status === 'active' ? (
                            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                              {t('Active')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">{t('Inactive')}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{user.lastActive || '—'}</TableCell>
                        <TableCell>
                          {canManage && (
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => openEdit(user)}
                                className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title={t("Edit")}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(user)}
                                className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title={user.status === 'active' ? t('Deactivate') : t('Activate')}
                              >
                                {user.status === 'active'
                                  ? <UserX className="h-3.5 w-3.5" />
                                  : <UserCheck className="h-3.5 w-3.5" />
                                }
                              </button>
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title={t("Delete")}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <div className="space-y-4">
            {roles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">{t('No roles defined yet')}</p>
            ) : roles.map((role) => {
              const isAdmin = role.id === 'org_admin';
              const activeCount = isAdmin
                ? ALL_PERMISSION_IDS.length
                : role.permissions.filter((p) => p !== '*').length;

              return (
                <Card key={role.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        {role.name}
                        {isAdmin ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-normal">
                            {t('Full Access (Admin)')}
                          </Badge>
                        ) : (
                          <span className="text-xs font-normal text-muted-foreground">
                            {activeCount}/{ALL_PERMISSION_IDS.length} {t('permissions')}
                          </span>
                        )}
                      </CardTitle>
                      {!isAdmin && canManage && (
                        <Button size="sm" variant="outline" onClick={() => openEditRole(role)} className="h-8 text-xs">
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          {t('Edit Permissions')}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1.5">
                      {PERMISSION_CATEGORIES.flatMap((c) => c.permissions).map((perm) => {
                        const has = isAdmin || role.permissions.includes('*') || role.permissions.includes(perm.id);
                        return (
                          <Badge
                            key={perm.id}
                            variant="outline"
                            className={`text-[11px] ${
                              has
                                ? 'bg-primary/10 text-primary border-primary/20'
                                : 'text-muted-foreground/30 border-border/30 opacity-40'
                            }`}
                          >
                            {t(perm.label)}
                          </Badge>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Role Permissions Dialog */}
      <Dialog open={!!editingRole} onOpenChange={(v) => { if (!v) setEditingRole(null); }}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {t('Edit Permissions')} — {editingRole?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-xs text-muted-foreground">
              {selectedPerms.length} / {ALL_PERMISSION_IDS.length} {t('permissions selected')}
            </span>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={handleSelectAll}>
                {t('Select All')}
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={handleDeselectAll}>
                {t('Deselect All')}
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-5 py-3 pr-1">
            {PERMISSION_CATEGORIES.map((category) => (
              <div key={category.name} className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t(category.name)}
                </h4>
                <div className="grid sm:grid-cols-2 gap-2">
                  {category.permissions.map((perm) => {
                    const isChecked = selectedPerms.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked ? 'bg-primary/5 border-primary/30' : 'bg-muted/20 border-border/60 hover:bg-muted/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(perm.id)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-muted-foreground text-primary focus:ring-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{t(perm.label)}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t(perm.description)}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setEditingRole(null)}>
              {t('Cancel')}
            </Button>
            <Button onClick={handleSaveRole} disabled={savingRole}>
              {savingRole ? t('Saving…') : t('Save Permissions')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editUser ? t('Edit User') : t('Add User')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Full Name')} *</label>
              <input required className={inp} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Email')} *</label>
              <input required type="email" className={inp} value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('Role')}</label>
              <select className={inp} value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>{t('Cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving ? t('Saving…') : editUser ? t('Update') : t('Add User')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
