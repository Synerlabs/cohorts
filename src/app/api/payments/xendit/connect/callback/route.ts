import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import { XenditProvider } from '@/providers/xendit.provider';

/**
 * Callback handler for Xendit account onboarding process
 * This endpoint is called by Xendit after a business completes the onboarding flow
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get('org_id');
  const accountId = url.searchParams.get('account_id');
  const statusCode = url.searchParams.get('status_code');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  
  if (!orgId || !accountId) {
    console.error('❌ Missing required parameters in Xendit callback:', { orgId, accountId });
    return NextResponse.redirect(`${baseUrl}/dashboard?error=missing_params`);
  }
  
  try {
    // Store the connected account details in the database
    const supabase = await createServiceRoleClient();
    
    // Verify the organization exists
    const { data: organization, error: orgError } = await supabase
      .from('group')
      .select('id')
      .eq('id', orgId)
      .single();
      
    if (orgError || !organization) {
      console.error('❌ Invalid organization in Xendit callback:', { orgId, error: orgError });
      return NextResponse.redirect(`${baseUrl}/dashboard?error=invalid_organization`);
    }
    
    // Retrieve the account details from Xendit
    const xenditProvider = new XenditProvider();
    try {
      const accountDetails = await xenditProvider.getConnectedAccount(accountId);
      
      // Check if account already exists
      const { data: existingAccount } = await supabase
        .from('xendit_connected_accounts')
        .select('*')
        .eq('org_id', orgId)
        .eq('account_id', accountId)
        .single();
      
      const accountStatus = {
        is_active: statusCode === '200' && accountDetails.status === 'ACTIVE',
        charges_enabled: statusCode === '200' && accountDetails.status === 'ACTIVE',
        payouts_enabled: statusCode === '200' && accountDetails.status === 'ACTIVE',
        has_external_account: true,
        verification_status: {},
        capabilities_status: accountDetails.capabilities || {},
        disabled_reason: statusCode !== '200' ? 'Account setup incomplete' : null,
        last_synced_at: new Date().toISOString()
      };
      
      if (existingAccount) {
        // Update the existing account
        await supabase
          .from('xendit_connected_accounts')
          .update(accountStatus)
          .eq('id', existingAccount.id);
          
        console.log('✅ Updated existing Xendit connected account:', accountId);
      } else {
        // Create a new account record
        await supabase
          .from('xendit_connected_accounts')
          .insert({
            org_id: orgId,
            account_id: accountId,
            ...accountStatus
          });
          
        console.log('✅ Created new Xendit connected account:', accountId);
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
      
      console.log('✅ Updated payment gateway status for Xendit');
      
      // Redirect to the settings page with success
      return NextResponse.redirect(`${baseUrl}/${orgId}/settings/payments?success=connected`);
    } catch (xenditError) {
      console.error('❌ Error retrieving Xendit account details:', xenditError);
      return NextResponse.redirect(`${baseUrl}/${orgId}/settings/payments?error=account_retrieval_failed`);
    }
  } catch (error) {
    console.error('❌ Error handling Xendit callback:', error);
    // Redirect to settings with error
    return NextResponse.redirect(`${baseUrl}/${orgId}/settings/payments?error=callback_failed`);
  }
} 