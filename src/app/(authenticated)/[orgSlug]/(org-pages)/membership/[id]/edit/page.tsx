import { Card } from '@/components/ui/card';
import { IMembershipTierProduct } from '@/lib/types/product';
import { ProductService } from '@/services/product.service';
import { EditMembershipTierForm } from '../../_components/edit-membership-tier-form';
import { notFound } from 'next/navigation';

interface Props {
  params: {
    id: string;
    orgSlug: string;
  };
}

export default async function EditMembershipTierPage({ params }: Props) {
  try {
    const tier = await ProductService.getMembershipTier(params.id);
    
    if (!tier) {
      notFound();
    }

    // Ensure we only pass serializable data to the client component
    const serializedTier: IMembershipTierProduct = {
      id: tier.id,
      type: tier.type,
      name: tier.name,
      description: tier.description,
      price: tier.price,
      currency: tier.currency,
      group_id: tier.group_id,
      is_active: tier.is_active,
      created_at: tier.created_at,
      updated_at: tier.updated_at,
      form_template_id: tier.membership_tier.form_template_id || '',
      membership_tier: {
        product_id: tier.id,
        activation_type: tier.membership_tier.activation_type,
        duration_months: tier.membership_tier.duration_months,
        form_template_id: tier.membership_tier.form_template_id,
        member_id_format: tier.membership_tier.member_id_format,
        roles: tier.membership_tier.roles?.map(role => ({
          id: role.id,
          role_name: role.role_name,
          permissions: role.permissions || []
        })) || []
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Edit Membership Tier</h1>
        </div>

        <EditMembershipTierForm 
          tier={serializedTier} 
          groupId={serializedTier.group_id}
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