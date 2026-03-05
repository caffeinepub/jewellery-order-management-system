import { AppRole, AppStatus, type AppUser } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActor } from "@/hooks/useActor";
import {
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  UserCheck,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface CreateUserForm {
  name: string;
  loginId: string;
  password: string;
  role: AppRole;
  karigarName: string;
}

interface EditUserForm {
  name: string;
  loginId: string;
  role: AppRole;
  karigarName: string;
  status: AppStatus;
}

const defaultCreateForm: CreateUserForm = {
  name: "",
  loginId: "",
  password: "",
  role: AppRole.Staff,
  karigarName: "",
};

export default function UserManagement() {
  const { actor } = useActor();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] =
    useState<CreateUserForm>(defaultCreateForm);
  const [isCreating, setIsCreating] = useState(false);

  // Edit dialog
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({
    name: "",
    loginId: "",
    role: AppRole.Staff,
    karigarName: "",
    status: AppStatus.Active,
  });
  const [isEditing, setIsEditing] = useState(false);

  // Reset password dialog
  const [resetUser, setResetUser] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const loadUsers = async () => {
    if (!actor) return;
    setIsLoading(true);
    try {
      const list = await actor.listUsers();
      setUsers(list);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadUsers is stable, actor dependency is correct
  useEffect(() => {
    if (actor) loadUsers();
  }, [actor]);

  // ── Create User ──────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (
      !actor ||
      !createForm.name ||
      !createForm.loginId ||
      !createForm.password
    )
      return;
    setIsCreating(true);
    try {
      const hash = await sha256hex(createForm.password);
      await actor.createUser(
        createForm.name.trim(),
        createForm.loginId.trim(),
        hash,
        createForm.role,
        createForm.role === AppRole.Karigar && createForm.karigarName.trim()
          ? createForm.karigarName.trim()
          : null,
      );
      toast.success("User created successfully");
      setShowCreate(false);
      setCreateForm(defaultCreateForm);
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setIsCreating(false);
    }
  };

  // ── Edit User ────────────────────────────────────────────────────────────────
  const openEdit = (user: AppUser) => {
    setEditUser(user);
    setEditForm({
      name: user.name,
      loginId: user.loginId,
      role: user.role,
      karigarName: user.karigarName ?? "",
      status: user.status,
    });
  };

  const handleEdit = async () => {
    if (!actor || !editUser) return;
    setIsEditing(true);
    try {
      await actor.updateUser(
        editUser.id,
        editForm.name.trim(),
        editForm.loginId.trim(),
        editForm.role,
        editForm.role === AppRole.Karigar && editForm.karigarName.trim()
          ? editForm.karigarName.trim()
          : null,
        editForm.status,
      );
      toast.success("User updated successfully");
      setEditUser(null);
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setIsEditing(false);
    }
  };

  // ── Toggle active/inactive ───────────────────────────────────────────────────
  const handleToggleStatus = async (user: AppUser) => {
    if (!actor) return;
    const newStatus =
      user.status === AppStatus.Active ? AppStatus.Inactive : AppStatus.Active;
    try {
      await actor.updateUser(
        user.id,
        user.name,
        user.loginId,
        user.role,
        user.karigarName ?? null,
        newStatus,
      );
      toast.success(
        `User ${newStatus === AppStatus.Active ? "activated" : "deactivated"}`,
      );
      await loadUsers();
    } catch {
      toast.error("Failed to update user status");
    }
  };

  // ── Reset Password ───────────────────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!actor || !resetUser || !newPassword.trim()) return;
    setIsResetting(true);
    try {
      const hash = await sha256hex(newPassword.trim());
      await actor.resetUserPassword(resetUser.id, hash);
      toast.success("Password reset successfully");
      setResetUser(null);
      setNewPassword("");
    } catch {
      toast.error("Failed to reset password");
    } finally {
      setIsResetting(false);
    }
  };

  const roleBadgeClass = (role: AppRole) => {
    if (role === AppRole.Admin)
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    if (role === AppRole.Karigar)
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  };

  return (
    <div className="w-full p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            User Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage login access and roles for all system users
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadUsers}
            disabled={isLoading}
            data-ocid="users.secondary_button"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white"
            data-ocid="users.open_modal_button"
          >
            <Plus className="h-4 w-4 mr-1" />
            Create User
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table data-ocid="users.table">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Login ID</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Karigar Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                  data-ocid="users.loading_state"
                >
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading users…
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                  data-ocid="users.empty_state"
                >
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user, idx) => (
                <TableRow key={user.id} data-ocid={`users.row.${idx + 1}`}>
                  <TableCell className="font-medium text-foreground">
                    {user.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.loginId}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${roleBadgeClass(user.role)}`}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.karigarName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        user.status === AppStatus.Active
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                      }`}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => openEdit(user)}
                        data-ocid={`users.edit_button.${idx + 1}`}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-blue-400 hover:text-blue-300"
                        onClick={() => {
                          setResetUser(user);
                          setNewPassword("");
                        }}
                        data-ocid={`users.secondary_button.${idx + 1}`}
                      >
                        Reset Pwd
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-7 px-2 text-xs ${
                          user.status === AppStatus.Active
                            ? "text-red-400 hover:text-red-300"
                            : "text-green-400 hover:text-green-300"
                        }`}
                        onClick={() => handleToggleStatus(user)}
                        data-ocid={`users.toggle.${idx + 1}`}
                      >
                        {user.status === AppStatus.Active ? (
                          <>
                            <UserX className="h-3 w-3 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Create User Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md" data-ocid="users.dialog">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                placeholder="Full name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, name: e.target.value }))
                }
                data-ocid="users.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Login ID</Label>
              <Input
                placeholder="Login ID (used to sign in)"
                value={createForm.loginId}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, loginId: e.target.value }))
                }
                data-ocid="users.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Initial password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, password: e.target.value }))
                }
                data-ocid="users.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) =>
                  setCreateForm((p) => ({ ...p, role: v as AppRole }))
                }
              >
                <SelectTrigger data-ocid="users.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AppRole.Admin}>Admin</SelectItem>
                  <SelectItem value={AppRole.Staff}>Staff</SelectItem>
                  <SelectItem value={AppRole.Karigar}>Karigar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createForm.role === AppRole.Karigar && (
              <div className="space-y-1.5">
                <Label>Karigar Name</Label>
                <Input
                  placeholder="Must match karigar in orders"
                  value={createForm.karigarName}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      karigarName: e.target.value,
                    }))
                  }
                  data-ocid="users.input"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              disabled={isCreating}
              data-ocid="users.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                isCreating ||
                !createForm.name ||
                !createForm.loginId ||
                !createForm.password
              }
              className="bg-orange-500 hover:bg-orange-600 text-white"
              data-ocid="users.submit_button"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ───────────────────────────────────────────────────── */}
      <Dialog
        open={!!editUser}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
        }}
      >
        <DialogContent className="max-w-md" data-ocid="users.dialog">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, name: e.target.value }))
                }
                data-ocid="users.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Login ID</Label>
              <Input
                value={editForm.loginId}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, loginId: e.target.value }))
                }
                data-ocid="users.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) =>
                  setEditForm((p) => ({ ...p, role: v as AppRole }))
                }
              >
                <SelectTrigger data-ocid="users.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AppRole.Admin}>Admin</SelectItem>
                  <SelectItem value={AppRole.Staff}>Staff</SelectItem>
                  <SelectItem value={AppRole.Karigar}>Karigar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editForm.role === AppRole.Karigar && (
              <div className="space-y-1.5">
                <Label>Karigar Name</Label>
                <Input
                  value={editForm.karigarName}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, karigarName: e.target.value }))
                  }
                  data-ocid="users.input"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) =>
                  setEditForm((p) => ({ ...p, status: v as AppStatus }))
                }
              >
                <SelectTrigger data-ocid="users.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AppStatus.Active}>Active</SelectItem>
                  <SelectItem value={AppStatus.Inactive}>Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditUser(null)}
              disabled={isEditing}
              data-ocid="users.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isEditing}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              data-ocid="users.save_button"
            >
              {isEditing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={!!resetUser}
        onOpenChange={(open) => {
          if (!open) {
            setResetUser(null);
            setNewPassword("");
          }
        }}
      >
        <DialogContent className="max-w-sm" data-ocid="users.dialog">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          {resetUser && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Resetting password for{" "}
                <span className="text-foreground font-medium">
                  {resetUser.name}
                </span>
              </p>
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-ocid="users.input"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetUser(null);
                setNewPassword("");
              }}
              disabled={isResetting}
              data-ocid="users.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={isResetting || !newPassword.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              data-ocid="users.confirm_button"
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting…
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
