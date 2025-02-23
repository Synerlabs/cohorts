import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { permissions } from "@/lib/types/permissions";
import MembershipPageClient from "./_components/membership-page-client";
import { ProductService } from "@/services/product.service";
import { MembershipService } from "@/services/membership.service";

async function MembershipPage({ org, userPermissions }: OrgAccessHOCProps) {
  const [tiers, memberships] = await Promise.all([
    ProductService.getMembershipTiers(org.id),
    MembershipService.getMembershipsByGroup(org.id)
  ]);
  console.log('memberships', memberships);
  return <MembershipPageClient 
    tiers={tiers} 
    memberships={memberships ?? []}
    groupId={org.id} 
    orgSlug={org.slug}
    userPermissions={userPermissions}
  />;
}

export default withOrgAccess(MembershipPage, { permissions: [permissions.memberships.view], onAccessDenied: { action: "error" }});
