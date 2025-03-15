import { Card } from '@/components/ui/card';
import { IMembershipTierProduct } from '@/lib/types/product';
import { ProductService } from '@/services/product.service';
import { notFound } from 'next/navigation';
import { Database } from '@/lib/types/database.types';
import { getRolesAction, GroupRole } from '../../_actions/roles.action';
import { getFormTemplateById } from '../../../forms/_actions/form-template.action';
import { EditMembershipTierForm } from '../../_components/edit-membership-tier-form';
import { getMembershipTierStatsAction } from '../../_actions/membership.action';

interface Props {
  params: {
    id: string;
    orgSlug: string;
  };
}

export default async function EditMembershipTierPage({ params: _params }: Props) {
  const params = await _params;
  try {
    // Debug: Log the requested tier ID
    const isDebugTier = params.id === '47f300bb-1268-4ba5-a31e-7b97f49fd442';
    if (isDebugTier) {
      console.log('DEBUG: Page fetching tier with ID:', params.id);
    }
    
    // Fetch the membership tier
    const tier = await ProductService.getMembershipTier(params.id);
    
    if (!tier) {
      notFound();
    }

    // Fetch tier statistics
    const tierStats = await getMembershipTierStatsAction(params.id);
    
    if (isDebugTier) {
      console.log('DEBUG: Page fetched tier stats:', tierStats);
      console.log('DEBUG: Tier type:', tier.membership_tier?.type);
    }

    // Fetch the form template if it exists
    let formTemplate = null;
    if (tier.membership_tier.form_template_id) {
      const { data: template, error } = await getFormTemplateById(tier.membership_tier.form_template_id);
      if (!error && template) {
        formTemplate = template;
      }
    }

    // Fetch all roles for the group
    let roles: GroupRole[] = [];
    const roleData = await getRolesAction(tier.group_id);
    if (roleData) {
      roles = roleData;
    }

    // Ensure we only pass serializable data to the client component
    const serializedTier = {
      ...tier,
      membership_tier: {
        ...tier.membership_tier,
        roles: tier.membership_tier.roles?.map(role => ({
          id: role.id,
          role_name: role.role_name || '',
          permissions: role.permissions || []
        })) || []
      }
    } as IMembershipTierProduct;

    return (
      <div className="space-y-6">
        <EditMembershipTierForm 
          tier={serializedTier} 
          groupId={serializedTier.group_id}
          initialFormTemplate={formTemplate}
          initialRoles={roles}
          stats={tierStats}
          orgSlug={params.orgSlug}
        />
      </div>
    );
  } catch (e) {
    console.error('Error loading tier:', e);
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Error</h2>
        <p className="text-muted-foreground mt-2">
          Failed to load membership tier
        </p>
      </Card>
    );
  }
} 