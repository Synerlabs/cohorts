'use client'

import { useUser } from "@/lib/context/UserContext";
import { useOrg } from "@/lib/context/OrgContext";

type ComponentPermissionProps = {
  requiredPermissions: string[];
  children: React.ReactNode;
};

export function ClientComponentPermission({
  requiredPermissions,
  children,
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

  if (hasExplicitPermission) {
    return <>{children}</>;
  }

  // Check for wildcard permission (super admin)
  if (groupPermissions.permissions.includes('*')) {
    return <>{children}</>;
  }

  return null;
} 