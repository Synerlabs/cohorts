"use client";

import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/PermissionGuard";
import { permissions } from "@/lib/types/permissions";
import { PlusCircle } from "lucide-react";
import OrganizationTierDialog from "./OrganizationTierDialog";

export function AffiliationsHeader() {
  const router = useRouter();
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug.startsWith('@') ? params.orgSlug.substring(1) : params.orgSlug;

  return (
    <div className="flex flex-wrap items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization Affiliations</h1>
        <p className="text-muted-foreground">
          Manage organization hierarchy and affiliate relationships
        </p>
      </div>
      <div className="flex gap-2">
        <PermissionGuard permission={permissions.memberships.create}>
          <OrganizationTierDialog orgId={orgSlug}>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Tier
            </Button>
          </OrganizationTierDialog>
        </PermissionGuard>
      </div>
    </div>
  );
} 