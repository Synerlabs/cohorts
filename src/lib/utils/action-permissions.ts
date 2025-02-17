"use server";
import { createClient } from "@/lib/utils/supabase/server";
import { checkUserAccess } from "@/lib/utils/permissions";

type ActionContext = {
  groupId: string;
  requiredPermissions: string[];
  allowGuest?: boolean;
};

type ActionResult<T> = {
  success?: boolean;
  error?: string | any;
  data?: T;
};

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

      const { groupId, requiredPermissions, allowGuest = false } = getActionContext(params);
      
      if (!groupId) {
        return { error: "Invalid group ID" };
      }

      // Check permissions using the shared utility
      const accessResult = await checkUserAccess({
        userId: user.id,
        groupId,
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
      return action({ userId: user.id, groupId }, params);
    } catch (error) {
      console.error('Error in permission middleware:', error);
      return { error: "An unexpected error occurred" };
    }
  };
} 