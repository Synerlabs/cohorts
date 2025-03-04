import { NextRequest, NextResponse } from "next/server";
import { getRelationshipTypes } from "@/services/organization-relationships.service";
import { createClient } from "@/lib/utils/supabase/server";

/**
 * GET /api/organizations/relationship-types
 * Get all organization relationship types
 */
export async function GET(request: NextRequest) {
  // Check authorization - only authenticated users can access this
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { data, error } = await getRelationshipTypes();
  
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  
  return NextResponse.json({ data });
} 