import { redirect } from "next/navigation";
import React from "react";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { AuthHOCProps, withAuth } from "@/lib/hoc/auth";
import { getOrgBySlug } from "@/services/org.service";
import { getUserOrgs, getUserRoles, getGroupUser } from "@/services/user.service";
import { Camelized } from "humps";
import { Tables } from "@/lib/types/database.types";

export type OrgAccessHOCProps = {
  org: Camelized<Tables<"group">>;
  user?: User;
  isGuest: boolean;
  userRoles?: Array<{ isActive: boolean }>;
  groupUser?: { id: string; isActive: boolean } | null;
};

export type OrgAccessOptions = {
  permissions?: string[];
  allowGuest?: boolean;
  redirectUnauthenticated?: string;
};

export function withOrgAccess(Component: any, options?: OrgAccessOptions) {
  const { permissions, allowGuest, redirectUnauthenticated } = options || {};
  async function WithOrgAccess({ user, params, ...props }: AuthHOCProps) {
    const AuthServerContext = getAuthenticatedServerContext();

    if (!AuthServerContext.org) {
      const { orgSlug } = params;
      const slug = decodeURIComponent(orgSlug).replace("@", "");
      const response = await getOrgBySlug(slug);
      if (response.error || !response.data) {
        console.log(`withOrgAccess - redirect`);
        redirect("/");
      }
      AuthServerContext.org = response.data;
    }

    if (redirectUnauthenticated && !user) {
      redirect(redirectUnauthenticated);
    }

    const [userRoles, groupUser] = await Promise.all([
      user ? getUserRoles({ id: user.id, groupId: AuthServerContext.org.id }) : [],
      user ? getGroupUser({ userId: user.id, groupId: AuthServerContext.org.id }) : null
    ]);

    const isGuest = !userRoles?.find((role) => role.isActive) && 
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
