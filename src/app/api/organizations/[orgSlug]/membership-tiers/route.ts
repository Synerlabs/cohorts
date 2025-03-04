import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/services/product.service";
import { getOrgBySlug } from "@/services/org.service";
import { checkUserAccess } from "@/lib/utils/permissions";
import { permissions } from "@/lib/types/permissions";
import { createClient } from "@/lib/utils/supabase/server";

/**
 * GET /api/organizations/[orgSlug]/membership-tiers
 * Get membership tiers for an organization that are targeted for organizations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    // Get authenticated user from session
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the organization by slug
    const orgResult = await getOrgBySlug(params.orgSlug);
    if (!orgResult || !orgResult.data) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }
    const groupId = orgResult.data.id;

    // Check if user has permission
    const { hasAccess } = await checkUserAccess({
      userId: session.user.id,
      groupId: groupId,
      requiredPermissions: [permissions.memberships.edit]
    });
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to access this resource' },
        { status: 403 }
      );
    }

    // Get membership tiers
    const membershipTiers = await ProductService.getMembershipTiers(groupId);
    
    // Filter for organization tiers - use safe access
    const organizationTiers = membershipTiers.filter(tier => 
      // @ts-ignore - target_type is added in migration but not yet in types
      tier.target_type === 'ORGANIZATION'
    );

    return NextResponse.json({
      success: true,
      data: organizationTiers
    });
  } catch (error) {
    console.error('Error fetching organization membership tiers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization membership tiers' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    // Get authenticated user from session
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the organization by slug
    const orgResult = await getOrgBySlug(params.orgSlug);
    if (!orgResult || !orgResult.data) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }
    const groupId = orgResult.data.id;

    // Check if user has permission
    const { hasAccess } = await checkUserAccess({
      userId: session.user.id,
      groupId: groupId,
      requiredPermissions: [permissions.memberships.edit]
    });
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to access this resource' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      price,
      currency = 'USD',
      duration_months,
      activation_type = 'review_required',
      is_active = true
    } = body;

    // Create a new membership tier with target_type = 'ORGANIZATION'
    const newTier = await ProductService.createMembershipTier(groupId, {
      name,
      description,
      price,
      currency,
      duration_months,
      activation_type,
      member_id_format: 'ORG-{number}',
      target_type: 'ORGANIZATION'
    });

    return NextResponse.json({
      success: true,
      data: newTier
    });
  } catch (error) {
    console.error('Error creating organization membership tier:', error);
    return NextResponse.json(
      { error: 'Failed to create organization membership tier' },
      { status: 500 }
    );
  }
} 