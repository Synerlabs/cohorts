'use client'

import { useUser } from "@/lib/context/UserContext";
import { useOrg } from "@/lib/context/OrgContext";

type ComponentPermissionProps = {
  requiredPermissions: string[];
  children: React.ReactNode;
  invert?: boolean;
};

export function ClientComponentPermission({
  requiredPermissions,
  children,
  invert = false,
}: ComponentPermissionProps) {
  const { user } = useUser();
  const { groupPermissions } = useOrg();

  if (!user || !groupPermissions) {
    return null;
  }

  // Check explicit permissions first
  const hasExplicitPermission = groupPermissions.permissions.some((permission) =>
    requiredPermissions.includes(permission)
  );

  // Check for wildcard permission (super admin)
  const hasWildcardPermission = groupPermissions.permissions.includes('*');

  const hasPermission = hasExplicitPermission || hasWildcardPermission;

  // If invert is true, show content when user doesn't have permission
  // If invert is false (default), show content when user has permission
  return hasPermission !== invert ? <>{children}</> : null;
} 