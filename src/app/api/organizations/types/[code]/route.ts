import { NextRequest, NextResponse } from "next/server";
import { getOrganizationTypeByCode, updateOrganizationType, deleteOrganizationType } from "@/services/organization-types.service";
import { createClient } from "@/lib/utils/supabase/server";

/**
 * GET /api/organizations/types/:code
 * Get a specific organization type by code
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  // Check authorization - only admins can access this
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { data, error } = await getOrganizationTypeByCode(params.code);
  
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  
  if (!data) {
    return NextResponse.json(
      { error: "Organization type not found" },
      { status: 404 }
    );
  }
  
  return NextResponse.json({ data });
}

/**
 * PUT /api/organizations/types/:code
 * Update a specific organization type
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  // Check authorization - only admins can update organization types
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Check if user is a system admin
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("group_role_id, group_roles(role_name, is_super_admin, group_id)")
    .eq("user_id", user.id)
    .eq("is_active", true);
    
  const isSystemAdmin = userRoles?.some(
    (role) => role.group_roles && 
    (role.group_roles as any).is_super_admin && 
    (role.group_roles as any).group_id === null
  );
  
  if (!isSystemAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  try {
    const body = await request.json();
    
    // Build update object
    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.metadataSchema !== undefined) updates.metadata_schema = body.metadataSchema;
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }
    
    const { data, error } = await updateOrganizationType(params.code, updates);
    
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json(
        { error: "Organization type not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error updating organization type:", error);
    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/organizations/types/:code
 * Delete a specific organization type
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  // Check authorization - only admins can delete organization types
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Check if user is a system admin
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("group_role_id, group_roles(role_name, is_super_admin, group_id)")
    .eq("user_id", user.id)
    .eq("is_active", true);
    
  const isSystemAdmin = userRoles?.some(
    (role) => role.group_roles && 
    (role.group_roles as any).is_super_admin && 
    (role.group_roles as any).group_id === null
  );
  
  if (!isSystemAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  const { success, error } = await deleteOrganizationType(params.code);
  
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  
  return NextResponse.json({ success });
} 