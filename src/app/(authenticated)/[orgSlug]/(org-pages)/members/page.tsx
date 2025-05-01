import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import UserTable from "@/app/(authenticated)/[orgSlug]/(org-pages)/members/_components/user-table";
import { permissions } from "@/lib/types/permissions";
import { getOrgMembers } from "@/services/org.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Suspense } from "react";
import MembershipStatusFilter from "./_components/membership-status-filter";
import { ComponentPermission } from "@/components/ComponentPermission";
import { InviteMemberButton } from "./_components/invite-member-button";

async function MembersPage({ org, searchParams, userPermissions }: OrgAccessHOCProps) {
  const _searchParams = await searchParams || {};
  const tab = (_searchParams?.tab || "members") as string;
  const membershipStatus = (_searchParams?.status || "active") as string;
  
  // Handle different membership status filters
  let isActive;
  if (membershipStatus === "all") {
    // Will fetch all members regardless of status
    isActive = undefined;
  } else if (membershipStatus === "inactive") {
    isActive = false;
  } else {
    // Default to active
    isActive = true;
  }
  
  const members = await getOrgMembers({ 
    id: org.id,
    isActive 
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex flex-col space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight">Organization Members</h2>
          <p className="text-muted-foreground">
            Manage members and their access to {org.name}
          </p>
        </div>
        <ComponentPermission requiredPermissions={[permissions.members.invite]}>
          <InviteMemberButton orgId={org.id} orgSlug={org.slug} />
        </ComponentPermission>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Tabs value={tab} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                <TabsTrigger value="members" asChild>
                  <Link href={`/@${org.slug}/members${membershipStatus !== "active" ? `?status=${membershipStatus}` : ""}`}>
                    Members
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="non-members" asChild>
                  <Link href={`/@${org.slug}/members?tab=non-members${membershipStatus !== "active" ? `&status=${membershipStatus}` : ""}`}>
                    Non-Members
                  </Link>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {tab === "members" && (
              <MembershipStatusFilter 
                membershipStatus={membershipStatus} 
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
              <p className="text-sm text-muted-foreground">Loading members...</p>
            </div>
          </div>
        }>
          {tab === "members" && (
            <div className="px-6 pb-6">
              <UserTable 
                users={members} 
                groupRoleId={org.id} 
                membershipStatus={membershipStatus}
              />
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}

export default withOrgAccess(MembersPage, {
  permissions: [permissions.members.view],
  onAccessDenied: {
    action: "error"
  }
});
