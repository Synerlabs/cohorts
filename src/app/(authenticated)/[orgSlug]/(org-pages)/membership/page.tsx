import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { getMembershipTiersAction } from "./_actions/membership.action";
import { permissions } from "@/lib/types/permissions";
import MembershipPageClient from "./_components/membership-page-client";

async function MembershipPage({ org }: OrgAccessHOCProps) {
  const tiers = await getMembershipTiersAction(org.id);

  return <MembershipPageClient tiers={tiers} groupId={org.id} />;
}

export default withOrgAccess(MembershipPage, { permissions: [permissions.memberships.view] });
