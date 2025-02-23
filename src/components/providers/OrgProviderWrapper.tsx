'use client'

import { OrgProvider } from "@/lib/context/OrgContext";
import { ReactNode } from "react";
import type { Database } from "@/lib/types/database.types";

type Group = Database['public']['Tables']['group']['Row'];
type OrgPermissions = {
  permissions: string[];
  roles: {
    id: string;
    group_roles: {
      id: string;
      role_name: string | null;
      permissions: string[] | null;
      is_super_admin: boolean;
    } | null;
  }[];
};

interface OrgProviderWrapperProps {
  children: ReactNode;
  org: Group;
  groupPermissions: OrgPermissions;
}

export function OrgProviderWrapper({
  children,
  org,
  groupPermissions,
}: OrgProviderWrapperProps) {
  return (
    <OrgProvider org={org} groupPermissions={groupPermissions}>
      {children}
    </OrgProvider>
  );
} 