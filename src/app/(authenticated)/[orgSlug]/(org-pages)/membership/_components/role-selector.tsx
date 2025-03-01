import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, X, Save, PlusCircle } from "lucide-react";
import { useState } from "react";
import { RoleSelectionDialog } from './role-selection-dialog';
import { cn } from "@/lib/utils";

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
              <Shield className="h-4 w-4" />
              <span>Edit Roles</span>
            </Button>
          )}
        </div>
        <Separator />

        {selectedRoles.length > 0 ? (
          <Card className="p-3 border-dashed">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-muted rounded-md">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {`${selectedRoles.length} role${selectedRoles.length === 1 ? '' : 's'} selected`}
                  </p>
                  <Badge variant="secondary" className="shrink-0">Selected</Badge>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedRoles.map(role => (
                    <Badge key={role.id} variant="outline" className="gap-1">
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
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <div className="rounded-lg border-2 border-dashed p-8">
            <div className="text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-medium mb-2">No roles assigned</h4>
              <p className="text-sm text-muted-foreground max-w-[280px] mx-auto mb-4">
                Select the roles that will be assigned to members in this tier
              </p>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  className="gap-2"
                >
                  <Shield className="h-4 w-4" />
                  <span>Assign Roles</span>
                </Button>
              )}
            </div>
          </div>
        )}

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
              onClick={() => onEdit()}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              <span>{isPending ? "Saving..." : "Save Changes"}</span>
            </Button>
          </div>
        )}
      </div>

      <RoleSelectionDialog
        open={showRoleDialog}
        onOpenChange={setShowRoleDialog}
        onSelect={onRolesSelect}
        groupId={groupId}
        selectedRoleIds={selectedRoles.map(role => role.id)}
      />
    </Card>
  );
} 