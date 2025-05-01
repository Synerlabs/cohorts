"use server";
import { createClient, createServiceRoleClient } from "@/lib/utils/supabase/server";
import { checkUserAccess } from "@/lib/utils/permissions";
import { PermissionModule as ModuleType } from '@/lib/types/permissions';

// Export the types needed by other actions
export type ActionContext = {
  groupId?: string;
  moduleId?: string;
  moduleType?: ModuleType;
  requiredPermissions: string | string[] | string[][] | {
    any?: string[][],     // OR conditions
    all?: string[],       // AND conditions
    solo?: string[]       // Override permissions - any of these grants access
  };
  allowGuest?: boolean;
  isCreation?: boolean;  // Flag to indicate if this is a creation operation
};

export interface ActionResult<T = unknown> {
  success?: boolean;
  error?: string;
  data?: T;
}

// Define getModuleGroupId locally if needed
async function getModuleGroupId(moduleType: ModuleType, moduleId: string): Promise<string | null> {
  const supabase = await createServiceRoleClient();
  let tableName: string;
  let idColumn: string = 'id';
  let groupIdColumn: string = 'group_id';

  switch (moduleType) {
    case 'group': 
      return moduleId; 
    case 'roles':
      tableName = 'group_roles'; 
      break;
    case 'forms':
      tableName = 'form_templates';
      groupIdColumn = 'org_id';
      break;
    case 'memberships':
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select('group_user:group_user_id(group_id)')
        .eq('id', moduleId)
        .maybeSingle();

      if (!membershipError && membershipData?.group_user) {
        return (membershipData.group_user as any).group_id;
      }
      
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('group_id')
        .eq('id', moduleId)
        .eq('type', 'membership_tier')
        .maybeSingle();
        
      if (!productError && productData?.group_id) {
         return productData.group_id;
      }
      
      console.error(`Error fetching group_id for memberships module ${moduleId}: MembershipErr: ${membershipError?.message}, ProductErr: ${productError?.message}`);
      return null;
    
    case 'applications': 
      tableName = 'applications';
      idColumn = 'id';
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('group_user:group_user_id(group_id)')
        .eq('id', moduleId)
        .single();
      if (appError || !appData?.group_user) {
        console.error(`Error fetching group_id for application ${moduleId}:`, appError);
        return null;
      }
      return (appData.group_user as any).group_id;
    case 'payments':
      tableName = 'payments';
      idColumn = 'id';
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('order:order_id(group_id)')
        .eq('id', moduleId)
        .single();
      if (paymentError || !paymentData?.order) {
        console.error(`Error fetching group_id for payment ${moduleId}:`, paymentError);
        return null;
      }
      return (paymentData.order as any).group_id;
    case 'paymentGateways':
      tableName = 'stripe_settings';
      idColumn = 'group_id';
      groupIdColumn = 'group_id';
      break;
    case 'orders':
      tableName = 'orders';
      idColumn = 'id';
      groupIdColumn = 'group_id';
      break;
    case 'members':
      tableName = 'group_users';
      idColumn = 'id'; // Assuming moduleId is the group_users.id
      groupIdColumn = 'group_id';
      break;
    default:
      const _exhaustiveCheck: never = moduleType;
      console.error(`Unhandled moduleType: ${_exhaustiveCheck}`);
      return null;
  }

  // Standard query for tables with direct group_id
  const { data, error } = await supabase
    .from(tableName)
    .select(groupIdColumn)
    .eq(idColumn, moduleId)
    .single();

  if (error || !data) {
    console.error(`Error fetching group_id for ${moduleType} ${moduleId}:`, error);
    return null;
  }

  return (data as any)[groupIdColumn];
}

async function checkPermissions(
  userId: string,
  groupId: string,
  permissions: ActionContext['requiredPermissions'],
  allowGuest: boolean
): Promise<{ hasAccess: boolean; isGuest?: boolean }> {
  // Handle single permission string
  if (typeof permissions === 'string') {
    return await checkUserAccess({
      userId,
      groupId,
      requiredPermissions: [permissions],
      allowGuest
    });
  }

  // First check solo permissions if they exist
  if (typeof permissions === 'object' && !Array.isArray(permissions) && permissions.solo) {
    const soloCheck = await checkUserAccess({
      userId,
      groupId,
      requiredPermissions: permissions.solo,
      allowGuest
    });

    if (soloCheck.hasAccess) {
      return soloCheck;
    }
  }

  // If no solo permissions or they didn't match, check regular permissions
  if (Array.isArray(permissions)) {
    // Legacy array format
    const isOrPermissions = Array.isArray(permissions[0]);
    let accessResult;

    if (isOrPermissions) {
      // Try each permission set until one succeeds
      for (const permissionSet of permissions as string[][]) {
        accessResult = await checkUserAccess({
          userId,
          groupId,
          requiredPermissions: permissionSet,
          allowGuest
        });

        if (accessResult.hasAccess) {
          return accessResult;
        }
      }
      return accessResult || { hasAccess: false, isGuest: false };
    } else {
      // Single permission set - all permissions required
      return await checkUserAccess({
        userId,
        groupId,
        requiredPermissions: permissions as string[],
        allowGuest
      });
    }
  } else {
    // New object format
    let accessResult;

    // Check 'any' conditions (OR)
    if (permissions.any) {
      for (const permissionSet of permissions.any) {
        accessResult = await checkUserAccess({
          userId,
          groupId,
          requiredPermissions: permissionSet,
          allowGuest
        });

        if (accessResult.hasAccess) {
          return accessResult;
        }
      }
    }

    // Check 'all' conditions (AND)
    if (permissions.all) {
      accessResult = await checkUserAccess({
        userId,
        groupId,
        requiredPermissions: permissions.all,
        allowGuest
      });

      if (accessResult.hasAccess) {
        return accessResult;
      }
    }

    return accessResult || { hasAccess: false, isGuest: false };
  }
}

export async function withPermissions<T, P>(
  action: (context: { userId: string; groupId: string }, params: P) => Promise<ActionResult<T>>,
  getActionContext: (params: P) => ActionContext
): Promise<(currentState: any, params: P) => Promise<ActionResult<T>>> {
  return async (currentState: any, params: P): Promise<ActionResult<T>> => {
    try {
      const supabase = await createClient();
      const {
        error: userError,
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || userError || !user.id) {
        // Correctly handle potential AuthError type
        const errorMessage = userError ? userError.message : "You must be logged in to perform this action";
        return { success: false, error: errorMessage };
      }

      const { groupId, moduleId, moduleType, requiredPermissions, allowGuest = false, isCreation = false } = getActionContext(params);

      // For creation operations, we only need to verify group-level permissions
      if (isCreation) {
        if (!groupId) {
          return { error: "Invalid group ID" };
        }

        const accessResult = await checkPermissions(
          user.id,
          groupId,
          requiredPermissions,
          allowGuest
        );

        if (!accessResult.hasAccess) {
          return {
            error: accessResult.isGuest
              ? "You must be a member to perform this action"
              : "You do not have permission to perform this action"
          };
        }

        return action({ userId: user.id, groupId }, params);
      }

      // For edit operations, verify module ownership if moduleId is provided
      let verifiedGroupId = groupId;
      if (moduleId && moduleType) {
        console.log("getting module group id", moduleType, moduleId);
        const moduleGroupId = await getModuleGroupId(moduleType, moduleId);

        if (!moduleGroupId) {
          return { error: `Permission check failed: group id for ${moduleType} module not found` };
        }

        // If groupId was provided, verify it matches
        if (groupId && moduleGroupId !== groupId) {
          return { error: `You do not have permission to access this ${moduleType}` };
        }

        verifiedGroupId = moduleGroupId;
      }

      if (!verifiedGroupId) {
        return { error: "Invalid group ID" };
      }

      // Check all permission types
      const accessResult = await checkPermissions(
        user.id,
        verifiedGroupId,
        requiredPermissions,
        allowGuest
      );

      if (!accessResult.hasAccess) {
        return {
          error: accessResult.isGuest
            ? "You must be a member to perform this action"
            : "You do not have permission to perform this action"
        };
      }

      // Execute the action with the authenticated context
      return action({ userId: user.id, groupId: verifiedGroupId }, params);
    } catch (error) {
      console.error('Error in permission middleware:', error);
      return { error: "An unexpected error occurred" };
    }
  };
} 