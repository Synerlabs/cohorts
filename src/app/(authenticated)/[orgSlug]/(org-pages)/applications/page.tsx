import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { permissions } from "@/lib/types/permissions";
import { getPendingApplications, getApprovedApplications, getRejectedApplications, getPendingPaymentApplications } from "@/services/applications.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Suspense } from "react";
import { ApplicationsTable } from "./_components/applications-table";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function ApplicationsPage({ org, searchParams, userPermissions }: OrgAccessHOCProps) {
  const _searchParams = await searchParams || {};
  const tab = (_searchParams?.tab || "pending") as string;

  let applications;
  switch (tab) {
    case "approved":
      applications = await getApprovedApplications(org.id);
      break;
    case "pending_payment":
      applications = await getPendingPaymentApplications(org.id);
      break;
    case "rejected":
      applications = await getRejectedApplications(org.id);
      break;
    default:
      applications = await getPendingApplications(org.id);
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="text-sm text-muted-foreground">
            Review and manage membership applications.
          </p>
        </div>

        <Tabs value={tab} className="w-[400px]">
          <TabsList>
            <TabsTrigger value="pending" asChild>
              <Link href={`/@${org.slug}/applications`}>Pending</Link>
            </TabsTrigger>
            <TabsTrigger value="pending_payment" asChild>
              <Link href={`/@${org.slug}/applications?tab=pending_payment`}>
                Pending Payment
              </Link>
            </TabsTrigger>
            <TabsTrigger value="approved" asChild>
              <Link href={`/@${org.slug}/applications?tab=approved`}>
                Approved
              </Link>
            </TabsTrigger>
            <TabsTrigger value="rejected" asChild>
              <Link href={`/@${org.slug}/applications?tab=rejected`}>
                Rejected
              </Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Suspense fallback={<div>Loading...</div>}>
          <ApplicationsTable 
            applications={applications} 
            showActions={tab === "pending"} 
            userPermissions={userPermissions}
          />
        </Suspense>
      </div>
    </>
  );
}

export default withOrgAccess(ApplicationsPage, {permissions: [permissions.applications.view]}); 