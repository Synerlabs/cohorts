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
import { createClient } from "@/lib/utils/supabase/server";
import { activatePendingMemberships } from "@/actions/member.actions";

type GroupRole = Database["public"]["Tables"]["group_roles"]["Row"];
type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];

export type OrgAccessOptions = {
  permissions?: string | string[] | string[][] | { 
    any?: string[][],     // OR conditions
    all?: string[],       // AND conditions
    solo?: string[]       // Override permissions - any of these grants access
  };
  allowGuest?: boolean;
  redirectUnauthenticated?: string | ((params: any) => Promise<string>) | ((params: any) => string);
  onAccessDenied?: {
    action: 'redirect' | 'error';
    // For redirect action
    redirectTo?: string | ((params: any) => Promise<string>) | ((params: any) => string);
    // For error action
    errorComponent?: React.ComponentType<{
      isGuest: boolean;
      requiredPermissions?: string | string[] | string[][] | { 
        any?: string[][],
        all?: string[],
        solo?: string[]
      };
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
  requiredPermissions?: string | string[] | string[][] | { 
    any?: string[][],
    all?: string[],
    solo?: string[]
  };
  userPermissions: string[];
}) {
  const renderPermissions = () => {
    if (!requiredPermissions) return null;

    if (typeof requiredPermissions === 'string') {
      return (
        <li key={requiredPermissions} className={userPermissions.includes(requiredPermissions) ? "text-green-600" : "text-red-600"}>
          {requiredPermissions}
        </li>
      );
    }

    if (Array.isArray(requiredPermissions)) {
      if (requiredPermissions.length === 0) return null;
      if (Array.isArray(requiredPermissions[0])) {
        // OR conditions
        return (requiredPermissions as string[][]).map((permSet: string[], i: number) => (
          <li key={`set-${i}`} className="mb-2">
            <span className="font-medium">Any of:</span>
            <ul className="ml-4 list-disc">
              {permSet.map((perm: string) => (
                <li key={`perm-${perm}`} className={userPermissions.includes(perm) ? "text-green-600" : "text-red-600"}>
                  {perm}
                </li>
              ))}
            </ul>
          </li>
        ));
      }
      // AND conditions
      return (requiredPermissions as string[]).map((perm: string) => (
        <li key={`perm-${perm}`} className={userPermissions.includes(perm) ? "text-green-600" : "text-red-600"}>
          {perm}
        </li>
      ));
    }

    // Object format
    return (
      <>
        {requiredPermissions.solo && (
          <li key="solo" className="mb-2">
            <span className="font-medium">Solo (Override) Permissions:</span>
            <ul className="ml-4 list-disc">
              {requiredPermissions.solo.map((perm: string) => (
                <li key={`solo-${perm}`} className={userPermissions.includes(perm) ? "text-green-600" : "text-red-600"}>
                  {perm}
                </li>
              ))}
            </ul>
          </li>
        )}
        {requiredPermissions.any && (
          <li key="any" className="mb-2">
            <span className="font-medium">Any of these sets:</span>
            <ul className="ml-4 list-disc">
              {requiredPermissions.any.map((permSet: string[], i: number) => (
                <li key={`any-set-${i}`}>
                  <ul className="list-disc ml-4">
                    {permSet.map((perm: string) => (
                      <li key={`any-${perm}`} className={userPermissions.includes(perm) ? "text-green-600" : "text-red-600"}>
                        {perm}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </li>
        )}
        {requiredPermissions.all && (
          <li key="all" className="mb-2">
            <span className="font-medium">All of these:</span>
            <ul className="ml-4 list-disc">
              {requiredPermissions.all.map((perm: string) => (
                <li key={`all-${perm}`} className={userPermissions.includes(perm) ? "text-green-600" : "text-red-600"}>
                  {perm}
                </li>
              ))}
            </ul>
          </li>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
      <p className="text-muted-foreground mb-2">
        {isGuest 
          ? "You must be a member to access this page." 
          : "You don't have the required permissions to access this page."}
      </p>
      {requiredPermissions && (
        <div className="text-sm text-muted-foreground">
          <p>Required permissions:</p>
          <ul className="list-disc list-inside mt-2">
            {renderPermissions()}
          </ul>
        </div>
      )}
    </div>
  );
}

export function withOrgAccess(Component: any, options?: OrgAccessOptions) {
  const { 
    permissions: requiredPermissions = [], 
    allowGuest = false, 
    redirectUnauthenticated,
    onAccessDenied = { action: 'redirect' }
  } = options || {};

  return async function WithOrgAccess(props: any) {
    const AuthServerContext = getAuthenticatedServerContext();
    const params = await props.params;
    const searchParams = props.searchParams ? await props.searchParams : {};

    // Check org exists first
    if (!AuthServerContext.org) {
      const { orgSlug } = params || {};
      const slug = decodeURIComponent(orgSlug).replace(/^@/, "");
      console.log('slug', slug);
      const response = await getCachedOrgBySlug(slug);
      if (response?.error || !response?.data) {
        console.error(`withOrgAccess - ${slug} not found`, response);
        return notFound();
      }
      AuthServerContext.org = response.data;
    }

    // Check authentication after we have the org
    if (!AuthServerContext.user) {
      const response = await getCachedCurrentUser();
      
      // Check if this looks like an activation/invite redirect (has relevant search params)
      const hasActivationParams = searchParams.code || searchParams.token_hash || 
                                 searchParams.type || searchParams.access_token ||
                                 searchParams.error_description || searchParams.firstLogin;
      
      // Only redirect unauthenticated users if:
      // 1. Guests are not allowed, OR
      // 2. This appears to be an activation/invite redirect (has search params suggesting auth flow)
      if ((response.error || !response.data?.user) && (!allowGuest || hasActivationParams)) {
        redirect(`/@${AuthServerContext.org.slug}`);
      }
      if (response && response.data && response.data.user) {
        AuthServerContext.user = response.data.user;
        
        // ** Call activation action here after confirming user **
        try {
          console.log(`Calling activatePendingMemberships for user ${AuthServerContext.user.id}`);
          await activatePendingMemberships(AuthServerContext.user.id);
          // We don't necessarily need to handle the result unless we want to show a specific error
          // The action logs errors internally
        } catch (activationError) {
           console.error("Error calling activatePendingMemberships from withOrgAccess:", activationError);
           // Decide if this error should block page load or just be logged
        }
      }
    }

    // If no authenticated user and guests aren't allowed, redirect
    // But also check if this looks like an activation/invite redirect
    const hasActivationParams = searchParams.code || searchParams.token_hash || 
                               searchParams.type || searchParams.access_token ||
                               searchParams.error_description || searchParams.firstLogin;
    
    if (!AuthServerContext.user && (!allowGuest || hasActivationParams)) {
      redirect(`/@${AuthServerContext.org.slug}`);
    }

    // Check permissions if we have a user
    // Make sure activation is also called if user was already in context
    if (AuthServerContext.user) {
       // Check if activation was already called above; avoid redundant calls if necessary,
       // though the action is idempotent. For simplicity, call it again if user exists.
       try {
          console.log(`Calling activatePendingMemberships for user ${AuthServerContext.user.id} (already in context)`);
          await activatePendingMemberships(AuthServerContext.user.id);
        } catch (activationError) {
           console.error("Error calling activatePendingMemberships from withOrgAccess (user already in context):", activationError);
        }

      const [accessResult, groupUser] = await Promise.all([
         checkUserAccess({
           userId: AuthServerContext.user.id,
           groupId: AuthServerContext.org.id,
           requiredPermissions,
           allowGuest: true 
         }),
        getGroupUser({ userId: AuthServerContext.user.id, groupId: AuthServerContext.org.id })
      ]);

      // Check if the user has membership roles
      const supabase = await createClient();
      const { data: membershipRoles } = await supabase
        .from('membership_roles_view')
        .select('*')
        .eq('user_id', AuthServerContext.user?.id || '')
        .eq('group_id', AuthServerContext.org.id)
        .eq('membership_status', 'active');

      const hasMembershipRoles = !!(membershipRoles && membershipRoles.length > 0);
      
      // console.log("DEBUG - withOrgAccess membership check:", {
      //   hasMembershipRoles,
      //   membershipRolesCount: membershipRoles?.length || 0
      // });

      // console.log("DEBUG - withOrgAccess options:", {
      //   allowGuest,
      //   requiredPermissions,
      //   onAccessDenied
      // });

      // console.log("DEBUG - withOrgAccess permissions check:", {
      //   requiredPermissions,
      //   userPermissions: accessResult.userPermissions,
      //   hasAccess: accessResult.hasAccess,
      //   isGuest: accessResult.isGuest
      // });

      // Update AuthServerContext with org-specific roles and permissions
      AuthServerContext.groupRoles = accessResult.userRoles;
      AuthServerContext.userPermissions = accessResult.userPermissions;

      // If the user has the required permissions, they should have access
      // regardless of guest status if they have membership roles
      const hasRequiredPermissions = accessResult.hasAccess || 
        (accessResult.userPermissions.some(p => {
          if (typeof requiredPermissions === 'string') {
            return p === requiredPermissions;
          } else if (Array.isArray(requiredPermissions)) {
            if (requiredPermissions.length === 0) return true;
            if (!Array.isArray(requiredPermissions[0])) {
              return (requiredPermissions as string[]).includes(p);
            }
          }
          return false;
        }));

      // console.log("DEBUG - withOrgAccess additional check:", {
      //   hasRequiredPermissions,
      //   userHasPermission: accessResult.userPermissions.some(p => {
      //     if (typeof requiredPermissions === 'string') {
      //       return p === requiredPermissions;
      //     } else if (Array.isArray(requiredPermissions)) {
      //       if (requiredPermissions.length === 0) return true;
      //       if (!Array.isArray(requiredPermissions[0])) {
      //         return (requiredPermissions as string[]).includes(p);
      //       }
      //     }
      //     return false;
      //   })
      // });

      // Override accessResult.hasAccess if the user has the required permissions
      // and membership roles
      if (!accessResult.hasAccess && hasRequiredPermissions && hasMembershipRoles) {
        accessResult.hasAccess = true;
        accessResult.isGuest = false; // Users with membership roles are not guests
        console.log("DEBUG - Overriding hasAccess to true based on membership roles and permissions");
      }

      if (!accessResult.hasAccess) {
        console.warn(
          `Access denied for org ${AuthServerContext.org.slug}:`,
          accessResult.isGuest ? 'User is guest' : 'User lacks permissions:',
          typeof requiredPermissions === 'object' && !Array.isArray(requiredPermissions)
            ? JSON.stringify(requiredPermissions)
            : Array.isArray(requiredPermissions)
              ? requiredPermissions.join(', ')
              : requiredPermissions
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
    } else {
       // Handle case where there's no user but guests are allowed (no activation needed)
       const accessResult = { hasAccess: allowGuest, isGuest: true, userPermissions: [], userRoles: [] };
       const groupUser = null;
        
       // Perform access check for guest based on allowGuest
       if (!accessResult.hasAccess) {
          console.warn(
            `Access denied for guest on org ${AuthServerContext.org.slug}: Guests not allowed.`
          );
          // Apply access denied logic (redirect or error component)
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
       } else {
          // Render component for guest if access is allowed
          return (
            <Component
              user={null} // No user for guest
              org={AuthServerContext.org}
              isGuest={accessResult.isGuest}
              userRoles={accessResult.userRoles}
              groupUser={groupUser}
              userPermissions={accessResult.userPermissions}
              params={params}
              {...props}
            />
          );
       }
    }
  };
}
