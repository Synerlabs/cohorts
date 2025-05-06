import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { permissions } from "@/lib/types/permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Suspense } from "react";
import { ComponentPermission } from "@/components/ComponentPermission";
// Import commented out to hide the button
// import { InviteAffiliateButton } from "./_components/invite-affiliate-button";
import AffiliateTableWrapper from "./_components/affiliate-table-wrapper";
import AffiliateStatusFilter, { 
  type AffiliateStatusFilterType 
} from "./_components/affiliate-status-filter";
import { getOrgAffiliates } from "@/services/affiliate.service";
import { cookies } from 'next/headers';

async function AffiliatesPage({ org, searchParams, userPermissions }: OrgAccessHOCProps) {
  const _searchParams = await searchParams || {};
  const tab = (_searchParams?.tab || "affiliates") as string;
  const affiliateStatus = (_searchParams?.status || "active") as AffiliateStatusFilterType;
  
  // Add a timestamp parameter to force data refreshing
  const timestamp = _searchParams?.timestamp || Date.now();
  
  const affiliates = await getOrgAffiliates({ 
    id: org.id,
    status: affiliateStatus
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex flex-col space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight">Organization Affiliates</h2>
          <p className="text-muted-foreground">
            Manage affiliates and their access to {org.name}
          </p>
        </div>
        {/* Invite Affiliate button commented out as requested */}
        {/*
        <ComponentPermission requiredPermissions={[permissions.memberships.create]}>
          <InviteAffiliateButton orgId={org.id} orgSlug={org.slug} />
        </ComponentPermission>
        */}
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Tabs value={tab} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                <TabsTrigger value="affiliates" asChild>
                  <Link href={`/@${org.slug}/affiliates${affiliateStatus !== "active" ? `?status=${affiliateStatus}` : ""}`}>
                    Affiliates
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="pending" asChild>
                  <Link href={`/@${org.slug}/affiliates?tab=pending${affiliateStatus !== "active" ? `&status=${affiliateStatus}` : ""}`}>
                    Pending
                  </Link>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {tab === "affiliates" && (
              <AffiliateStatusFilter 
                affiliateStatus={affiliateStatus} 
                tab={tab} 
                orgSlug={org.slug}
              />
            )}
          </div>
        </div>

        <Suspense fallback={
          <div className="flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Loading affiliates...</p>
            </div>
          </div>
        }>
          {tab === "affiliates" && (
            <div className="px-6 pb-6">
              <AffiliateTableWrapper 
                affiliates={affiliates} 
                affiliateStatus={affiliateStatus}
                orgId={org.id}
                orgSlug={org.slug}
              />
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}

export default withOrgAccess(AffiliatesPage, {
  permissions: [permissions.memberships.view],
  onAccessDenied: {
    action: "error"
  }
}); 