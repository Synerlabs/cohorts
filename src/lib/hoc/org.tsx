import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";
import React from "react";
import { User } from "@supabase/auth-js";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { AuthHOCProps, withAuth } from "@/lib/hoc/auth";

export type OrgAccessHOCProps = {
  org: any;
} & AuthHOCProps;

export function withOrgAccess(Component: any) {
  async function WithOrgAccess({ user, params, ...props }: AuthHOCProps) {
    const AuthServerContext = getAuthenticatedServerContext();

    if (!AuthServerContext.org) {
      const supabase = createClient();
      const { orgSlug } = params;
      const slug = decodeURIComponent(orgSlug).replace("@", "");
      const { data, error } = await supabase
        .from("group")
        .select("name")
        .eq("slug", slug)
        .single();
      AuthServerContext.org = data;
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
