"use server";

import { createClient as createServerClient } from '@/lib/utils/supabase/server';
import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ActionResult } from '@/lib/utils/action-permissions';

/**
 * Server action to check if a user is authenticated and get their session
 */
export async function checkSession() {
  try {
    // Create server-side Supabase client
    const supabase = await createServerClient();
    
    // Get user session using getUser() for server-side validation
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error("Server session check error (getUser):", error);
      // Distinguish between actual errors and no session found
      if (error.message === 'No session found') {
        return { 
          success: true, 
          session: null, // Keep shape consistent, though user is what matters
          userId: null,
          status: "unauthenticated" 
        };
      }
      return { 
        success: false, 
        error: error.message,
        status: "error" 
      };
    }
    
    if (!user) {
      return { 
        success: true, 
        session: null, // Keep shape consistent
        userId: null,
        status: "unauthenticated" 
      };
    }
    
    // If we have a user, fetch the user profile to check if it's complete
    const { data: profileData, error: profileError } = await supabase
      .from('profiles') // Corrected table name
      .select('first_name, last_name')
      .eq('id', user.id) // Use 'id' as the key
      .single();
      
    // Determine if profile is complete
    const isProfileComplete = !profileError && profileData?.first_name && profileData?.last_name;
    
    return {
      success: true,
      session: { user }, // Reconstruct a session-like object if needed by callers
      userId: user.id,
      status: "authenticated",
      profile: {
        exists: !profileError || profileError.code !== 'PGRST116', // PGRST116 = no rows
        isComplete: isProfileComplete,
        data: profileData || null
      }
    };
  } catch (error) {
    console.error("Unexpected error in checkSession:", error);
    return { 
      success: false,
      error: "Server error checking authentication status",
      status: "error"
    };
  }
}

/**
 * Server action to validate an invitation token
 */
export async function validateInvitationToken(token: string) {
  if (!token) {
    return { success: false, error: "Token is required" };
  }
  
  try {
    const supabase = await createServerClient();
    
    // First check in invitation_metadata (newer system)
    const { data: metadataInvite, error: metadataError } = await supabase
      .from('invitation_metadata')
      .select('id, email, group_id, role, status, invited_by, viewed_at, metadata, created_at')
      .eq('auth_token', token)
      .single();
    
    if (metadataInvite) {
      // Record view timestamp if first view
      if (!metadataInvite.viewed_at) {
        await supabase
          .from('invitation_metadata')
          .update({ viewed_at: new Date().toISOString() })
          .eq('id', metadataInvite.id);
      }
      
      // Get group info
      const { data: groupData } = await supabase
        .from('group')
        .select('name, slug')
        .eq('id', metadataInvite.group_id)
        .single();
      
      return {
        success: true,
        valid: true,
        email: metadataInvite.email,
        orgId: metadataInvite.group_id,
        orgSlug: groupData?.slug,
        orgName: groupData?.name,
        role: metadataInvite.role,
        source: 'invitation_metadata'
      };
    }
    
    // No valid invitation found if not in metadata
    return { 
      success: false, 
      error: "Invalid or expired invitation token" // Simplified error message
    };
    
  } catch (error) {
    console.error("Server error validating invitation token:", error);
    return { 
      success: false,
      error: "Server error validating invitation"
    };
  }
}

/**
 * Server action to update user profile and password during account setup.
 * It fetches the authenticated user server-side to ensure the correct user is updated.
 */
export async function completeAccountSetup(
  data: {
    firstName: string,
    lastName: string,
    password: string
  }
) {
  try {
    // Standard client for profile updates & getting the user
    const supabase = await createServerClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Server: Error getting authenticated user:', userError);
      return { 
        success: false, 
        error: 'Authentication error: Could not get user session.' 
      };
    }
    
    const authenticatedUserId = user.id;
    console.log('Server: Authenticated User ID:', authenticatedUserId);

    // Service role client for admin functions (password update)
    const adminSupabase = await createServiceRoleClient();
    
    // First update the user's password using the authenticated ID
    console.log('Server: Updating user password for user:', authenticatedUserId);
    const { error: passwordError } = await adminSupabase.auth.admin.updateUserById(
      authenticatedUserId,
      { password: data.password }
    );

    if (passwordError) {
      console.error('Server: Password update error:', passwordError);
      return { 
        success: false, 
        error: `Failed to set password: ${passwordError.message}` 
      };
    }
    
    console.log('Server: Password update successful');
    
    // Then update the user's profile using the authenticated ID
    console.log('Server: Updating user profile for user:', authenticatedUserId);
    
    // Check if profile exists first
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authenticatedUserId) // Use authenticated ID
      .single();
      
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Server: Error checking for existing profile:', fetchError);
      // Decide if this is fatal or just a logging warning
    }
    
    console.log('Server: Existing profile check:', existingProfile ? 'Found' : 'Not found');
    
    // Create the profile data with all required fields
    const profileData: {
      id: string; // Changed from user_id to id
      first_name: string;
      last_name: string;
      updated_at: string;
    } = {
      id: authenticatedUserId, // Use authenticated ID
      first_name: data.firstName,
      last_name: data.lastName,
      updated_at: new Date().toISOString(),
    };
    
    // Log the profile data we're about to insert/update
    console.log('Server: Profile update data:', JSON.stringify(profileData));
    
    // Try to use the service role client for profile updates too
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .upsert(profileData);

    if (profileError) {
      // Log the full error object to debug
      console.error('Server: Profile update error details:', {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        fullError: JSON.stringify(profileError)
      });
      
      return { 
        success: false, 
        error: `Failed to update profile: ${profileError.message || 'Unknown error'}` 
      };
    }
    
    console.log('Server: Profile update successful');
    
    return {
      success: true,
      message: 'Account setup completed successfully'
    };
  } catch (error: any) {
    // Log detailed error info for unexpected errors
    console.error('Server: Unexpected error in account setup:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: error.code,
      details: error.details
    });
    
    return { 
      success: false,
      error: error.message || 'An unexpected error occurred during account setup'
    };
  }
} 