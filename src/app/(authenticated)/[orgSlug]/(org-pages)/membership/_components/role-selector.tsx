import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, X, Save, PlusCircle } from "lucide-react";
import { useState } from "react";
import { RoleSelectionDialog } from './role-selection-dialog';

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
  selectedRoles,
  onEdit,
  onRemoveRole,
  onRolesSelect,
  isPending,
  groupId
}: RoleSelectorProps) {
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Member Roles</h2>
            <p className="text-sm text-muted-foreground">
              Roles assigned to members in this tier
            </p>
          </div>
          {isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRoleDialog(true)}
              className="gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Roles</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" />
              <span>Edit Roles</span>
            </Button>
          )}
        </div>
        <Separator />

        <div className="flex flex-wrap gap-2">
          {selectedRoles.map((role) => (
            <Badge
              key={role.id}
              variant="secondary"
              className="gap-2"
            >
              {role.role_name}
              {isEditing && (
                <button
                  onClick={() => onRemoveRole(role.id)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {selectedRoles.length === 0 && (
            <p className="text-sm text-muted-foreground">No roles assigned</p>
          )}
        </div>

        {isEditing && (
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onEdit}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              <span>{isPending ? "Saving..." : "Save Changes"}</span>
            </Button>
          </div>
        )}
      </div>

      {showRoleDialog && (
        <RoleSelectionDialog
          open={showRoleDialog}
          onOpenChange={setShowRoleDialog}
          onSelect={onRolesSelect}
          groupId={groupId}
          selectedRoleIds={selectedRoles.map(role => role.id)}
        />
      )}
    </Card>
  );
} 