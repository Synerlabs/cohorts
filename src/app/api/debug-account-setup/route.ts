import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, firstName, lastName } = body;
    
    if (!userId || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, firstName, lastName' },
        { status: 400 }
      );
    }
    
    console.log('Debug API: Testing profile update for user', userId);
    
    // Service role client for admin operations
    const adminSupabase = await createServiceRoleClient();
    
    // Get user data to confirm they exist
    const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(userId);
    
    if (userError) {
      console.error('Debug API: Error fetching user', userError);
      return NextResponse.json(
        { error: `User fetch error: ${userError.message}`, code: userError.code },
        { status: 500 }
      );
    }
    
    if (!userData || !userData.user) {
      return NextResponse.json(
        { error: 'User not found with ID: ' + userId },
        { status: 404 }
      );
    }
    
    console.log('Debug API: User found:', userData.user.email);
    
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    const profileExists = !fetchError || fetchError.code !== 'PGRST116';
    console.log('Debug API: Profile exists?', profileExists);
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Debug API: Error checking profile', fetchError);
    }
    
    // Create profile data
    const profileData: {
      id: any;
      first_name: any;
      last_name: any;
      updated_at: string;
    } = {
      id: userId,
      first_name: firstName,
      last_name: lastName,
      updated_at: new Date().toISOString(),
    };
    
    // Log table structure before insert (useful for debugging schema issues)
    const { data: tableInfo, error: tableError } = await adminSupabase
      .rpc('get_table_info', { table_name: 'profiles' });
      
    if (tableError) {
      console.error('Debug API: Error getting table info', tableError);
    } else {
      console.log('Debug API: profiles table structure:', tableInfo);
    }
    
    // Attempt profile update
    console.log('Debug API: Attempting profile update with data:', profileData);
    
    const { data: updateData, error: profileError } = await adminSupabase
      .from('profiles')
      .upsert(profileData)
      .select();
    
    if (profileError) {
      console.error('Debug API: Profile update error', {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        full: JSON.stringify(profileError)
      });
      
      return NextResponse.json(
        { 
          error: `Profile update failed: ${profileError.message}`,
          details: {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint
          }
        },
        { status: 500 }
      );
    }
    
    console.log('Debug API: Profile update successful', updateData);
    
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: updateData,
      user: {
        id: userData.user.id,
        email: userData.user.email
      }
    });
    
  } catch (error: any) {
    console.error('Debug API: Unexpected error', error);
    
    return NextResponse.json(
      { 
        error: 'Unexpected error: ' + (error.message || 'Unknown error'),
        stack: error.stack
      },
      { status: 500 }
    );
  }
} 