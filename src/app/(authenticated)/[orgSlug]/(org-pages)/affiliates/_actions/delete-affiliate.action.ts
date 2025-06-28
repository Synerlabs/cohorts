'use server';

import { createClient } from '@/lib/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { permissions } from '@/lib/types/permissions';
import { withPermissions, ActionResult } from '@/lib/utils/action-permissions';
import { getOrgBySlug } from '@/services/org.service';

interface DeleteAffiliateParams {
  affiliateId: string;
  orgSlug: string;
}

// Server action function that takes context and params
async function deleteAffiliateAction(
  context: { userId: string; groupId: string },
  params: DeleteAffiliateParams
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const { affiliateId, orgSlug } = params;
    const supabase = await createClient();
    
    // Delete the affiliate record
    const { error } = await supabase
      .from('group_organization')
      .delete()
      .eq('id', affiliateId);
    
    if (error) {
      console.error('Error deleting affiliate:', error);
      return { success: false, error: error.message };
    }
    
    // Revalidate the affiliates page to refresh the data
    revalidatePath(`/@${orgSlug}/affiliates`);
    
    return { success: true, data: { success: true } };
  } catch (err) {
    console.error('Error in deleteAffiliateAction:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error occurred' 
    };
  }
}

// Export the server action directly as an async function
export async function deleteAffiliate(prevState: any, params: DeleteAffiliateParams) {
  try {
    // Get the organization ID from the slug
    const orgResult = await getOrgBySlug(params.orgSlug);
    
    // Check if there was an error or no data
    if (orgResult.error || !orgResult.data) {
      return { 
        success: false, 
        error: orgResult.error || "Organization not found" 
      };
    }

    const org = orgResult.data;

    const wrappedAction = await withPermissions(
      deleteAffiliateAction,
      () => ({
        moduleId: org.id, // Use the organization ID instead of affiliate ID
        moduleType: 'group',
        requiredPermissions: permissions.group.edit,
      })
    );
    
    return wrappedAction(prevState, params);
  } catch (error) {
    console.error("Error in deleteAffiliate:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
} 