import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { permissions } from "@/lib/types/permissions";
import { getPendingApplications } from "@/services/applications.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Suspense } from "react";
import ApplicationsTable from "./_components/applications-table";

async function ApplicationsPage({ org, searchParams }: OrgAccessHOCProps) {
  const _searchParams = searchParams || {};
  const applications = await getPendingApplications(org.id);
  const tab = (_searchParams?.tab || "pending") as string;

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
          {tab === "pending" && (
            <ApplicationsTable applications={applications} />
          )}
        </Suspense>
      </div>
    </>
  );
}

export default withOrgAccess(ApplicationsPage, {permissions: [permissions.members.edit]}); 