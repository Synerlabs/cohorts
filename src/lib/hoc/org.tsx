import { redirect, notFound } from "next/navigation";
import React from "react";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { getGroupUser } from "@/services/user.service";
import { Camelized } from "humps";
import { Database, Tables } from "@/lib/types/database.types";
import { PageProps } from "../types/next";
import { User } from "@supabase/auth-helpers-nextjs";
import { getCachedOrgBySlug, getCachedCurrentUser } from "@/lib/utils/cache";
import { checkUserAccess } from "@/lib/utils/permissions";

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
    permissions: requiredPermissions = [], 
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

    // If no authenticated user and guests aren't allowed, redirect
    if (!AuthServerContext.user && !allowGuest) {
      redirect(`/@${AuthServerContext.org.slug}`);
    }

    // Check permissions if we have a user
    const [accessResult, groupUser] = await Promise.all([
      AuthServerContext.user ? checkUserAccess({
        userId: AuthServerContext.user.id,
        groupId: AuthServerContext.org.id,
        requiredPermissions,
        allowGuest
      }) : {
        hasAccess: allowGuest,
        isGuest: true,
        userPermissions: [],
        userRoles: []
      },
      AuthServerContext.user
        ? getGroupUser({ userId: AuthServerContext.user.id, groupId: AuthServerContext.org.id })
        : null,
    ]);

    // Update AuthServerContext with org-specific roles and permissions
    AuthServerContext.groupRoles = accessResult.userRoles;
    AuthServerContext.userPermissions = accessResult.userPermissions;

    if (!accessResult.hasAccess) {
      console.warn(
        `Access denied for org ${AuthServerContext.org.slug}:`,
        accessResult.isGuest ? 'User is guest' : 'User lacks permissions:',
        requiredPermissions.join(', ')
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
            isGuest={accessResult.isGuest}
            requiredPermissions={requiredPermissions}
            userPermissions={accessResult.userPermissions}
          />
        );
      }
    }

    return (
      <Component
        user={AuthServerContext.user}
        org={AuthServerContext.org}
        isGuest={accessResult.isGuest}
        userRoles={accessResult.userRoles}
        groupUser={groupUser}
        userPermissions={accessResult.userPermissions}
        params={params}
        {...props}
      />
    );
  };
}
