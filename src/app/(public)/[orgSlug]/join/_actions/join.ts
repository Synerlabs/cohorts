'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OrderService } from "@/services/order.service";
import { addItem } from "@/lib/utils/cart";
import { ProductService } from "@/services/product.service";
import { createGroupUser } from "@/services/join.service";
import { createMembershipApplication } from "@/services/applications.service";
import { createClient } from "@/lib/utils/supabase/server";
import { MembershipActivationType } from "@/lib/types/membership";
import { getGroupUser } from "@/services/user.service";
import { MembershipActivationService } from "@/services/membership-activation.service";

type State = {
  message?: string;
  errors?: {
    form?: string[];
  };
  redirect?: string;
};

export async function join(prevState: State, formData: FormData): Promise<State> {
  try {
    const groupId = formData.get('groupId') as string;
    const membershipTierId = formData.get('membershipTierId') as string;
    const userId = formData.get('userId') as string;
    const formSubmissionData = formData.get('formData') as string;
    // Organization-specific data for organization-type tiers
    const organizationId = formData.get('organizationId') as string;
    const organizationName = formData.get('organizationName') as string;

    if (!groupId || !membershipTierId || !userId) {
      return {
        errors: {
          form: ['Missing required fields']
        }
      };
    }

    // Get membership tier
    const membershipTier = await ProductService.getMembershipTier(membershipTierId);
    if (!membershipTier) {
      return {
        errors: {
          form: ['Invalid membership tier']
        }
      };
    }
    
    // Check if this is an organization-type tier
    const isOrganizationTier = membershipTier.membership_tier.type === 'organization';
    
    if (isOrganizationTier && (!organizationId && !organizationName)) {
      return {
        errors: {
          form: ['Missing organization information']
        }
      };
    }

    // Create group user if not exists
    let groupUser = await getGroupUser({userId, groupId});

    if (!groupUser) {
      groupUser = await createGroupUser({
        userId,
        groupId
      });
    }

    // Create application
    console.log('Creating application for membership tier:', {
      groupUserId: groupUser.id,
      tierId: membershipTierId,
      formData: formSubmissionData ? JSON.parse(formSubmissionData) : null,
      isOrganizationTier,
      organizationId: isOrganizationTier ? organizationId : null,
      organizationName: isOrganizationTier ? organizationName : null
    });

    // For organization tiers, check if there's already a relationship 
    // between the two groups in group_organization table
    if (isOrganizationTier && organizationId) {
      const supabase = await createClient();
      const { data: existingRelation, error: relError } = await supabase
        .from('group_organization')
        .select('id, is_active, tier_id')
        .eq('parent_group_id', groupId)
        .eq('child_group_id', organizationId)
        .maybeSingle();
        
      if (relError) {
        console.error('Error checking existing group_organization relationship:', relError);
        // Continue with creating the application
      } else if (existingRelation) {
        // If there's already an active relationship with this tier, inform the user
        if (existingRelation.is_active && existingRelation.tier_id === membershipTierId) {
          return {
            message: 'This organization is already affiliated with this membership tier.',
            redirect: `/${organizationName.toLowerCase().replace(/\s+/g, '-')}`
          };
        }
      }
      
      // Make sure the organization is active
      const { error: activateOrgError } = await supabase
        .from('group')
        .update({ is_active: true })
        .eq('id', organizationId);
        
      if (activateOrgError) {
        console.error('Error activating organization:', activateOrgError);
        // Continue with creating the application
      }
    }

    // Create the application with metadata for organization tiers
    const metadata = isOrganizationTier ? {
      organizationId,
      organizationName
    } : undefined;
    
    // Pass the form data and metadata to the application service
    const application = await createMembershipApplication(
      groupUser.id,
      membershipTierId,
      formSubmissionData ? JSON.parse(formSubmissionData) : undefined,
      metadata
    );

    console.log('Application created successfully:', {
      id: application.id,
      tierType: membershipTier.membership_tier.type,
      activationType: membershipTier.membership_tier.activation_type,
      hasFormTemplate: !!membershipTier.membership_tier.form_template_id,
      formTemplateId: membershipTier.membership_tier.form_template_id
    });

    // For organization tiers, we handle the relationship differently based on form submission
    let shouldCreateOrganizationRelationship = true;
    
    // Check if form completion is required based on form template and activation type
    // For organization tiers, we need to be extra careful about form detection
    const needsFormCompletion = 
      // Must have a form template ID
      membershipTier.membership_tier.form_template_id && 
      // Should not already have form data submitted
      (!formSubmissionData) &&
      (
        // Standard form-requiring activation types
        membershipTier.membership_tier.activation_type === MembershipActivationType.FORM_REQUIRED || 
        membershipTier.membership_tier.activation_type === MembershipActivationType.FORM_THEN_PAYMENT || 
        membershipTier.membership_tier.activation_type === MembershipActivationType.FORM_THEN_REVIEW ||
        // For organization tiers, always check form if it has a template
        (isOrganizationTier && membershipTier.membership_tier.form_template_id)
      );

    // For organization tiers with form requirements, we'll defer relationship creation until after form completion
    if (isOrganizationTier && needsFormCompletion) {
      shouldCreateOrganizationRelationship = false;
      console.log('Deferring organization relationship creation until after form completion');
    }

    console.log('Form requirement check:', {
      needsFormCompletion,
      isOrganizationType: isOrganizationTier,
      tierType: membershipTier.membership_tier.type,
      hasFormTemplateId: !!membershipTier.membership_tier.form_template_id,
      activationType: membershipTier.membership_tier.activation_type,
      formTemplateId: membershipTier.membership_tier.form_template_id,
      hasExistingFormData: !!formSubmissionData,
      shouldCreateOrganizationRelationship
    });

    // If a form is required, generate the form URL and redirect the user
    if (needsFormCompletion) {
      const supabase = await createClient();
      
      // Get org slug for the form URL
      const { data: org, error: orgSlugError } = await supabase
        .from('group')
        .select('slug')
        .eq('id', groupId)
        .single();
        
      console.log('Preparing form redirect:', {
        orgSlugFound: !!org,
        orgSlugError: orgSlugError ? orgSlugError.message : null
      });
      
      if (orgSlugError) {
        console.error('Could not get org slug for form URL:', orgSlugError);
      } else if (org?.slug) {
        // Create a query string with organization information and application ID
        const queryParams = new URLSearchParams();
        
        // Add application ID to link form submission with existing application
        queryParams.append('applicationId', application.id);
        
        // Pass organization information via query parameters
        if (organizationId) {
          // For existing organization
          queryParams.append('organizationId', organizationId);
          
          // Find organization name if not provided directly
          if (!organizationName) {
            const { data: orgData } = await supabase
              .from('group')
              .select('name')
              .eq('id', organizationId)
              .single();
              
            if (orgData?.name) {
              queryParams.append('organizationName', orgData.name);
            }
          } else {
            queryParams.append('organizationName', organizationName);
          }
        } else if (organizationName) {
          // For newly created organization
          queryParams.append('organizationName', organizationName);
          queryParams.append('isNewOrg', 'true');
        }
        
        // Use the tier ID and include the query parameters
        const formUrl = `/${org.slug}/join/${membershipTierId}?${queryParams.toString()}`;
        console.log('⭐ Redirecting to form URL with organization data:', formUrl);
        
        // This will throw a NEXT_REDIRECT error that should bubble up
        // It shouldn't be caught by our catch block
        redirect(formUrl);
        // Code will not reach here due to redirect
      }
    }

    // For automatic activation types, process the application immediately
    if (membershipTier.membership_tier.activation_type === MembershipActivationType.AUTOMATIC ||
        membershipTier.membership_tier.activation_type === MembershipActivationType.FORM_REQUIRED) {
      try {
        console.log('Processing application with automatic activation:', application.id);
        await MembershipActivationService.processApplication(application.id);
      } catch (error) {
        console.error('Error processing application with automatic activation:', error);
        // Continue with the flow even if there's an error, as the application was created
      }
    }

    // For paid memberships that require payment, add to cart
    if (membershipTier.price > 0 && (
      membershipTier.membership_tier.activation_type === MembershipActivationType.PAYMENT_REQUIRED ||
      membershipTier.membership_tier.activation_type === MembershipActivationType.FORM_THEN_PAYMENT ||
      membershipTier.membership_tier.activation_type === MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW ||
      membershipTier.membership_tier.activation_type === MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT
    )) {
      await addItem({
        productId: membershipTierId,
        type: 'membership',
        metadata: {
          groupId,
          groupUserId: groupUser.id,
          applicationId: application.id
        }
      });
    }

    const supabase = await createClient();

    // Get org for redirect
    const { data: org, error: orgError } = await supabase
      .from('group')
      .select('slug')
      .eq('id', groupId)
      .single();

    if (orgError) throw orgError;

    // For tiers that require payment NEXT, redirect to checkout
    if (membershipTier.price > 0 && (
      membershipTier.membership_tier.activation_type === MembershipActivationType.PAYMENT_REQUIRED ||
      membershipTier.membership_tier.activation_type === MembershipActivationType.FORM_THEN_PAYMENT ||
      membershipTier.membership_tier.activation_type === MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW
    )) {
      return {
        message: 'Redirecting to payment...',
        redirect: `/${org.slug}/join/payments?applicationId=${application.id}`
      };
    }

    // For tiers that require REVIEW next, redirect to thank you page
    // This includes FORM_THEN_REVIEW and FORM_THEN_REVIEW_THEN_PAYMENT types
    if (membershipTier.membership_tier.activation_type === MembershipActivationType.FORM_THEN_REVIEW ||
        membershipTier.membership_tier.activation_type === MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT ||
        membershipTier.membership_tier.activation_type === MembershipActivationType.REVIEW_REQUIRED) {
      console.log(`Redirecting to awaiting review page for activation type: ${membershipTier.membership_tier.activation_type}`);
      revalidatePath(`/${org.slug}/join`);
      return {
        message: 'Your membership application was submitted and is awaiting review.',
        redirect: `/${org.slug}/join?status=pending&app=${application.id}`
      };
    }

    // For all other tiers (automatic, etc.), redirect to thank you page
    revalidatePath(`/${org.slug}/join`);
    return {
      message: 'Your membership application was submitted successfully!',
      redirect: `/${org.slug}/join?status=success&app=${application.id}`
    };
  } catch (error) {
    console.error('Error during join flow:', error);
    
    // Let Next.js internal redirects bubble up
    if (error instanceof Error && 
        (error.message === 'NEXT_REDIRECT' || 
         (error as any).digest?.startsWith('NEXT_REDIRECT'))) {
      throw error; // Re-throw redirect "errors" so Next.js can handle them
    }
    
    return {
      errors: {
        form: [(error as Error).message || 'An error occurred during the join process']
      }
    };
  }
} 