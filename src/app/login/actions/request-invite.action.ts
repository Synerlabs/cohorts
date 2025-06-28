'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';

interface RequestInviteResult {
  success?: boolean;
  error?: string;
}

/**
 * Server action to directly send a new invitation to the requested email
 * 
 * This function:
 * 1. Validates the email
 * 2. Sends a new magic link invitation directly to the email
 */
export async function requestNewInvite(email: string): Promise<RequestInviteResult> {
  if (!email) {
    return { error: 'Email is required' };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: 'Please enter a valid email address' };
  }

  try {
    // Create service client to access admin functions
    const supabaseService = await createServiceRoleClient();
    
    // Construct the redirect URL to our custom invitation handler
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
    const redirectUrl = `${siteUrl}/invitation-accepted`;
    
    // Hardcoded fallback for local development
    const isLocalDev = siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1');
    const finalRedirectUrl = isLocalDev 
      ? 'http://localhost:3001/invitation-accepted'
      : redirectUrl;
    
    // Log for debugging
    console.log('\n=========== REQUEST NEW INVITE DEBUG ===========');
    console.log('[Request New Invite Debug]', {
      email,
      siteUrl,
      redirectUrl,
      isLocalDev,
      finalRedirectUrl,
      env: {
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
      }
    });
    
    // Send a magic link directly to the email
    const { error: magicLinkError } = await supabaseService.auth.signInWithOtp({
      email: email,
      options: {
        // Allow creating new user if they don't exist
        shouldCreateUser: true,
        // Redirect to our custom invitation handler
        emailRedirectTo: finalRedirectUrl
      }
    });
    
    console.log('[Magic Link Response]', {
      success: !magicLinkError,
      error: magicLinkError?.message,
    });

    if (magicLinkError) {
      console.error("Error sending magic link:", magicLinkError);
      return { error: `Failed to send invitation: ${magicLinkError.message}` };
    }
    
    console.log(`New invitation sent to: ${email}`);
    
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in requestNewInvite:', error);
    return { error: 'An unexpected error occurred' };
  }
} 