import { createClient, createServiceRoleClient } from "@/lib/utils/supabase/server";
import { z } from "zod";
import { 
  OrganizationRelationshipTypePreset, 
  OrganizationTier, 
  OrganizationApplication, 
  OrganizationAffiliation, 
  OrganizationRelationship, 
  OrganizationHierarchyConstraint 
} from "@/lib/types/organization";
import { Currency, MembershipActivationType } from "@/lib/types/membership";
import { TierService } from "@/lib/types/tier";
import { ProductService } from './product.service';

const organizationTierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const),
  duration_months: z.number().min(1, "Duration must be at least 1 month"),
  host_group_id: z.string(),
  relationship_type: z.string(),
  activation_type: z.enum([
    'automatic',
    'review_required',
    'payment_required',
    'review_then_payment',
    'form_required',
    'form_then_payment',
    'form_then_review',
    'form_then_payment_then_review',
    'form_then_review_then_payment'
  ]).default('automatic'),
  form_template_id: z.string().optional().nullable(),
  hierarchy_constraints: z.array(
    z.object({
      parent_relationship_type: z.string().nullable(),
      allowed_child_types: z.array(z.string()).nullable(),
      max_depth: z.number().min(1).nullable(),
      required_parent_types: z.array(z.string()).nullable()
    })
  ).optional().nullable()
});

// Static version of the service for easy access without instantiation
export class OrganizationAffiliationServiceStatic {
  /**
   * Get all organization tiers for a host organization
   */
  static async getTiers({ hostGroupId }: { hostGroupId: string }): Promise<OrganizationTier[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('organization_tiers')
      .select(`
        *,
        product:product_id(*)
      `)
      .eq('host_group_id', hostGroupId);
      
    if (error) {
      console.error('Error fetching organization tiers:', error);
      throw error;
    }

    if (!data) return [];

    // Transform the data to match the expected OrganizationTier type
    return data.map(tierConfig => {
      const product = tierConfig.product;
      
      return {
        ...product,
        config: {
          id: tierConfig.id,
          product_id: tierConfig.product_id,
          host_group_id: tierConfig.host_group_id,
          relationship_type: tierConfig.relationship_type,
          hierarchy_constraints: tierConfig.hierarchy_constraints,
          created_at: tierConfig.created_at
        },
        organization_count: 0 // Placeholder until we implement the actual count
      };
    });
  }

  /**
   * Create a new organization tier
   */
  static async createTier(data: z.infer<typeof organizationTierSchema>): Promise<OrganizationTier> {
    const supabase = await createClient();
    
    // First, create a new product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: data.name,
        description: data.description,
        price: data.price,
        currency: data.currency,
      })
      .select()
      .single();
    
    if (productError) {
      console.error('Error creating product:', productError);
      throw productError;
    }
    
    // Then create the organization tier with reference to the product
    const { data: tierConfig, error: tierError } = await supabase
      .from('organization_tiers')
      .insert({
        product_id: product.id,
        host_group_id: data.host_group_id,
        relationship_type: data.relationship_type,
        activation_type: data.activation_type,
        duration_months: data.duration_months,
        hierarchy_constraints: data.hierarchy_constraints,
        form_template_id: data.form_template_id
      })
      .select()
      .single();
      
    if (tierError) {
      console.error('Error creating organization tier:', tierError);
      throw tierError;
    }
    
    return {
      ...product,
      config: {
        id: tierConfig.id,
        product_id: product.id,
        host_group_id: data.host_group_id,
        relationship_type: data.relationship_type,
        hierarchy_constraints: data.hierarchy_constraints,
        created_at: tierConfig.created_at
      },
      organization_count: 0 // New tiers have no organizations yet
    };
  }

  /**
   * Create an application for organization affiliation
   */
  static async createApplication(data: {
    groupId: string;
    hostGroupId: string;
    productId: string;
    formSubmissionId?: string;
  }): Promise<OrganizationApplication> {
    const supabase = await createClient();
    
    const { data: application, error } = await supabase
      .from('organization_applications')
      .insert({
        group_id: data.groupId,
        host_group_id: data.hostGroupId,
        product_id: data.productId,
        status: 'pending',
        form_submission_id: data.formSubmissionId
      })
      .select('*')
      .single();
      
    if (error) throw error;
    
    return application as OrganizationApplication;
  }

  /**
   * Process an organization application to approve, reject, or request payment
   */
  static async processApplication(
    applicationId: string,
    action: 'approve' | 'reject'
  ): Promise<OrganizationApplication> {
    const supabase = await createClient();
    
    const now = new Date().toISOString();
    const updates = action === 'approve' 
      ? { status: 'approved', approved_at: now } 
      : { status: 'rejected', rejected_at: now };
      
    const { data: application, error } = await supabase
      .from('organization_applications')
      .update(updates)
      .eq('id', applicationId)
      .select('*')
      .single();
      
    if (error) throw error;
    
    // If approved, create the affiliation
    if (action === 'approve') {
      await OrganizationAffiliationServiceStatic.createAffiliation({
        groupId: application.group_id,
        hostGroupId: application.host_group_id,
        productId: application.product_id,
        applicationId
      });
    }
    
    return application as OrganizationApplication;
  }

  /**
   * Create an organization affiliation
   */
  static async createAffiliation(data: {
    groupId: string;
    hostGroupId: string;
    productId: string;
    applicationId?: string;
    startDate?: string;
    durationMonths?: number;
  }): Promise<OrganizationAffiliation> {
    const supabase = await createClient();
    
    // Calculate end date if duration is provided
    let endDate = null;
    if (data.startDate && data.durationMonths) {
      const startDate = new Date(data.startDate);
      startDate.setMonth(startDate.getMonth() + data.durationMonths);
      endDate = startDate.toISOString();
    }
    
    const { data: affiliation, error } = await supabase
      .from('organization_affiliations')
      .insert({
        group_id: data.groupId,
        host_group_id: data.hostGroupId,
        product_id: data.productId,
        start_date: data.startDate || new Date().toISOString(),
        end_date: endDate,
        status: 'active'
      })
      .select('*')
      .single();
      
    if (error) throw error;
    
    // Get product config to create the relationship
    const { data: config } = await supabase
      .from('organization_tier_configs')
      .select('*')
      .eq('product_id', data.productId)
      .eq('host_group_id', data.hostGroupId)
      .single();
      
    if (config) {
      // Create the relationship
      await OrganizationAffiliationServiceStatic.createOrganizationRelationship({
        parentGroupId: data.hostGroupId,
        childGroupId: data.groupId,
        relationshipType: config.relationship_type
      });
    }
    
    return affiliation as OrganizationAffiliation;
  }

  /**
   * Create an organization relationship
   */
  static async createOrganizationRelationship(data: {
    parentGroupId: string;
    childGroupId: string;
    relationshipType: string;
  }): Promise<OrganizationRelationship> {
    const supabase = await createClient();
    
    // Validate that we're not creating a circular relationship
    await OrganizationAffiliationServiceStatic.validateNoCircularRelationship({
      parentGroupId: data.parentGroupId,
      childGroupId: data.childGroupId
    });
    
    const { data: relationship, error } = await supabase
      .from('organization_relationships')
      .insert({
        parent_group_id: data.parentGroupId,
        child_group_id: data.childGroupId,
        relationship_type: data.relationshipType
      })
      .select('*')
      .single();
      
    if (error) throw error;
    
    return relationship as OrganizationRelationship;
  }

  static async validateNoCircularRelationship(data: {
    parentGroupId: string;
    childGroupId: string;
  }): Promise<boolean> {
    // If the child is already a parent (directly or indirectly) of the proposed parent,
    // this would create a circular relationship
    const supabase = await createClient();
    
    // Get all ancestors of the proposed parent
    const { data: ancestors } = await supabase.rpc('get_all_organization_ancestors', {
      org_id: data.parentGroupId
    });
    
    // Check if the child is among the ancestors
    if (ancestors && ancestors.some((ancestor: { id: string }) => ancestor.id === data.childGroupId)) {
      throw new Error('Circular relationship detected: an organization cannot be both an ancestor and descendant');
    }
    
    return true;
  }

  /**
   * Validate hierarchy constraints
   */
  static async validateOrganizationHierarchy(data: {
    parentGroupId: string;
    childGroupId: string;
    productId: string;
  }): Promise<{ valid: boolean; errors: string[] }> {
    const supabase = await createClient();
    const errors: string[] = [];
    
    // Get the relationship type from the product
    const { data: config } = await supabase
      .from('organization_tier_configs')
      .select('*')
      .eq('product_id', data.productId)
      .single();
      
    if (!config) {
      errors.push('Product configuration not found');
      return { valid: false, errors };
    }
    
    // Get hierarchy constraints
    const hierarchyConstraints = config.hierarchy_constraints as OrganizationHierarchyConstraint[];
    
    if (!hierarchyConstraints || hierarchyConstraints.length === 0) {
      return { valid: true, errors: [] }; // No constraints to check
    }
    
    // Get parent relationship
    const { data: parentRelationships } = await supabase
      .from('organization_relationships')
      .select('relationship_type')
      .eq('child_group_id', data.parentGroupId);
      
    // Check constraints
    for (const constraint of hierarchyConstraints) {
      // Check parent type constraints
      if (constraint.parent_relationship_type !== null) {
        const parentHasRequiredType = parentRelationships?.some(
          rel => rel.relationship_type === constraint.parent_relationship_type
        );
        
        if (!parentHasRequiredType) {
          errors.push(`Parent organization must have relationship type: ${constraint.parent_relationship_type}`);
        }
      }
      
      // Check allowed child types
      if (constraint.allowed_child_types !== null) {
        if (!constraint.allowed_child_types.includes(config.relationship_type)) {
          errors.push(`Relationship type ${config.relationship_type} is not allowed as a child of this organization`);
        }
      }
      
      // Check max depth
      if (constraint.max_depth !== null) {
        // Get the depth of the parent in the hierarchy
        const { data: parentDepth } = await supabase.rpc('get_organization_depth', {
          org_id: data.parentGroupId
        });
        
        if (parentDepth !== null && parentDepth >= constraint.max_depth) {
          errors.push(`Maximum hierarchy depth (${constraint.max_depth}) would be exceeded`);
        }
      }
      
      // Check required parent types
      if (constraint.required_parent_types !== null) {
        // Check if the child has any of the required parent types in its ancestry
        const { data: childAncestors } = await supabase
          .from('organization_relationships')
          .select('parent_group_id, relationship_type')
          .eq('child_group_id', data.childGroupId);
          
        const hasRequiredParentType = childAncestors?.some(
          rel => constraint.required_parent_types?.includes(rel.relationship_type)
        );
        
        if (!hasRequiredParentType) {
          errors.push(`Organization must be under one of these relationship types: ${constraint.required_parent_types.join(', ')}`);
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
}

// Instance class that implements TierService interface
export class OrganizationAffiliationService implements TierService<OrganizationTier, OrganizationApplication, OrganizationAffiliation> {
  /**
   * Get all organization tiers for a host organization
   */
  async getTiers({ hostGroupId }: { hostGroupId: string }): Promise<OrganizationTier[]> {
    return OrganizationAffiliationServiceStatic.getTiers({ hostGroupId });
  }

  /**
   * Create a new organization tier
   */
  async createTier(data: z.infer<typeof organizationTierSchema>): Promise<OrganizationTier> {
    return OrganizationAffiliationServiceStatic.createTier(data);
  }

  /**
   * Create an application for organization affiliation
   */
  async createApplication({
    groupId,
    hostGroupId,
    productId,
    formSubmissionId
  }: {
    groupId: string;
    hostGroupId: string;
    productId: string;
    formSubmissionId?: string;
  }): Promise<OrganizationApplication> {
    return OrganizationAffiliationServiceStatic.createApplication({
      groupId,
      hostGroupId,
      productId,
      formSubmissionId
    });
  }

  /**
   * Process an organization application to approve, reject, or request payment
   */
  async processApplication(
    applicationId: string,
    action: 'approve' | 'reject'
  ): Promise<OrganizationApplication> {
    return OrganizationAffiliationServiceStatic.processApplication(applicationId, action);
  }

  /**
   * Create an organization affiliation
   */
  async createAffiliation({
    groupId,
    hostGroupId,
    productId,
    applicationId,
    startDate = new Date().toISOString(),
    durationMonths = 12 // Default to 12 months if not provided
  }: {
    groupId: string;
    hostGroupId: string;
    productId: string;
    applicationId?: string;
    startDate?: string;
    durationMonths?: number;
  }): Promise<OrganizationAffiliation> {
    return OrganizationAffiliationServiceStatic.createAffiliation({
      groupId,
      hostGroupId,
      productId,
      applicationId,
      startDate,
      durationMonths
    });
  }

  /**
   * Create an organization relationship
   */
  async createOrganizationRelationship({
    parentGroupId,
    childGroupId,
    relationshipType
  }: {
    parentGroupId: string;
    childGroupId: string;
    relationshipType: string;
  }): Promise<OrganizationRelationship> {
    return OrganizationAffiliationServiceStatic.createOrganizationRelationship({
      parentGroupId,
      childGroupId,
      relationshipType
    });
  }

  /**
   * Get all organization affiliations for a host organization
   */
  async getHostOrganizationAffiliations({ hostGroupId }: { hostGroupId: string }): Promise<OrganizationAffiliation[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('organization_affiliations')
      .select(`
        *,
        product:product_id(*),
        affiliate:group_id(id, name, slug)
      `)
      .eq('host_group_id', hostGroupId);
      
    if (error) throw error;
    
    return data as unknown as OrganizationAffiliation[];
  }

  /**
   * Get all organization affiliations for an affiliate organization
   */
  async getAffiliateOrganizationAffiliations({ groupId }: { groupId: string }): Promise<OrganizationAffiliation[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('organization_affiliations')
      .select(`
        *,
        product:product_id(*),
        host:host_group_id(id, name, slug)
      `)
      .eq('group_id', groupId);
      
    if (error) throw error;
    
    return data as unknown as OrganizationAffiliation[];
  }

  /**
   * Get all parent organizations for a given organization
   */
  async getParentOrganizations({ groupId }: { groupId: string }): Promise<OrganizationRelationship[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('organization_relationships')
      .select(`
        *,
        parent:parent_group_id(id, name, slug)
      `)
      .eq('child_group_id', groupId);
      
    if (error) throw error;
    
    return data as unknown as OrganizationRelationship[];
  }

  /**
   * Get all child organizations for a given organization
   */
  async getChildOrganizations({ 
    groupId, 
    relationshipType 
  }: { 
    groupId: string; 
    relationshipType?: string 
  }): Promise<OrganizationRelationship[]> {
    const supabase = await createClient();
    
    let query = supabase
      .from('organization_relationships')
      .select(`
        *,
        child:child_group_id(id, name, slug)
      `)
      .eq('parent_group_id', groupId);
      
    if (relationshipType) {
      query = query.eq('relationship_type', relationshipType);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data as unknown as OrganizationRelationship[];
  }

  /**
   * Validate if an organization can be a child of another based on hierarchy constraints
   */
  async validateOrganizationHierarchy({
    parentGroupId,
    childGroupId,
    productId
  }: {
    parentGroupId: string;
    childGroupId: string;
    productId: string;
  }): Promise<{ valid: boolean; errors: string[] }> {
    return OrganizationAffiliationServiceStatic.validateOrganizationHierarchy({
      parentGroupId,
      childGroupId,
      productId
    });
  }
} 