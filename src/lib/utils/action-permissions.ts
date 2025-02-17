"use server";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserRoles } from "@/services/user.service";

type ActionContext = {
  groupId: string;
  requiredPermissions: string[];
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

      const { groupId, requiredPermissions } = getActionContext(params);
      
      if (!groupId) {
        return { error: "Invalid group ID" };
      }

      // Get user roles and check permissions
      const userRoles = await getUserRoles({ id: user.id, groupId });
      const userPermissions = userRoles?.reduce((acc: string[], role) => {
        if (role.group_roles?.permissions) {
          return [...acc, ...role.group_roles.permissions];
        }
        return acc;
      }, []) || [];

      const hasPermission = requiredPermissions.every(permission =>
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        return { error: "You do not have permission to perform this action" };
      }

      // Execute the action with the authenticated context
      return action({ userId: user.id, groupId }, params);
    } catch (error) {
      console.error('Error in permission middleware:', error);
      return { error: "An unexpected error occurred" };
    }
  };
} 