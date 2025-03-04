import { NextRequest, NextResponse } from "next/server";
import { getOrganizationTypes, createOrganizationType } from "@/services/organization-types.service";
import { createClient } from "@/lib/utils/supabase/server";

/**
 * GET /api/organizations/types
 * Get all organization types
 */
export async function GET(request: NextRequest) {
  // Check authorization - only admins can access this
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { data, error } = await getOrganizationTypes();
  
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  
  return NextResponse.json({ data });
}

/**
 * POST /api/organizations/types
 * Create a new organization type
 */
export async function POST(request: NextRequest) {
  // Check authorization - only admins can create organization types
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
    
    // Validate request
    if (!body.code || !body.name) {
      return NextResponse.json(
        { error: "Code and name are required" },
        { status: 400 }
      );
    }
    
    const { data, error } = await createOrganizationType({
      code: body.code,
      name: body.name,
      description: body.description || null,
      metadata_schema: body.metadataSchema || {}
    });
    
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }
    
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Error creating organization type:", error);
    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    );
  }
} 