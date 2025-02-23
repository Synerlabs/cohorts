"use server";
import { createClient } from "@/lib/utils/supabase/server";
import { checkUserAccess } from "@/lib/utils/permissions";

type ModuleType = 'role' | 'group' | 'form_template' | 'membership' | 'user_role' | 'membership_tier' | 'applications' | 'payments' | 'paymentGateways';

type ActionContext = {
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

type ActionResult<T> = {
  success?: boolean;
  error?: string | any;
  data?: T;
};

async function getModuleGroupId(moduleType: ModuleType, moduleId: string): Promise<string | null> {
  const supabase = await createClient();
  
  switch (moduleType) {
    case 'role':
      const { data: role } = await supabase
        .from("group_roles")
        .select("group_id")
        .eq("id", moduleId)
        .single();
      return role?.group_id || null;
      
    case 'form_template':
      const { data: form } = await supabase
        .from("form_templates")
        .select("org_id")
        .eq("id", moduleId)
        .single();
      return form?.org_id || null;
      
    case 'membership':
      const { data: membership } = await supabase
        .from("memberships")
        .select("group_id")
        .eq("id", moduleId)
        .single();
      return membership?.group_id || null;

    case 'applications':
      const { data: application } = await supabase
        .from("membership_applications_view")
        .select("group_id")
        .eq("id", moduleId)
        .single();
      return application?.group_id || null;

    case 'payments':
      const { data: payment } = await supabase
        .from("payments")
        .select("group_id")
        .eq("id", moduleId)
        .single();
      return payment?.group_id || null;

    case 'paymentGateways':
      const { data: gateway } = await supabase
        .from("group_payment_gateways")
        .select("group_id")
        .eq("id", moduleId)
        .single();
      return gateway?.group_id || null;

    case 'membership_tier':
      const { data: tier } = await supabase
        .from("products")
        .select("group_id")
        .eq("id", moduleId)
        .eq("type", "membership_tier")
        .single();
      return tier?.group_id || null;

    case 'user_role':
      // First get the group role ID
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("group_role_id")
        .eq("id", moduleId)
        .single();
      console.log("userRole", userRole);
      if (!userRole?.group_role_id) return null;
      // Then get the group ID from the role
      const { data: groupRole } = await supabase
        .from("group_roles")
        .select("group_id")
        .eq("id", userRole.group_role_id)
        .single();

      return groupRole?.group_id || null;
      
    default:
      return null;
  }
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
        return { error: userError || "You must be logged in to perform this action" };
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
        const moduleGroupId = await getModuleGroupId(moduleType, moduleId);
        
        if (!moduleGroupId) {
          return { error: `Permission check failed: groupd id for ${moduleType} module not found` };
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