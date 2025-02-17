import { redirect, notFound } from "next/navigation";
import React from "react";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { getUserRoles, getGroupUser } from "@/services/user.service";
import { Camelized } from "humps";
import { Database, Tables } from "@/lib/types/database.types";
import { PageProps } from "../types/next";
import { User } from "@supabase/auth-helpers-nextjs";
import { getCachedOrgBySlug, getCachedCurrentUser } from "@/lib/utils/cache";

type GroupRole = Database["public"]["Tables"]["group_roles"]["Row"];
type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];

export type OrgAccessOptions = {
  permissions?: string[];
  allowGuest?: boolean;
  redirectUnauthenticated?: string | ((params: any) => Promise<string>) | ((params: any) => string);
  onAccessDenied?: {
    action: 'redirect' | 'error';
    // For redirect action
    redirectTo?: string | ((params: any) => Promise<string>) | ((params: any) => string);
    // For error action
    errorComponent?: React.ComponentType<{
      isGuest: boolean;
      requiredPermissions?: string[];
      userPermissions: string[];
    }>;
  };
};

export type OrgAccessHOCProps = {
  org: Camelized<Tables<"group">>;
  user?: User;
  isGuest: boolean;
  userRoles?: (UserRole & { group_roles: GroupRole | null })[];
  groupUser?: { id: string; isActive: boolean } | null;
  userPermissions: string[];
} & PageProps;

// Default error component for access denied
function DefaultAccessDenied({ 
  isGuest, 
  requiredPermissions,
  userPermissions 
}: { 
  isGuest: boolean; 
  requiredPermissions?: string[];
  userPermissions: string[];
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
      <p className="text-muted-foreground mb-2">
        {isGuest 
          ? "You must be a member to access this page." 
          : "You don't have the required permissions to access this page."}
      </p>
      {!isGuest && requiredPermissions && (
        <div className="text-sm text-muted-foreground">
          <p>Required permissions:</p>
          <ul className="list-disc list-inside">
            {requiredPermissions.map(perm => (
              <li key={perm} className={userPermissions.includes(perm) ? "text-green-600" : "text-red-600"}>
                {perm}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function withOrgAccess(Component: any, options?: OrgAccessOptions) {
  const { 
    permissions: requiredPermissions, 
    allowGuest, 
    redirectUnauthenticated,
    onAccessDenied = { action: 'redirect' }
  } = options || {};

  return async function WithOrgAccess(props: any) {
    const AuthServerContext = getAuthenticatedServerContext();
    const params = await props.params;

    // Check org exists first
    if (!AuthServerContext.org) {
      const { orgSlug } = params;
      const slug = decodeURIComponent(orgSlug).replace(/^@/, "");
      const response = await getCachedOrgBySlug(slug);
      if (response.error || !response.data) {
        console.error(`withOrgAccess - ${slug} not found`, response);
        return notFound();
      }
      AuthServerContext.org = response.data;
    }

    // Check authentication after we have the org
    if (!AuthServerContext.user) {
      const response = await getCachedCurrentUser();
      if ((response.error || !response.data?.user) && !allowGuest) {
        redirect(`/@${AuthServerContext.org.slug}`);
      }
      if (response && response.data && response.data.user) {
        AuthServerContext.user = response.data.user;
      }
    }

    const [userRoles, groupUser] = await Promise.all([
      AuthServerContext.user
        ? getUserRoles({ id: AuthServerContext.user.id, groupId: AuthServerContext.org.id })
        : [],
      AuthServerContext.user
        ? getGroupUser({ userId: AuthServerContext.user.id, groupId: AuthServerContext.org.id })
        : null,
    ]);

    // Update AuthServerContext with org-specific roles and permissions
    AuthServerContext.groupRoles = userRoles || [];
    AuthServerContext.userPermissions =
      userRoles?.reduce((acc: string[], role) => {
        if (role.group_roles?.permissions) {
          return [...acc, ...role.group_roles.permissions];
        }
        return acc;
      }, []) || [];

    const isGuest =
      !userRoles?.find((role) => role.is_active) &&
      (!groupUser || !groupUser.isActive);

    // Check access permissions
    let hasRequiredPermissions = true;
    if (requiredPermissions && requiredPermissions.length > 0) {
      hasRequiredPermissions = requiredPermissions.every(permission =>
        AuthServerContext.userPermissions.includes(permission)
      );
    }

    // Determine if user should have access
    const shouldHaveAccess = (
      // Either guest access is allowed or user is not a guest
      (allowGuest || !isGuest) &&
      // And user has required permissions (if any)
      hasRequiredPermissions
    );

    if (!shouldHaveAccess) {
      console.warn(
        `Access denied:`,
        isGuest ? 'User is guest' : 'User lacks permissions:',
        requiredPermissions?.join(', ')
      );

      if (onAccessDenied.action === 'redirect') {
        const redirectPath = typeof onAccessDenied.redirectTo === 'function'
          ? await onAccessDenied.redirectTo(params)
          : onAccessDenied.redirectTo || `/@${AuthServerContext.org.slug}`;
        redirect(redirectPath);
      } else {
        const ErrorComponent = onAccessDenied.errorComponent || DefaultAccessDenied;
        return (
          <ErrorComponent
            isGuest={isGuest}
            requiredPermissions={requiredPermissions}
            userPermissions={AuthServerContext.userPermissions}
          />
        );
      }
    }

    return (
      <Component
        user={AuthServerContext.user}
        org={AuthServerContext.org}
        isGuest={isGuest}
        userRoles={userRoles}
        groupUser={groupUser}
        userPermissions={AuthServerContext.userPermissions}
        params={params}
        {...props}
      />
    );
  };
}
