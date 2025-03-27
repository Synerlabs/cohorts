'use server';

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/utils/supabase/server";

type CancellationResponse = {
  success: boolean;
  message: string;
};

export async function cancelMembership(
  membershipId: string,
  orgSlug: string
): Promise<CancellationResponse> {
  console.log("[SERVER] Starting membership cancellation:", { membershipId, orgSlug });
  
  try {
    if (!membershipId) {
      console.error("[SERVER] Invalid membership ID:", membershipId);
      return {
        success: false,
        message: "Invalid membership ID"
      };
    }

    // Create a service role client that bypasses RLS policies
    console.log("[SERVER] Creating service role client...");
    const supabase = await createServiceRoleClient();
    
    // First verify the membership exists
    console.log("[SERVER] Verifying membership exists:", membershipId);
    const { data: membership, error: fetchError } = await supabase
      .from("memberships")
      .select("*")
      .eq("id", membershipId)
      .single();
      
    if (fetchError) {
      console.error("[SERVER] Error fetching membership:", fetchError);
      return {
        success: false,
        message: "Membership not found"
      };
    }
    
    if (!membership) {
      console.log("[SERVER] Membership not found:", membershipId);
      return {
        success: false,
        message: "Membership not found"
      };
    }
    
    console.log("[SERVER] Found membership:", membership);
    
    // Delete the membership directly
    console.log("[SERVER] Attempting to delete membership with ID:", membershipId);
    const { error } = await supabase
      .from("memberships")
      .delete()
      .eq("id", membershipId);

    if (error) {
      console.error("[SERVER] Database error cancelling membership:", error);
      throw error;
    }
    
    // Revalidate the path to refresh the UI
    console.log("[SERVER] Membership deleted successfully, revalidating path:", `/@${orgSlug}/join`);
    revalidatePath(`/@${orgSlug}/join`);
    
    return {
      success: true,
      message: "Your membership has been successfully cancelled."
    };
  } catch (error) {
    console.error("[SERVER] Error cancelling membership:", error);
    return {
      success: false,
      message: "There was an error cancelling your membership. Please try again later."
    };
  }
} 