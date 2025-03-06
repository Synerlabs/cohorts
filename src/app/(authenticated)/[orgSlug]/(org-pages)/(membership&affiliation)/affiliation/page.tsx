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

  // Get tiers with server-side filtering
  const tierType = filter === 'all' ? undefined : 
                  filter === 'membership' ? 'membership' : 'organization';
  const tiers = await ProductService.getMembershipTiers(org.id, false, { 
    cardsOnly: true, 
    tierType: tierType 
  });

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
