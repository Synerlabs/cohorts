import { redirect, notFound } from "next/navigation";
import React from "react";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { AuthHOCProps, withAuth } from "@/lib/hoc/auth";
import { getOrgBySlug } from "@/services/org.service";
import { getUserRoles, getGroupUser } from "@/services/user.service";
import { Camelized } from "humps";
import { Database, Tables } from "@/lib/types/database.types";
import { PageProps } from "../types/next";
import { User } from "@supabase/auth-helpers-nextjs";

type GroupRole = Database["public"]["Tables"]["group_roles"]["Row"];
type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];

export type OrgAccessHOCProps = {
  org: Camelized<Tables<"group">>;
  user?: User;
  isGuest: boolean;
  userRoles?: (UserRole & { group_roles: GroupRole | null })[];
  groupUser?: { id: string; isActive: boolean } | null;
} & PageProps;

export type OrgAccessOptions = {
  permissions?: string[];
  allowGuest?: boolean;
  redirectUnauthenticated?: string;
};

export function withOrgAccess(Component: any, options?: OrgAccessOptions) {
  const { permissions, allowGuest, redirectUnauthenticated } = options || {};

  async function WithOrgAccess({ user, params: paramsPromise, ...props }: AuthHOCProps) {
    const AuthServerContext = getAuthenticatedServerContext();
    const params = await paramsPromise;

    if (!AuthServerContext.org) {
      const { orgSlug } = params;
      console.log("ORG SLUG", orgSlug);
      const slug = decodeURIComponent(orgSlug).replace(/^@/, "");
      console.log("GETTING ORG BY SLUG", slug);
      const response = await getOrgBySlug(slug);
      if (response.error || !response.data) {
        console.log(`withOrgAccess - not found`, response);
        return notFound();
      }
      AuthServerContext.org = response.data;
    }

    if (!user && !allowGuest) {
      redirect(`/@${AuthServerContext.org.slug}`);
    }

    const [userRoles, groupUser] = await Promise.all([
      user
        ? getUserRoles({ id: user.id, groupId: AuthServerContext.org.id })
        : [],
      user
        ? getGroupUser({ userId: user.id, groupId: AuthServerContext.org.id })
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
        user={user}
        org={AuthServerContext.org}
        isGuest={isGuest}
        userRoles={userRoles}
        groupUser={groupUser}
        params={params}
        {...props}
      />
    );
  }

  return withAuth(WithOrgAccess, { allowGuest });
}
