import { permissions } from "@/lib/types/permissions";
import { MembershipService } from "@/services/membership.service";
import { ProductService } from "@/services/product.service";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import MembershipPageClient from "../_components/membership-page-client";
import { MembershipFormType } from "../_components/membership-form";

// Define search params interface
interface SearchParams {
  filter?: string;
  tab?: string;
}

async function MembershipPage({ org, userPermissions, searchParams }: OrgAccessHOCProps & { searchParams: SearchParams }) {
  // Get filter from URL params, default to 'all'
  const filterParam = searchParams?.filter || 'all';
  const filter = ['all', 'membership', 'organization'].includes(filterParam) 
    ? filterParam as 'all' | 'membership' | 'organization' 
    : 'all';

  // Get all tiers by default
  let tiers = await ProductService.getMembershipTiers(org.id);
  
  // If filter is not 'all', filter the tiers by type
  if (filter !== 'all') {
    const tierType = filter === 'membership' ? MembershipFormType.MEMBER : MembershipFormType.AFFILIATION;
    tiers = tiers.filter(tier => 
      tier.membership_tier && tier.membership_tier.type === tierType
    );
  }

  const memberships = await MembershipService.getMembershipsByGroup(org.id);

  return (
    <MembershipPageClient 
      tiers={tiers} 
      memberships={memberships}
      groupId={org.id}
      orgSlug={org.slug}
      userPermissions={userPermissions}
      currentFilter={filter}
    />
  );
}

export default withOrgAccess(MembershipPage, {
  permissions: [permissions.memberships.view],
  onAccessDenied: { action: "error" }
});
