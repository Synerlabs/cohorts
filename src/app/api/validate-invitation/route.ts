import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { message: 'Invitation code is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // First check our custom invitation_metadata table
    console.log('Checking invitation_metadata table for token:', code.substring(0, 8) + '...');
    
    const { data: metadataInvite, error: metadataError } = await supabase
      .from('invitation_metadata')
      .select('id, email, group_id, role, status, invited_by, viewed_at, metadata, created_at')
      .eq('auth_token', code)
      .single();
    
    if (metadataInvite) {
      console.log('Found invitation in invitation_metadata table');
      
      // If this is the first time viewing, update the viewed_at timestamp
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
      
      // Return invitation details
      return NextResponse.json({
        valid: true,
        email: metadataInvite.email,
        orgId: metadataInvite.group_id,
        orgSlug: groupData?.slug,
        orgName: groupData?.name,
        role: metadataInvite.role,
        metadata: metadataInvite.metadata || {},
        source: 'invitation_metadata'
      });
    }
      
    // Fall back to checking applications table
    console.log('Checking applications table');
    const { data: inviteData, error: inviteError } = await supabase
      .from('applications')
      .select('id, email, org_id, role, status, expires_at, organization:organizations(name, slug)')
      .eq('token', code)
      .single();
    
    if (inviteError || !inviteData) {
      // Try one more lookup with code field
      const { data: codeData, error: codeError } = await supabase
        .from('applications')
        .select('id, email, org_id, role, status, expires_at, organization:organizations(name, slug)')
        .eq('code', code)
        .single();
        
      if (codeError || !codeData) {
        console.error('Failed to find invitation in any table:', inviteError);
        return NextResponse.json(
          { message: 'Invalid or expired invitation code' },
          { status: 404 }
        );
      }
      
      // Found by code
      console.log('Found invitation in applications table by code field');
      
      // Check if invitation is expired
      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        // Update status to expired
        await supabase
          .from('applications')
          .update({ status: 'expired' })
          .eq('id', codeData.id);
          
        return NextResponse.json(
          { message: 'Invitation has expired' },
          { status: 400 }
        );
      }
      
      // Check if already accepted
      if (codeData.status === 'accepted') {
        return NextResponse.json(
          { message: 'Invitation has already been accepted' },
          { status: 400 }
        );
      }
      
      // Get organization info from the response
      const organization = codeData.organization as { name?: string; slug?: string } | null;
      
      // Return invitation details
      return NextResponse.json({
        valid: true,
        email: codeData.email,
        orgId: codeData.org_id,
        orgSlug: organization?.slug,
        orgName: organization?.name,
        role: codeData.role,
        source: 'applications'
      });
    }
    
    // Found invitation in applications table
    console.log('Found invitation in applications table');
    
    // Check if invitation is expired
    if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from('applications')
        .update({ status: 'expired' })
        .eq('id', inviteData.id);
        
      return NextResponse.json(
        { message: 'Invitation has expired' },
        { status: 400 }
      );
    }
    
    // Check if already accepted
    if (inviteData.status === 'accepted') {
      return NextResponse.json(
        { message: 'Invitation has already been accepted' },
        { status: 400 }
      );
    }
    
    // Get organization info from the response
    const organization = inviteData.organization as { name?: string; slug?: string } | null;
    
    // Return invitation details
    return NextResponse.json({
      valid: true,
      email: inviteData.email,
      orgId: inviteData.org_id,
      orgSlug: organization?.slug,
      orgName: organization?.name,
      role: inviteData.role,
      source: 'applications'
    });
    
  } catch (error: any) {
    console.error('Error validating invitation:', error);
    return NextResponse.json(
      { message: 'An error occurred while validating the invitation', details: error.message },
      { status: 500 }
    );
  }
} 