'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Database } from '@/lib/types/database.types';
import { toast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Check, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getRolesAction, GroupRole } from '../_actions/roles.action';

interface RoleSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (roleIds: string[], selectedRoles?: GroupRole[]) => void;
  groupId: string;
  selectedRoleIds?: string[];
}

export function RoleSelectionDialog({
  open,
  onOpenChange,
  onSelect,
  groupId,
  selectedRoleIds = []
}: RoleSelectionDialogProps) {
  const [roles, setRoles] = useState<GroupRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(selectedRoleIds);

  // Load roles when dialog opens
  const loadRoles = async () => {
    console.log('Loading roles in dialog for group:', groupId);
    setIsLoading(true);
    try {
      const roleData = await getRolesAction(groupId);
      console.log('Roles loaded:', roleData);
      
      setRoles(roleData);
      console.log('Roles set in state:', roleData.length, 'roles');
      console.log('Role details:', roleData.map(r => ({
        id: r.id,
        name: r.role_name,
        is_super_admin: r.is_super_admin
      })));
    } catch (error) {
      console.error('Error loading roles:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load roles',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Use useEffect to handle role loading
  useEffect(() => {
    console.log('Dialog effect triggered:', { open, groupId });
    if (open && groupId) {
      loadRoles();
      setSelectedRoles(selectedRoleIds);
    }
  }, [open, groupId]);

  // Reset selected roles when selectedRoleIds changes
  useEffect(() => {
    console.log('Selected role IDs changed:', {
      selectedRoleIds,
      isArray: Array.isArray(selectedRoleIds),
      length: selectedRoleIds?.length
    });
    
    // Ensure we have an array of valid UUIDs
    const validIds = Array.isArray(selectedRoleIds) 
      ? selectedRoleIds.filter(id => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return typeof id === 'string' && uuidRegex.test(id);
        })
      : [];
      
    console.log('Setting selected roles with validated IDs:', validIds);
    setSelectedRoles(validIds);
  }, [selectedRoleIds]);

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => {
      if (prev.includes(roleId)) {
        return prev.filter(id => id !== roleId);
      } else {
        return [...prev, roleId];
      }
    });
  };

  const handleSave = () => {
    // Validate that we have valid UUIDs
    const validRoleIds = selectedRoles.filter(id => {
      // UUID validation regex
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValid = uuidRegex.test(id);
      if (!isValid) {
        console.warn('Invalid role ID found:', id);
      }
      return isValid;
    });

    console.log('Saving roles:', {
      original: selectedRoles,
      validated: validRoleIds
    });

    if (validRoleIds.length !== selectedRoles.length) {
      toast({
        title: 'Warning',
        description: 'Some selected roles were invalid and will be skipped',
        variant: 'destructive',
      });
    }

    // Pass both the role IDs and the full role objects
    const selectedRoleObjects = roles.filter(role => validRoleIds.includes(role.id));
    onSelect(validRoleIds, selectedRoleObjects);
    onOpenChange(false);
  };

  const renderRoleCard = (role: GroupRole) => {
    const isSelected = selectedRoles.includes(role.id);
    return (
      <div key={role.id}>
        <Card
          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
            isSelected 
              ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2' 
              : 'hover:border-primary'
          }`}
          onClick={() => toggleRole(role.id)}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 border rounded-md ${isSelected ? 'border-primary bg-primary/10' : ''}`}>
              <Shield className={`h-5 w-5 ${isSelected ? 'text-primary' : ''}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{role.role_name}</h3>
                {isSelected && (
                  <Badge variant="default" className="shrink-0">
                    <Check className="h-3 w-3 mr-1" />
                    Selected
                  </Badge>
                )}
              </div>
              {role.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {role.description}
                </p>
              )}
              {role.permissions && role.permissions.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="text-xs text-muted-foreground">Permissions:</div>
                  <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                    {role.permissions.map((permission) => (
                      <Badge 
                        key={permission} 
                        variant="secondary" 
                        className="text-[11px] px-1.5 py-0.5 font-normal"
                      >
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderLoadingState = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <Card className="p-8 text-center">
      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
      <h3 className="font-semibold mt-4">No Roles Available</h3>
      <p className="text-sm text-muted-foreground mt-2">
        No roles found. Create roles first to assign them to membership tiers.
      </p>
    </Card>
  );

  console.log('Dialog render state:', { isLoading, rolesCount: roles.length });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Select Member Roles</DialogTitle>
          <DialogDescription>
            Choose the roles that will be assigned to members in this tier.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          <ScrollArea className="h-[400px] pr-4 -mr-4">
            <div className="space-y-4">
              {isLoading ? (
                renderLoadingState()
              ) : roles.length === 0 ? (
                renderEmptyState()
              ) : (
                roles.map(renderRoleCard)
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 