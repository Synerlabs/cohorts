import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { getUserRoles } from "@/services/user.service";
import { Database } from "@/lib/types/database.types";

type GroupRole = Database["public"]["Tables"]["group_roles"]["Row"];
type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];

export type PermissionCheckResult = {
  hasAccess: boolean;
  isGuest: boolean;
  userPermissions: string[];
  userRoles: (UserRole & { group_roles: GroupRole | null })[];
};

export async function checkUserAccess({
  userId,
  groupId,
  requiredPermissions = [],
  allowGuest = false
}: {
  userId: string;
  groupId: string;
  requiredPermissions?: string[];
  allowGuest?: boolean;
}): Promise<PermissionCheckResult> {
  // Get user roles for this organization
  const userRoles = await getUserRoles({ id: userId, groupId });

  // Filter roles to only include those belonging to the current org
  const orgRoles = userRoles?.filter(role => 
    role.group_roles?.group_id === groupId
  );

  // Get permissions only from roles that belong to this org
  const userPermissions = orgRoles?.reduce((acc: string[], role) => {
    if (role.group_roles?.permissions) {
      return [...acc, ...role.group_roles.permissions];
    }
    return acc;
  }, []) || [];

  // Check if user is a guest (no active roles)
  const isGuest = !orgRoles?.find((role) => role.is_active);

  // Check required permissions
  let hasRequiredPermissions = true;
  if (requiredPermissions.length > 0) {
    hasRequiredPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );
  }

  // Determine if user should have access
  const hasAccess = (
    // Either guest access is allowed or user is not a guest
    (allowGuest || !isGuest) &&
    // And user has required permissions (if any)
    hasRequiredPermissions
  );

  return {
    hasAccess,
    isGuest,
    userPermissions,
    userRoles: orgRoles || []
  };
}

// Legacy function for backward compatibility
export async function checkPermissions(requiredPermissions: string[]): Promise<boolean> {
  const AuthServerContext = getAuthenticatedServerContext();
  const { user, userPermissions } = AuthServerContext;

  if (!user) {
    return false;
  }

  return userPermissions.some((permission) => requiredPermissions.includes(permission));
} 