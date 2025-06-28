import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/utils/supabase/server';

interface InviteData {
  id: string;
  email: string;
  org_id: string;
  role?: string;
  status?: string;
  expires_at?: string;
  organization?: any;
  user_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    console.log('Accept invitation API called with token:', token ? token.substring(0, 8) + '...' : 'none');
    console.log('Request body:', {
      hasToken: !!token,
      hasFirstName: !!body.firstName,
      hasLastName: !!body.lastName,
      hasPassword: !!body.password,
      hasUserId: !!body.userId
    });

    if (!token) {
      console.log('Error: No token provided');
      return NextResponse.json(
        { message: 'Invitation token is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    // First, look up the invitation by token - using applications table as suggested by the error
    console.log('Looking up invitation in applications table');
    const { data: inviteData, error: inviteError } = await supabase
      .from('applications')
      .select('id, email, org_id, role, status, expires_at, organization:organizations(name, slug)')
      .eq('token', token)
      .single();
    
    // Variable to store the valid invitation data
    let validInviteData: InviteData | null = inviteData;
    
    if (inviteError || !validInviteData) {
      console.error('Failed to find invitation by token:', token.substring(0, 8) + '...', inviteError);
      
      // Let's try to look up via code column as well
      console.log('Attempting to look up by code field instead');
      const { data: codeData, error: codeError } = await supabase
        .from('applications')
        .select('id, email, org_id, role, status, expires_at, organization:organizations(name, slug)')
        .eq('code', token)
        .single();
        
      if (codeError || !codeData) {
        console.error('Failed to find invitation by code as well:', codeError);
        return NextResponse.json(
          { message: 'Invalid or expired invitation token', details: inviteError?.message },
          { status: 404 }
        );
      }
      
      // If we found it by code, use that data
      console.log('Found invitation by code field');
      validInviteData = codeData;
    } else {
      console.log('Successfully found invitation');
    }
    
    // Log invitation details for debugging
    console.log('Invitation details:', {
      id: validInviteData.id,
      email: validInviteData.email,
      orgId: validInviteData.org_id,
      role: validInviteData.role,
      status: validInviteData.status,
      hasOrg: !!validInviteData.organization
    });
    
    // Check if invitation is expired
    if (validInviteData.expires_at && new Date(validInviteData.expires_at) < new Date()) {
      console.log('Invitation expired:', validInviteData.expires_at);
      // Update status to expired
      await supabase
        .from('applications')
        .update({ status: 'expired' })
        .eq('id', validInviteData.id);
        
      return NextResponse.json(
        { message: 'Invitation has expired' },
        { status: 400 }
      );
    }
    
    // Check if already accepted
    if (validInviteData.status === 'accepted') {
      console.log('Invitation already accepted');
      return NextResponse.json(
        { message: 'Invitation has already been accepted' },
        { status: 400 }
      );
    }
    
    // Get organization info from the response
    const organization = validInviteData.organization as { name?: string; slug?: string } | null;
    console.log('Organization info:', organization);
    
    // Check if this is a new account setup (with firstName, lastName, password)
    // or an existing user accepting an invitation (with userId)
    if (body.firstName && body.lastName && body.password) {
      console.log('Processing new user account creation flow');
      // This is a new user flow - create account
      const { firstName, lastName, password } = body;
      
      if (!firstName || !lastName) {
        return NextResponse.json(
          { message: 'First name and last name are required' },
          { status: 400 }
        );
      }
      
      if (!password || password.length < 6) {
        return NextResponse.json(
          { message: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }
      
      // Create the user account
      console.log('Creating user account with email:', validInviteData.email);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validInviteData.email,
        password: password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName
          }
        }
      });
      
      if (authError || !authData.user) {
        console.error('Failed to create user account:', authError);
        return NextResponse.json(
          { message: 'Failed to create user account', details: authError?.message },
          { status: 500 }
        );
      }
      
      console.log('User account created:', authData.user.id);
      
      // Create or update the user profile
      console.log('Creating user profile');
      const { error: profileError } = await supabase
        .from('user_profile')
        .upsert({
          user_id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString(),
        });
        
      if (profileError) {
        console.error('Failed to create user profile:', profileError);
        // We don't return an error here since the account was created,
        // but we log it for debugging
      }
      
      // Create organization membership
      console.log('Creating organization membership');
      const { error: membershipError } = await supabase
        .from('org_members')
        .insert({
          org_id: validInviteData.org_id,
          user_id: authData.user.id,
          role: validInviteData.role || 'member',
        });
        
      if (membershipError) {
        console.error('Failed to create organization membership:', membershipError);
        return NextResponse.json(
          { message: 'Failed to add user to organization', details: membershipError?.message },
          { status: 500 }
        );
      }
      
      // Update invitation status
      console.log('Updating invitation status to accepted');
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          user_id: authData.user.id
        })
        .eq('id', validInviteData.id);
        
      if (updateError) {
        console.error('Failed to update invitation status:', updateError);
        // We don't return an error since the membership was created
      }
      
      // Also update our custom invitation_metadata table if we have a matching record
      try {
        const { data: metadataInvite } = await supabase
          .from('invitation_metadata')
          .select('id, metadata')
          .eq('email', validInviteData.email)
          .eq('group_id', validInviteData.org_id)
          .single();
          
        if (metadataInvite?.id) {
          await supabase
            .from('invitation_metadata')
            .update({
              status: 'accepted',
              updated_at: new Date().toISOString(),
              metadata: {
                ...(metadataInvite.metadata || {}),
                accepted_at: new Date().toISOString(),
                user_id: authData.user.id
              }
            })
            .eq('id', metadataInvite.id);
            
          console.log('Updated invitation_metadata status to accepted');
        }
      } catch (metaErr) {
        console.error('Error updating invitation_metadata:', metaErr);
        // Don't fail if this update fails
      }
      
      // Return success
      console.log('Account creation successful');
      return NextResponse.json({
        message: 'Account created successfully',
        userId: authData.user.id,
        orgSlug: organization?.slug
      });
      
    } else if (body.userId) {
      console.log('Processing existing user accepting invitation');
      // This is an existing user accepting an invitation
      const { userId } = body;
      
      // Create organization membership
      console.log('Creating organization membership for existing user');
      const { error: membershipError } = await supabase
        .from('org_members')
        .insert({
          org_id: validInviteData.org_id,
          user_id: userId,
          role: validInviteData.role || 'member',
        });
        
      if (membershipError) {
        // Check if it's a duplicate membership error (user is already a member)
        if (membershipError.code === '23505') { // PostgreSQL unique violation code
          console.log('User is already a member of the organization');
        } else {
          console.error('Failed to create organization membership:', membershipError);
          return NextResponse.json(
            { message: 'Failed to add user to organization', details: membershipError?.message },
            { status: 500 }
          );
        }
      }
      
      // Update invitation status
      console.log('Updating invitation status to accepted');
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          user_id: userId
        })
        .eq('id', validInviteData.id);
        
      if (updateError) {
        console.error('Failed to update invitation status:', updateError);
        // We don't return an error since the membership was created
      }
      
      // Also update our custom invitation_metadata table if we have a matching record
      try {
        const { data: metadataInvite } = await supabase
          .from('invitation_metadata')
          .select('id, metadata')
          .eq('email', validInviteData.email)
          .eq('group_id', validInviteData.org_id)
          .single();
          
        if (metadataInvite?.id) {
          await supabase
            .from('invitation_metadata')
            .update({
              status: 'accepted',
              updated_at: new Date().toISOString(),
              metadata: {
                ...(metadataInvite.metadata || {}),
                accepted_at: new Date().toISOString(),
                user_id: userId
              }
            })
            .eq('id', metadataInvite.id);
            
          console.log('Updated invitation_metadata status to accepted for existing user');
        }
      } catch (metaErr) {
        console.error('Error updating invitation_metadata:', metaErr);
        // Don't fail if this update fails
      }
      
      // Return success
      console.log('Invitation successfully accepted by existing user');
      return NextResponse.json({
        message: 'Invitation accepted successfully',
        orgSlug: organization?.slug
      });
    } else {
      console.log('Invalid request parameters - missing firstName/lastName/password or userId');
      return NextResponse.json(
        { message: 'Invalid request parameters' },
        { status: 400 }
      );
    }
    
  } catch (error: any) {
    console.error('Error processing invitation:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred', details: error?.message || String(error) },
      { status: 500 }
    );
  }
} 