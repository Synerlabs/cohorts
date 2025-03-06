import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { permissions } from "@/lib/types/permissions";
import { ProductService } from "@/services/product.service";
import { MembershipService } from "@/services/membership.service";
import AffiliationPageClient from "../_components/affiliation-page-client";
import { MembershipFormType } from "../_components/membership-form";

// Define search params interface
interface SearchParams {
  filter?: string;
  tab?: string;
}

async function AffiliationPage({ org, userPermissions, searchParams }: OrgAccessHOCProps & { searchParams: SearchParams }) {
  // Get filter from URL params, default to 'organization'
  const filterParam = searchParams?.filter || 'organization';
  const filter = ['all', 'membership', 'organization'].includes(filterParam) 
    ? filterParam as 'all' | 'membership' | 'organization' 
    : 'organization';

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
    <AffiliationPageClient 
      tiers={tiers} 
      memberships={memberships}
      groupId={org.id}
      orgSlug={org.slug}
      userPermissions={userPermissions}
      currentFilter={filter}
    />
  );
}

export default withOrgAccess(AffiliationPage, {
  permissions: [permissions.memberships.view],
  onAccessDenied: { action: "error" }
});
