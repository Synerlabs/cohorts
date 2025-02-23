"use client";

import { useUser } from "@/lib/context/UserContext";
import { useOrg } from "@/lib/context/OrgContext";

export function usePermissions() {
  const { user } = useUser();
  const { groupPermissions } = useOrg();

  const hasPermission = (requiredPermissions: string | string[]) => {
    if (!user || !groupPermissions) {
      return false;
    }

    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    // Check for wildcard permission (super admin)
    if (groupPermissions.permissions.includes('*')) {
      return true;
    }

    // Check explicit permissions
    return permissions.every((permission) =>
      groupPermissions.permissions.includes(permission)
    );
  };

  return {
    hasPermission,
    isAuthenticated: !!user,
    user,
    groupPermissions
  };
} 