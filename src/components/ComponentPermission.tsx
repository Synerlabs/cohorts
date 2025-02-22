import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { Camelized } from "humps";
import { Tables } from "@/lib/types/database.types";

type ComponentPermissionProps = {
  requiredPermissions: string[];
  children: React.ReactNode;
};

type UserRole = Camelized<Tables<"user_roles">> & {
  groupRoles: Camelized<Tables<"group_roles">> | null;
};

export function ComponentPermission({
  requiredPermissions,
  children,
}: ComponentPermissionProps) {
  const AuthServerContext = getAuthenticatedServerContext();
  const { user, userPermissions, groupRoles = [] } = AuthServerContext;

  if (!user) {
    return <></>;
  }

  // First check explicit permissions (faster array check)
  const hasExplicitPermission = userPermissions.some((permission) =>
    requiredPermissions.includes(permission)
  );

  if (hasExplicitPermission) {
    return <>{children}</>;
  }

  // If no explicit permission, check if user is a super admin (more expensive check)
  const isSuperAdmin = groupRoles.some((role: UserRole) => 
    role.is_active && role.group_roles?.is_super_admin
  );

  return isSuperAdmin ? <>{children}</> : null;
}
