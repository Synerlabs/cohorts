import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { getUserRoles } from "@/services/user.service";
import { Database } from "@/lib/types/database.types";

type GroupRole = Database["public"]["Tables"]["group_roles"]["Row"];
type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];

type PermissionRequirement = string | string[] | string[][] | { 
  any?: string[][],     // OR conditions
  all?: string[],       // AND conditions
  solo?: string[]       // Override permissions - any of these grants access
};

export type PermissionCheckResult = {
  hasAccess: boolean;
  isGuest: boolean;
  userPermissions: string[];
  userRoles: (UserRole & { group_roles: GroupRole | null })[];
};

async function checkPermissionSet(
  userPermissions: string[],
  requiredPermissions: string[]
): Promise<boolean> {
  return requiredPermissions.every(permission =>
    userPermissions.includes(permission)
  );
}

export async function checkUserAccess({
  userId,
  groupId,
  requiredPermissions = [],
  allowGuest = false
}: {
  userId: string;
  groupId: string;
  requiredPermissions?: PermissionRequirement;
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
  if (requiredPermissions) {
    // Handle solo permissions first if they exist
    if (typeof requiredPermissions === 'object' && !Array.isArray(requiredPermissions) && requiredPermissions.solo) {
      const soloCheck = await checkPermissionSet(userPermissions, requiredPermissions.solo);
      if (soloCheck) {
        return {
          hasAccess: true,
          isGuest,
          userPermissions,
          userRoles: orgRoles || []
        };
      }
    }

    // Handle different permission types
    if (typeof requiredPermissions === 'string') {
      // Single permission string
      hasRequiredPermissions = userPermissions.includes(requiredPermissions);
    } else if (Array.isArray(requiredPermissions)) {
      if (requiredPermissions.length === 0) {
        hasRequiredPermissions = true;
      } else if (Array.isArray(requiredPermissions[0])) {
        // OR conditions - any of these permission sets must match
        hasRequiredPermissions = false;
        for (const permissionSet of requiredPermissions as string[][]) {
          if (await checkPermissionSet(userPermissions, permissionSet)) {
            hasRequiredPermissions = true;
            break;
          }
        }
      } else {
        // AND condition - all permissions must match
        hasRequiredPermissions = await checkPermissionSet(userPermissions, requiredPermissions as string[]);
      }
    } else {
      // Object format
      hasRequiredPermissions = false;

      // Check 'any' conditions (OR)
      if (requiredPermissions.any) {
        for (const permissionSet of requiredPermissions.any) {
          if (await checkPermissionSet(userPermissions, permissionSet)) {
            hasRequiredPermissions = true;
            break;
          }
        }
      }

      // Check 'all' conditions (AND)
      if (requiredPermissions.all && !hasRequiredPermissions) {
        hasRequiredPermissions = await checkPermissionSet(userPermissions, requiredPermissions.all);
      }
    }
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