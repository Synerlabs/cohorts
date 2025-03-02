import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { getUserRoles } from "@/services/user.service";
import { Database } from "@/lib/types/database.types";
import { createClient } from "@/lib/utils/supabase/server";

type GroupRole = Database["public"]["Tables"]["group_roles"]["Row"];
type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];

type MembershipRoleView = {
  user_id: string;
  role_id: string;
  role_name: string;
  permissions: string[];
  group_id: string;
  membership_id: string;
  membership_status: string;
  tier_name: string;
  start_date: string;
  end_date: string | null;
};

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
  const supabase = await createClient();

  // Get user roles for this organization
  const userRoles = await getUserRoles({ id: userId, groupId });

  // Get roles from active memberships
  const { data: membershipRoles, error: membershipError } = await supabase
    .from('membership_roles_view')
    .select('*')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .eq('membership_status', 'active');

  // console.log("DEBUG - membershipRoles:", membershipRoles, membershipError);

  if (membershipError) {
    console.error('Error fetching membership roles:', membershipError);
  }

  // Filter roles to only include those belonging to the current org
  const orgRoles = userRoles?.filter(role => 
    role.group_roles?.group_id === groupId
  );

  // Check if user has active direct roles
  const hasActiveDirectRoles = !!orgRoles?.find((role) => role.is_active);
  
  // Check if user has active membership roles
  const hasActiveMembershipRoles = !!(membershipRoles && membershipRoles.length > 0);
  
  // A user is a guest if they have neither active direct roles nor active membership roles
  // Users with membership roles are NOT considered guests
  const isGuest = !hasActiveDirectRoles && !hasActiveMembershipRoles;
  
  // console.log("DEBUG - Guest check:", {
  //   hasActiveDirectRoles,
  //   hasActiveMembershipRoles,
  //   isGuest,
  //   allowGuest
  // });

  // Get permissions from roles and membership roles
  const userPermissions = [
    // Get permissions from direct roles
    ...(orgRoles?.reduce((acc: string[], role) => {
      if (role.is_active && role.group_roles?.is_super_admin) {
        return acc;
      }
      if (role.is_active && role.group_roles?.permissions) {
        return [...acc, ...role.group_roles.permissions];
      }
      return acc;
    }, []) || []),
    // Get permissions from membership roles
    ...(membershipRoles?.reduce((acc: string[], role: MembershipRoleView) => {
      // console.log("DEBUG - Processing membership role:", role.role_name, "with permissions:", role.permissions);
      // Make sure permissions is an array before spreading
      if (role.permissions && Array.isArray(role.permissions)) {
        return [...acc, ...role.permissions];
      }
      return acc;
    }, []) || [])
  ];

  // console.log("DEBUG - Final userPermissions:", userPermissions);

  // Check if user has an active super admin role for this org
  const hasSuperAdminRole = orgRoles?.some(role => 
    role.is_active && role.group_roles?.is_super_admin
  );

  // Check required permissions
  let hasRequiredPermissions = true;
  if (requiredPermissions) {
    // If user is a super admin, they automatically have access to all org-scoped permissions
    // But we still need to check if the required permissions are org-scoped
    if (hasSuperAdminRole) {
      // All current permissions in the system are org-scoped, so we can grant access
      // If we add non-org-scoped permissions in the future, we would need to check here
      hasRequiredPermissions = true;
    } else {
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
  }

  // Determine if user should have access
  // If the user has membership roles and the required permissions, they should have access
  // regardless of guest status
  const hasAccess = hasRequiredPermissions && (allowGuest || !isGuest || hasActiveMembershipRoles);

  // console.log("DEBUG - Access determination:", {
  //   allowGuest,
  //   isGuest,
  //   hasActiveMembershipRoles,
  //   hasRequiredPermissions,
  //   hasAccess
  // });

  return {
    hasAccess,
    isGuest,
    userPermissions: hasSuperAdminRole ? ['*'] : userPermissions, // Use '*' to indicate super admin has all permissions
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