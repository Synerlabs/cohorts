'use server';

import { createClient } from '@/lib/utils/supabase/server';
import { revalidatePath } from 'next/cache';

type OrganizationInfo = {
  createNew: boolean;
  name?: string;
  organizationId?: string;
  organizationName?: string;
};

type FormSubmission = {
  _organizationInfo: OrganizationInfo;
  parentGroupId: string;
};

export async function applyForMembership(
  tierProductId: string,
  formSubmission: FormSubmission
) {
  console.log('Server Action: Received membership application:', {
    tierProductId,
    formSubmission,
  });

  if (!tierProductId) {
    throw new Error('Missing tier information');
  }

  if (!formSubmission || !formSubmission._organizationInfo) {
    throw new Error('Missing organization information');
  }

  const supabase = await createClient();
  const orgInfo = formSubmission._organizationInfo;

  // Create new organization if needed
  let organizationId = orgInfo.organizationId;

  if (orgInfo.createNew) {
    if (!orgInfo.name || orgInfo.name.trim() === '') {
      throw new Error('Organization name is required');
    }

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error getting user:', userError);
      throw new Error('Unauthorized');
    }

    // Create the organization
    const { data: newOrg, error: createError } = await supabase
      .from('group')
      .insert({
        name: orgInfo.name.trim(),
        created_by: user.id,
        updated_by: user.id,
      })
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating organization:', createError);
      throw new Error(`Failed to create organization: ${createError.message}`);
    }

    organizationId = newOrg.id;
  } else {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    
    // Verify the organization exists
    const { data: existingOrg, error: orgError } = await supabase
      .from('group')
      .select('id, name')
      .eq('id', organizationId)
      .single();

    if (orgError) {
      console.error('Error finding organization:', orgError);
      throw new Error(`Organization not found: ${orgError.message}`);
    }

    if (!existingOrg) {
      throw new Error(`Organization with ID ${organizationId} not found`);
    }
    
    console.log('Found organization:', existingOrg);
  }

  // Extract parent group ID from formSubmission
  const parentGroupId = formSubmission.parentGroupId;

  if (!parentGroupId) {
    throw new Error('Missing parent group ID');
  }

  // Check if relationship already exists
  const { data: existingRelationship, error: relationshipCheckError } = await supabase
    .from('group_organization')
    .select('*')
    .eq('parent_group_id', parentGroupId)
    .eq('child_group_id', organizationId);

  if (relationshipCheckError) {
    console.error('Error checking relationship:', relationshipCheckError);
    throw new Error(`Failed to check existing relationship: ${relationshipCheckError.message}`);
  }

  if (existingRelationship && existingRelationship.length > 0) {
    if (existingRelationship[0].is_active) {
      throw new Error('These organizations are already affiliated');
    }
  }

  // Create the affiliation
  const { error: affiliationError } = await supabase
    .from('group_organization')
    .upsert({
      parent_group_id: parentGroupId,
      child_group_id: organizationId,
      tier_id: tierProductId,
      is_active: true,
    });

  if (affiliationError) {
    console.error('Error creating affiliation:', affiliationError);
    throw new Error(`Failed to create affiliation: ${affiliationError.message}`);
  }

  // Revalidate the membership pages
  revalidatePath('/[orgSlug]/membership');

  return {
    success: true,
    message: orgInfo.createNew
      ? 'New organization created and affiliation request submitted'
      : 'Affiliation request submitted successfully',
    organizationId,
  };
} 