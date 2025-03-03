import { createServiceRoleClient, createClient } from '@/lib/utils/supabase/server';
import { XenditProvider } from '@/providers/xendit.provider';
import { NextResponse } from 'next/server';
import { checkUserAccess } from '@/lib/utils/permissions';
import { permissions } from '@/lib/types/permissions';

export async function POST(req: Request) {
  try {
    const { orgId, testMode } = await req.json();

    if (!orgId) {
      return NextResponse.json(
        { message: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Check if user has permission to configure payment gateways
    const { hasAccess } = await checkUserAccess({
      userId: session.user.id,
      groupId: orgId,
      requiredPermissions: [permissions.paymentGateways.configure]
    });

    if (!hasAccess) {
      return NextResponse.json(
        { message: 'User does not have permission to configure payment gateways' },
        { status: 403 }
      );
    }

    // Create Xendit provider
    const xenditProvider = new XenditProvider();
    
    // For test mode, simulate a successful connection instead of redirecting to Xendit
    if (testMode) {
      const serviceRoleClient = await createServiceRoleClient();
      const testAccountId = `test_account_${Date.now()}`;
      
      // Create a test connected account in the database
      const { data: newAccount, error } = await serviceRoleClient
        .from('xendit_connected_accounts')
        .insert({
          org_id: orgId,
          account_id: testAccountId,
          is_active: true,
          charges_enabled: true,
          payouts_enabled: true,
          has_external_account: true,
          last_synced_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create test account: ${error.message}`);
      }
      
      // Update the payment gateway status to configured
      await serviceRoleClient
        .from('group_payment_gateways')
        .update({
          status: 'configured',
          enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('group_id', orgId)
        .eq('gateway_id', 'xendit');
      
      // Return a direct success response instead of a URL
      return NextResponse.json({
        success: true,
        message: 'Test account connected successfully',
        accountId: testAccountId
      });
    }
    
    // Normal flow for production - create a URL for onboarding
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const redirectUrl = `${baseUrl}/api/payments/xendit/connect/callback?org_id=${orgId}`;
    
    const result = await xenditProvider.createAccountOnboardingLink(
      redirectUrl,
      { orgId }
    );
    
    // Return the connection URL
    return NextResponse.json({
      url: result.url
    });
  } catch (error: any) {
    console.error('Error creating Xendit connection:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create Xendit connection' },
      { status: 500 }
    );
  }
}

// Handle the callback from Xendit after account connection
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get('org_id');
  const accountId = url.searchParams.get('account_id');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  
  if (!orgId || !accountId) {
    // Redirect to settings with error
    return NextResponse.redirect(`${baseUrl}/${orgId}/settings/payments?error=missing_params`);
  }
  
  try {
    // Store the connected account details in the database
    const supabase = await createServiceRoleClient();
    
    // Verify the account and org exist
    const { data: organization, error: orgError } = await supabase
      .from('group')
      .select('id')
      .eq('id', orgId)
      .single();
      
    if (orgError || !organization) {
      return NextResponse.redirect(`${baseUrl}/dashboard?error=invalid_organization`);
    }
    
    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from('xendit_connected_accounts')
      .select('*')
      .eq('org_id', orgId)
      .eq('account_id', accountId)
      .single();
    
    if (existingAccount) {
      // Update the existing account
      await supabase
        .from('xendit_connected_accounts')
        .update({
          is_active: true,
          last_synced_at: new Date().toISOString()
        })
        .eq('id', existingAccount.id);
    } else {
      // Create a new account record
      await supabase
        .from('xendit_connected_accounts')
        .insert({
          org_id: orgId,
          account_id: accountId,
          is_active: true,
          last_synced_at: new Date().toISOString()
        });
    }
    
    // Update the payment gateway status to configured
    await supabase
      .from('group_payment_gateways')
      .update({
        status: 'configured',
        updated_at: new Date().toISOString()
      })
      .eq('group_id', orgId)
      .eq('gateway_id', 'xendit');
    
    // Redirect to the settings page with success
    return NextResponse.redirect(`${baseUrl}/${orgId}/settings/payments?success=connected`);
  } catch (error) {
    console.error('Error handling Xendit callback:', error);
    // Redirect to settings with error
    return NextResponse.redirect(`${baseUrl}/${orgId}/settings/payments?error=callback_failed`);
  }
} 