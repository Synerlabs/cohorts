import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import UserTable from "@/app/(authenticated)/[orgSlug]/(org-pages)/members/_components/user-table";
import { permissions } from "@/lib/types/permissions";
import { getOrgMembers } from "@/services/org.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Suspense } from "react";

async function MembersPage({ org, searchParams }: OrgAccessHOCProps) {
  const _searchParams = await searchParams || {};
  const members = await getOrgMembers({ id: org.id });
  const tab = (_searchParams?.tab || "members") as string;

  return (
    <>
      <Tabs value={tab} className="w-[400px]">
        <TabsList>
          <TabsTrigger value="members" asChild>
            <Link href={`/@${org.slug}/members`}>Members</Link>
          </TabsTrigger>
          <TabsTrigger value="non-members" asChild>
            <Link href={`/@${org.slug}/members?tab=non-members`}>
              Non-Members
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <Suspense fallback={<div>Loading...</div>}>
        {tab === "members" && (
          <UserTable users={members} groupRoleId={org.id} />
        )}
      </Suspense>
    </>
  );
}

export default withOrgAccess(MembersPage, {permissions: [permissions.members.view]});
