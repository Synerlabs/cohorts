import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, X, Save, PlusCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { RoleSelectionDialog } from './role-selection-dialog';
import { cn } from "@/lib/utils";
import { GroupRole } from '../_actions/roles.action';

interface Role {
  id: string;
  role_name: string;
  permissions: string[];
}

interface RoleSelectorProps {
  isEditing: boolean;
  selectedRoles: Role[];
  onEdit: () => void;
  onRemoveRole: (roleId: string) => void;
  onRolesSelect: (roleIds: string[]) => void;
  isPending: boolean;
  groupId: string;
}

export function RoleSelector({
  isEditing,
  selectedRoles: initialSelectedRoles,
  onEdit,
  onRemoveRole,
  onRolesSelect,
  isPending,
  groupId
}: RoleSelectorProps) {
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [removingRoleId, setRemovingRoleId] = useState<string | null>(null);
  
  // Track roles in local state
  const [localSelectedRoles, setLocalSelectedRoles] = useState<Role[]>(initialSelectedRoles);

  // Update local state when initialSelectedRoles changes
  useEffect(() => {
    setLocalSelectedRoles(initialSelectedRoles);
  }, [initialSelectedRoles]);

  const handleRemoveRole = (roleId: string) => {
    setRemovingRoleId(roleId);
    if (!isEditing) {
      onEdit();
    }
    // Update local state only
    setLocalSelectedRoles(prev => prev.filter(role => role.id !== roleId));
  };

  const handleAddRoles = () => {
    setShowRoleDialog(true);
    if (!isEditing) {
      onEdit();
    }
  };

  const handleCancel = () => {
    // Reset local state to initial roles
    setLocalSelectedRoles(initialSelectedRoles);
    setRemovingRoleId(null);
    onEdit();
  };

  const handleSave = async () => {
    try {
      // Only update parent state when saving
      await onRolesSelect(localSelectedRoles.map(role => role.id));
      setRemovingRoleId(null);
    } catch (error) {
      console.error('Error saving roles:', error);
      // Keep edit mode active if save fails
      return;
    }
  };

  return (
    <Card className={cn("p-6 transition-shadow duration-200",
      isEditing && "ring-2 ring-primary ring-offset-2")}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Member Roles</h2>
            <p className="text-sm text-muted-foreground">
              Roles assigned to members in this tier
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddRoles}
            className="gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Roles</span>
          </Button>
        </div>
        <Separator />

        {(!isEditing && localSelectedRoles.length === 0) ? (
          <div className="rounded-lg border-2 border-dashed p-8">
            <div className="text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-medium mb-2">No roles assigned</h4>
              <p className="text-sm text-muted-foreground max-w-[280px] mx-auto mb-4">
                Select the roles that will be assigned to members in this tier
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddRoles}
                className="gap-2"
              >
                <Shield className="h-4 w-4" />
                <span>Assign Roles</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border">
            <div className="relative">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3 pl-6">Role Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Permissions</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {localSelectedRoles.length === 0 && isEditing ? (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-muted-foreground">
                        No roles selected. Click "Add Roles" to assign roles to members.
                      </td>
                    </tr>
                  ) : (
                    localSelectedRoles.map(role => (
                      <tr 
                        key={role.id} 
                        className={cn(
                          "border-t transition-opacity duration-200",
                          removingRoleId === role.id && "opacity-50"
                        )}
                      >
                        <td className="p-3 pl-6">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{role.role_name}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {role.permissions.map(permission => (
                              <Badge 
                                key={permission} 
                                variant="secondary" 
                                className="text-xs font-normal"
                              >
                                {permission}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRole(role.id)}
                            className="h-8 w-8 p-0 hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Remove role</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {isEditing && (
              <div className="bg-muted/50 p-4 flex justify-between items-center border-t">
                <p className="text-sm text-muted-foreground">
                  {localSelectedRoles.length} role{localSelectedRoles.length !== 1 && 's'} will be assigned to members
                </p>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancel}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </Button>
                  <Button
                    type="button"
                    disabled={isPending}
                    onClick={handleSave}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isPending ? "Saving..." : "Save Changes"}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <RoleSelectionDialog
        open={showRoleDialog}
        onOpenChange={(open) => {
          setShowRoleDialog(open);
          if (!open) {
            setRemovingRoleId(null);
          }
        }}
        onSelect={(roleIds, selectedRoles) => {
          // Transform and filter out any roles with missing required fields
          if (selectedRoles) {
            const validRoles = selectedRoles
              .filter((role): role is (GroupRole & { role_name: string }) => 
                typeof role.id === 'string' && 
                typeof role.role_name === 'string' && 
                role.role_name !== null &&
                Array.isArray(role.permissions)
              )
              .map(role => ({
                id: role.id,
                role_name: role.role_name,
                permissions: role.permissions || []
              }));
            setLocalSelectedRoles(validRoles);
          }
          setRemovingRoleId(null);
          setShowRoleDialog(false);
          // Enter edit mode if not already editing
          if (!isEditing) {
            onEdit();
          }
        }}
        groupId={groupId}
        selectedRoleIds={localSelectedRoles.map(role => role.id)}
      />
    </Card>
  );
} 