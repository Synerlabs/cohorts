import { createClient } from '@/lib/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    console.log("Received membership application:", body);
    
    const { tierProductId, formSubmission } = body;
    
    if (!tierProductId) {
      return NextResponse.json({ 
        error: "Missing tier information", 
        code: "validation_error" 
      }, { status: 400 });
    }
    
    if (!formSubmission || !formSubmission._organizationInfo) {
      return NextResponse.json({ 
        error: "Missing organization information", 
        code: "validation_error" 
      }, { status: 400 });
    }
    
    const orgInfo = formSubmission._organizationInfo;
    
    // Create new organization if needed
    let organizationId = orgInfo.organizationId;
    
    if (orgInfo.createNew) {
      if (!orgInfo.name || orgInfo.name.trim() === '') {
        return NextResponse.json({ 
          error: "Organization name is required", 
          code: "validation_error" 
        }, { status: 400 });
      }
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("Error getting user:", userError);
        return NextResponse.json({ 
          error: "Unauthorized", 
          code: "forbidden" 
        }, { status: 403 });
      }
      
      // Create the organization
      const { data: newOrg, error: createError } = await supabase
        .from('groups')
        .insert({
          name: orgInfo.name.trim(),
          created_by: user.id,
          updated_by: user.id
        })
        .select('id')
        .single();
      
      if (createError) {
        console.error("Error creating organization:", createError);
        return NextResponse.json({ 
          error: "Failed to create organization", 
          code: "database_error" 
        }, { status: 500 });
      }
      
      organizationId = newOrg.id;
    } else {
      // Verify the organization exists
      const { data: existingOrg, error: orgError } = await supabase
        .from('groups')
        .select('id')
        .eq('id', organizationId)
        .single();
      
      if (orgError || !existingOrg) {
        console.error("Error finding organization:", orgError);
        return NextResponse.json({ 
          error: "Organization not found", 
          code: "not_found" 
        }, { status: 404 });
      }
    }
    
    // Extract parent group ID from formSubmission
    const parentGroupId = formSubmission.parentGroupId || null;
    
    if (!parentGroupId) {
      return NextResponse.json({ 
        error: "Missing parent group ID", 
        code: "validation_error" 
      }, { status: 400 });
    }
    
    // Check if relationship already exists
    const { data: existingRelationship, error: relationshipCheckError } = await supabase
      .from('group_organization')
      .select('*')
      .eq('parent_group_id', parentGroupId)
      .eq('child_group_id', organizationId);
    
    if (relationshipCheckError) {
      console.error("Error checking relationship:", relationshipCheckError);
      return NextResponse.json({ 
        error: "Failed to check existing relationship", 
        code: "database_error" 
      }, { status: 500 });
    }
    
    if (existingRelationship && existingRelationship.length > 0) {
      if (existingRelationship[0].is_active) {
        return NextResponse.json({ 
          error: "These organizations are already affiliated", 
          code: "duplicate" 
        }, { status: 400 });
      }
    }
    
    // Create the affiliation
    const { error: affiliationError } = await supabase
      .from('group_organization')
      .upsert({
        parent_group_id: parentGroupId,
        child_group_id: organizationId,
        tier_product_id: tierProductId,
        is_active: true,
        // Include any other required fields
      });
    
    if (affiliationError) {
      console.error("Error creating affiliation:", affiliationError);
      return NextResponse.json({ 
        error: "Failed to create affiliation", 
        code: "database_error" 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Affiliation created successfully",
      organizationId
    });
    
  } catch (error) {
    console.error("Server error in memberships/apply:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      code: "server_error" 
    }, { status: 500 });
  }
} 