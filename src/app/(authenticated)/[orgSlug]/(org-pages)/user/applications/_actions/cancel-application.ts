'use server';

import { createClient } from "@/lib/utils/supabase/server";
import { revalidatePath } from "next/cache";

type CancelApplicationResponse = {
  success: boolean;
  message: string;
};

export async function cancelApplication(
  applicationId: string,
  orgSlug: string
): Promise<CancelApplicationResponse> {
  try {
    if (!applicationId) {
      return {
        success: false,
        message: "Invalid application ID"
      };
    }

    const supabase = await createClient();
    
    // First verify the application exists and belongs to the current user
    const { data: application, error: fetchError } = await supabase
      .from("applications")
      .select("id, status, metadata")
      .eq("id", applicationId)
      .single();
      
    if (fetchError) {
      console.error("Error fetching application:", fetchError);
      return {
        success: false,
        message: "Application not found"
      };
    }
    
    if (!application) {
      return {
        success: false,
        message: "Application not found"
      };
    }
    
    // Only allow cancellation of applications in pending or pending_payment status
    if (application.status !== 'pending' && application.status !== 'pending_payment') {
      return {
        success: false,
        message: `Cannot cancel application with status: ${application.status}`
      };
    }
    
    // Update the application to mark it as rejected
    const { error } = await supabase
      .from("applications")
      .update({ 
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        metadata: { 
          ...(application.metadata || {}), 
          cancelled_by_user: true, 
          cancellation_date: new Date().toISOString() 
        }
      })
      .eq("id", applicationId);

    if (error) {
      console.error("Error cancelling application:", error);
      throw error;
    }
    
    // Revalidate the path to refresh the UI
    revalidatePath(`/@${orgSlug}/user/applications`);
    
    return {
      success: true,
      message: "Application has been successfully cancelled."
    };
  } catch (error) {
    console.error("Error cancelling application:", error);
    return {
      success: false,
      message: "There was an error cancelling your application. Please try again later."
    };
  }
} 