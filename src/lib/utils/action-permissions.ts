"use server";
import { createClient } from "@/lib/utils/supabase/server";
import { checkUserAccess } from "@/lib/utils/permissions";

type ModuleType = 'role' | 'group' | 'form' | 'membership';

type ActionContext = {
  groupId?: string;
  moduleId?: string;
  moduleType?: ModuleType;
  requiredPermissions: string[];
  allowGuest?: boolean;
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
      
    case 'form':
      const { data: form } = await supabase
        .from("forms")
        .select("group_id")
        .eq("id", moduleId)
        .single();
      return form?.group_id || null;
      
    case 'membership':
      const { data: membership } = await supabase
        .from("memberships")
        .select("group_id")
        .eq("id", moduleId)
        .single();
      return membership?.group_id || null;
      
    default:
      return null;
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

      const { groupId, moduleId, moduleType, requiredPermissions, allowGuest = false } = getActionContext(params);
      
      // If we have a moduleId and moduleType, verify the module belongs to the specified group
      let verifiedGroupId = groupId;
      if (moduleId && moduleType) {
        const moduleGroupId = await getModuleGroupId(moduleType, moduleId);
        
        if (!moduleGroupId) {
          return { error: `${moduleType} not found` };
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

      // Check permissions using the shared utility
      const accessResult = await checkUserAccess({
        userId: user.id,
        groupId: verifiedGroupId,
        requiredPermissions,
        allowGuest
      });

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