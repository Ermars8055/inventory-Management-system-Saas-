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
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import type { User, Role } from '@/types';

const ALL_PERMISSIONS = [
  { id: 'view_inventory', label: 'View Inventory' },
  { id: 'create_items', label: 'Create Items' },
  { id: 'edit_items', label: 'Edit Items' },
  { id: 'delete_items', label: 'Delete Items' },
  { id: 'stock_in', label: 'Stock In' },
  { id: 'stock_out', label: 'Stock Out' },
  { id: 'manage_suppliers', label: 'Manage Suppliers' },
  { id: 'manage_modules', label: 'Manage Modules' },
  { id: 'manage_users', label: 'Manage Users' },
  { id: 'view_reports', label: 'View Reports' },
];

const ROLES = ['org_admin', 'manager', 'staff', 'viewer'];

const EMPTY_FORM = { name: '', email: '', role: 'staff' };

export function UsersPage() {
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

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

  const inp = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div>
      <PageHeader
        title={t("Users & Roles")}
        description={`${users.length} ${t('users in')} ${currentOrg.name}`}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t('Add User')}
          </Button>
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
            ) : roles.map((role) => (
              <Card key={role.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    {role.name}
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                      {role.permissions.length}/{ALL_PERMISSIONS.length} {t('permissions')}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {ALL_PERMISSIONS.map((perm) => {
                      const has = role.permissions.includes(perm.id as Parameters<typeof role.permissions.includes>[0]);
                      return (
                        <Badge
                          key={perm.id}
                          variant="outline"
                          className={`text-xs ${
                            has
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'text-muted-foreground/40 border-border/40'
                          }`}
                        >
                          {t(perm.label)}
                        </Badge>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

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
