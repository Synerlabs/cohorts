import { redirect } from "next/navigation";
import React from "react";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { AuthHOCProps, withAuth } from "@/lib/hoc/auth";
import { getOrgBySlug } from "@/services/org.service";
import { getUserOrgs, getUserRoles } from "@/services/user.service";

export type OrgAccessHOCProps = {
  org: any;
} & AuthHOCProps;

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

    if (!allowGuest) {
      const userGroups = await getUserOrgs({ id: user.id });

      if (!userGroups.includes(AuthServerContext.org.id)) {
        // redirect(`/@${AuthServerContext.org.slug}/join`);
      }

      const userRoles = await getUserRoles({
        id: user.id,
        groupId: AuthServerContext.org.id,
      });

      const roles = userRoles.map((role) => role.groupRoles);
      const userPermissions = roles.reduce((acc: string[], role) => {
        if (!role?.permissions) return acc;
        return [...acc, ...role.permissions];
      }, []);
      AuthServerContext.userPermissions = userPermissions;
      if (permissions && permissions.length > 0) {
        if (
          !userPermissions?.some((permission) =>
            permissions.includes(permission),
          )
        ) {
          return <h1>You do not have permission to view this page</h1>;
        }
      }
    }

    return (
      <Component
        user={user}
        org={AuthServerContext.org}
        params={params}
        {...props}
      />
    );
  }

  return withAuth(WithOrgAccess, { allowGuest });
}
