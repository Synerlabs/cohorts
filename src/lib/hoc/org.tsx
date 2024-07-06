import { redirect } from "next/navigation";
import React from "react";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { AuthHOCProps, withAuth } from "@/lib/hoc/auth";
import { getOrgBySlug } from "@/services/org.service";

export type OrgAccessHOCProps = {
  org: any;
} & AuthHOCProps;

export function withOrgAccess(Component: any) {
  async function WithOrgAccess({ user, params, ...props }: AuthHOCProps) {
    const AuthServerContext = getAuthenticatedServerContext();

    if (!AuthServerContext.org) {
      const { orgSlug } = params;
      const slug = decodeURIComponent(orgSlug).replace("@", "");
      const response = await getOrgBySlug(slug);
      if (response.error || !response.data) {
        redirect("/");
      }
      AuthServerContext.org = response.data;
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

  return withAuth(WithOrgAccess);
}
