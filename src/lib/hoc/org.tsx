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

export type OrgAccessHOCProps = {
  org: Camelized<Tables<"group">>;
  user?: User;
  isGuest: boolean;
  userRoles?: (UserRole & { group_roles: GroupRole | null })[];
  groupUser?: { id: string; isActive: boolean } | null;
  userPermissions: string[];
} & PageProps;

export type OrgAccessOptions = {
  permissions?: string[];
  allowGuest?: boolean;
  redirectUnauthenticated?: string;
};

export function withOrgAccess(Component: any, options?: OrgAccessOptions) {
  const { permissions, allowGuest, redirectUnauthenticated } = options || {};

  return async function WithOrgAccess(props: any) {
    const AuthServerContext = getAuthenticatedServerContext();
    const params = await props.params;

    // Check org exists first
    if (!AuthServerContext.org) {
      const { orgSlug } = params;
      const slug = decodeURIComponent(orgSlug).replace(/^@/, "");
      const response = await getCachedOrgBySlug(slug);
      if (response.error || !response.data) {
        console.error(`withOrgAccess - not found`, response);
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

    if (!allowGuest && isGuest) {
      // Your existing guest handling logic
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
  }
}
