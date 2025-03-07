import { Card } from '@/components/ui/card';
import { IMembershipTierProduct } from '@/lib/types/product';
import { ProductService } from '@/services/product.service';
import { notFound } from 'next/navigation';
import { Database } from '@/lib/types/database.types';
import { getRolesAction, GroupRole } from '../../_actions/roles.action';
import { getFormTemplateById } from '../../../forms/_actions/form-template.action';
import { EditMembershipTierForm } from '../../_components/edit-membership-tier-form';

interface Props {
  params: {
    id: string;
    orgSlug: string;
  };
}

type FormTemplate = Database['public']['Tables']['form_templates']['Row'];

export default async function EditMembershipTierPage({ params: _params }: Props) {
  const params = await _params;
  try {
    // Fetch the membership tier
    const tier = await ProductService.getMembershipTier(params.id);
    
    if (!tier) {
      notFound();
    }

    // Fetch the form template if it exists
    let formTemplate: FormTemplate | null = null;
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
        duration_unit: tier.membership_tier.duration_unit || 'month',
        form_template_id: tier.membership_tier.form_template_id,
        member_id_format: tier.membership_tier.member_id_format,
        type: tier.membership_tier.type || 'membership',
        roles: tier.membership_tier.roles?.map(role => ({
          id: role.id,
          role_name: role.role_name,
          permissions: role.permissions || []
        })) || [],
        has_fixed_dates: tier.membership_tier.has_fixed_dates || false,
        fixed_start_date: tier.membership_tier.fixed_start_date || null,
        fixed_end_date: tier.membership_tier.fixed_end_date || null,
        is_fiscal_period: tier.membership_tier.is_fiscal_period || false,
        fiscal_start_month: tier.membership_tier.fiscal_start_month || null,
        fiscal_start_day: tier.membership_tier.fiscal_start_day || null,
        has_monthly_cycle: tier.membership_tier.has_monthly_cycle || false,
        monthly_start_day: tier.membership_tier.monthly_start_day || null,
        monthly_end_day_type: tier.membership_tier.monthly_end_day_type || 'specific',
        monthly_end_day: tier.membership_tier.monthly_end_day || null
      }
    };

    return (
      <div className="space-y-6">

        <EditMembershipTierForm 
          tier={serializedTier} 
          groupId={serializedTier.group_id}
          initialFormTemplate={formTemplate}
          initialRoles={roles}
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