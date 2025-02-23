import { createClient } from "@/lib/utils/supabase/server";
import { getUserRoles } from "@/services/user.service";
import { notFound } from "next/navigation";
import { ReactNode } from "react";
import { OrgProviderWrapper } from "@/components/providers/OrgProviderWrapper";

interface OrgLayoutProps {
  children: ReactNode;
  params: Promise<{ orgSlug: string }>;
}

async function getOrgData(orgSlug: string) {
  // Decode and sanitize the slug
  const decodedSlug = decodeURIComponent(orgSlug);
  const sanitizedSlug = decodedSlug.startsWith('@') ? decodedSlug.slice(1) : decodedSlug;
  
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // Get org by slug
  const { data: org } = await supabase
    .from("group")
    .select("*")
    .eq("slug", sanitizedSlug)
    .single();

  if (!org) {
    return null;
  }

  // Get user roles for this org
  const roles = await getUserRoles({ id: user.id, groupId: org.id });
  
  // Extract permissions
  const permissions = roles.reduce((acc: string[], role) => {
    if (role.is_active) {
      if (role.group_roles?.is_super_admin) {
        return [...acc, '*'];
      }
      if (role.group_roles?.permissions) {
        return [...acc, ...role.group_roles.permissions];
      }
    }
    return acc;
  }, []);

  return {
    org,
    groupPermissions: {
      permissions,
      roles: roles.map(role => ({
        id: role.id,
        group_roles: role.group_roles ? {
          id: role.group_roles.id,
          role_name: role.group_roles.role_name,
          permissions: role.group_roles.permissions,
          is_super_admin: role.group_roles.is_super_admin
        } : null
      }))
    }
  };
}

export default async function OrgLayout({
  children,
  params,
}: OrgLayoutProps) {
  const { orgSlug } = await params;
  const data = await getOrgData(orgSlug);
  
  if (!data) {
    return notFound();
  }

  return (
    <OrgProviderWrapper 
      org={data.org}
      groupPermissions={data.groupPermissions}
    >
      {children}
    </OrgProviderWrapper>
  );
}