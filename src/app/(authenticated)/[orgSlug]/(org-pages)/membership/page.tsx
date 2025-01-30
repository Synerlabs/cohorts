import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { getMembershipTiersAction, getMembershipsAction } from "./_actions/membership.action";
import { permissions } from "@/lib/types/permissions";
import MembershipPageClient from "./_components/membership-page-client";

async function MembershipPage({ org }: OrgAccessHOCProps) {
  const [tiers, memberships] = await Promise.all([
    getMembershipTiersAction(org.id),
    getMembershipsAction(org.id)
  ]);

  return <MembershipPageClient 
    tiers={tiers} 
    memberships={memberships}
    groupId={org.id} 
  />;
}

export default withOrgAccess(MembershipPage, { permissions: [permissions.memberships.view] });
